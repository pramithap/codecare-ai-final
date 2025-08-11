import type { 
  GitHubTree, 
  GitHubBlob, 
  GitHubBranch, 
  GitHubComparison,
  GitHubTreeItem,
  MANIFEST_PATTERNS 
} from '../../types/scanNew';

const GITHUB_API_BASE = 'https://api.github.com';

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

export class GitHubAPI {
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  private async makeRequest<T>(url: string): Promise<T> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'codecare-ai/1.0'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Provide more helpful error messages for common authentication issues
      if (response.status === 401) {
        const message = this.token 
          ? 'GitHub token is invalid or expired. Please check your authentication.'
          : 'GitHub authentication required. This repository may be private or rate limits exceeded.';
        throw new GitHubAPIError(message, response.status, errorData);
      }
      
      if (response.status === 403 && errorData.message?.includes('rate limit')) {
        const message = this.token
          ? 'GitHub API rate limit exceeded. Please try again later.'
          : 'GitHub API rate limit exceeded. Authentication is required for higher limits.';
        throw new GitHubAPIError(message, response.status, errorData);
      }
      
      throw new GitHubAPIError(
        errorData.message || `GitHub API error: ${response.status}`,
        response.status,
        errorData
      );
    }

    return response.json();
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

  async compareCommits(owner: string, repo: string, base: string, head: string): Promise<GitHubComparison> {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/compare/${base}...${head}`;
    return this.makeRequest<GitHubComparison>(url);
  }

  // Utility methods
  static parseRepoUrl(url: string): { owner: string; repo: string } | null {
    const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
    if (!match) return null;
    
    return {
      owner: match[1],
      repo: match[2]
    };
  }

  static isManifestFile(path: string): boolean {
    const patterns = [
      /\/package\.json$/,
      /\/pom\.xml$/,
      /\/build\.gradle(\.kts)?$/,
      /\/build\.xml$/,
      /\/cpanfile$/,
      /\/Makefile\.PL$/,
      /\/Dockerfile$/,
      /\/\.nvmrc$/,
      /\/\.node-version$/,
      /\/\.java-version$/,
    ];

    return patterns.some(pattern => pattern.test(path)) || 
           ['package.json', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'build.xml', 
            'cpanfile', 'Makefile.PL', 'Dockerfile', '.nvmrc', '.node-version', '.java-version']
           .some(name => path === name);
  }

  static filterManifestFiles(treeItems: GitHubTreeItem[]): GitHubTreeItem[] {
    return treeItems.filter(item => 
      item.type === 'blob' && 
      GitHubAPI.isManifestFile(item.path) &&
      (item.size || 0) < 10 * 1024 * 1024 // Skip files > 10MB
    );
  }

  async fetchBlobsWithConcurrency(
    owner: string, 
    repo: string, 
    blobs: GitHubTreeItem[], 
    concurrency = 6,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Array<{ path: string; content: string; error?: string }>> {
    const results: Array<{ path: string; content: string; error?: string }> = [];
    let completed = 0;

    // Process blobs in batches with concurrency limit
    for (let i = 0; i < blobs.length; i += concurrency) {
      const batch = blobs.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (blob) => {
        try {
          const blobData = await this.getBlob(owner, repo, blob.sha);
          const content = Buffer.from(blobData.content, 'base64').toString('utf8');
          return { path: blob.path, content };
        } catch (error) {
          return { 
            path: blob.path, 
            content: '', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        } finally {
          completed++;
          onProgress?.(completed, blobs.length);
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  async getRateLimitInfo() {
    try {
      const url = `${GITHUB_API_BASE}/rate_limit`;
      const response = await this.makeRequest<{
        rate: {
          limit: number;
          remaining: number;
          reset: number;
          used: number;
        };
      }>(url);
      return response.rate;
    } catch (error) {
      return null;
    }
  }
}
