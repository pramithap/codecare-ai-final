import type { 
  GitHubTree, 
  GitHubBlob, 
  GitHubBranch, 
  GitHubComparison,
  GitHubTreeItem,
  MANIFEST_PATTERNS 
} from '../../types/scanNew';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

export class GitHubAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'GitHubAPIError';
  }
}

export class GitHubPublicAPI {
  private accessToken?: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest<T>(url: string): Promise<T> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'codecare-ai/1.0'
    };

    // Add Authorization header if token is available
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 404) {
        throw new GitHubAPIError(
          'Repository not found or is private. Only public repositories are supported.',
          response.status,
          errorData
        );
      }
      
      if (response.status === 403 && errorData.message?.includes('rate limit')) {
        throw new GitHubAPIError(
          'GitHub API rate limit exceeded for unauthenticated requests. Please try again later.',
          response.status,
          errorData
        );
      }
      
      throw new GitHubAPIError(
        errorData.message || `GitHub API error: ${response.status}`,
        response.status,
        errorData
      );
    }

    return response.json();
  }

  private async fetchRawFile(owner: string, repo: string, branch: string, path: string): Promise<string> {
    const url = `${GITHUB_RAW_BASE}/${owner}/${repo}/${branch}/${path}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${path} (${response.status})`);
    }
    
    return response.text();
  }

  async getBranch(owner: string, repo: string, branch: string): Promise<GitHubBranch> {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/branches/${branch}`;
    return this.makeRequest<GitHubBranch>(url);
  }

  async getTree(owner: string, repo: string, sha: string, recursive = true): Promise<GitHubTree> {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${sha}${recursive ? '?recursive=1' : ''}`;
    return this.makeRequest<GitHubTree>(url);
  }

  async getBlob(owner: string, repo: string, sha: string): Promise<GitHubBlob> {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/blobs/${sha}`;
    return this.makeRequest<GitHubBlob>(url);
  }

  // New method: Get file content directly without blob API
  async getFileContent(owner: string, repo: string, branch: string, path: string): Promise<string> {
    return this.fetchRawFile(owner, repo, branch, path);
  }

  async compareCommits(owner: string, repo: string, base: string, head: string): Promise<GitHubComparison> {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/compare/${base}...${head}`;
    return this.makeRequest<GitHubComparison>(url);
  }

  async getMultipleBlobs(
    owner: string,
    repo: string,
    blobs: { sha: string; path: string }[],
    defaultBranch: string = 'main',
    onProgress?: (completed: number, total: number) => void
  ): Promise<Array<{ sha: string; path: string; content: string; encoding?: string }>> {
    const results: Array<{ sha: string; path: string; content: string; encoding?: string }> = [];
    
    for (let i = 0; i < blobs.length; i++) {
      const blob = blobs[i];
      try {
        // Try to get content directly via raw URL first (faster and no rate limit for small files)
        const content = await this.fetchRawFile(owner, repo, defaultBranch, blob.path);
        results.push({
          sha: blob.sha,
          path: blob.path,
          content,
          encoding: 'utf-8'
        });
      } catch (error) {
        // Fallback to blob API if raw fetch fails
        try {
          const blobData = await this.getBlob(owner, repo, blob.sha);
          let content = blobData.content;
          
          // Decode base64 content if needed
          if (blobData.encoding === 'base64') {
            content = Buffer.from(content, 'base64').toString('utf-8');
          }
          
          results.push({
            sha: blob.sha,
            path: blob.path,
            content,
            encoding: 'utf-8'
          });
        } catch (blobError) {
          console.warn(`Failed to fetch blob ${blob.path}:`, blobError);
          // Continue with other files
        }
      }
      
      onProgress?.(i + 1, blobs.length);
    }
    
    return results;
  }

  findManifestFiles(tree: GitHubTree): GitHubTreeItem[] {
    const manifestPatterns: string[] = [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pom.xml',
      'build.gradle',
      'gradle.properties',
      'build.xml',
      'cpanfile',
      'requirements.txt',
      'Pipfile',
      'poetry.lock',
      'composer.json',
      'Dockerfile',
      '.nvmrc'
    ];

    return tree.tree.filter(item => {
      if (item.type !== 'blob') return false;
      
      const fileName = item.path?.split('/').pop() || '';
      return manifestPatterns.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(fileName);
        }
        return fileName === pattern;
      });
    });
  }

  isManifestFile(filename: string): boolean {
    const manifestPatterns: string[] = [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pom.xml',
      'build.gradle',
      'gradle.properties',
      'build.xml',
      'cpanfile',
      'requirements.txt',
      'Pipfile',
      'poetry.lock',
      'composer.json',
      'Dockerfile',
      '.nvmrc'
    ];

    const fileName = filename.split('/').pop() || '';
    return manifestPatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(fileName);
      }
      return fileName === pattern;
    });
  }

  static parseRepoUrl(url: string): { owner: string; repo: string } | null {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git|\/|$)/);
    if (!match) return null;
    
    return {
      owner: match[1],
      repo: match[2]
    };
  }
}
