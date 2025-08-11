// Generic Git Provider API interface
export interface GitProviderAPI {
  validateToken(token: string, username?: string): Promise<{ valid: boolean; user?: any; error?: string }>;
  getRepositories(token: string, options?: { query?: string; page?: number; per_page?: number; username?: string }): Promise<any>;
  getRepository(owner: string, repo: string, token: string, username?: string): Promise<any>;
  getBranches(owner: string, repo: string, token: string, username?: string): Promise<any>;
  getBranch(owner: string, repo: string, branch: string, token: string, username?: string): Promise<any>;
  getTree(owner: string, repo: string, sha: string, recursive: boolean, token: string, username?: string): Promise<any>;
  getBlob(owner: string, repo: string, sha: string, token: string, username?: string): Promise<any>;
}

// GitHub API implementation
export class GitHubProviderAPI implements GitProviderAPI {
  private baseUrl = 'https://api.github.com';

  async validateToken(token: string): Promise<{ valid: boolean; user?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (response.ok) {
        const user = await response.json();
        return { valid: true, user };
      } else {
        return { valid: false, error: 'Invalid token' };
      }
    } catch (error) {
      return { valid: false, error: 'Network error' };
    }
  }

  async getRepositories(token: string, options?: { query?: string; page?: number; per_page?: number; username?: string }): Promise<any> {
    const { query, page = 1, per_page = 30, username } = options || {};
    let url = `${this.baseUrl}/user/repos?page=${page}&per_page=${per_page}&sort=updated&direction=desc`;
    
    if (username) {
      url = `${this.baseUrl}/users/${username}/repos?page=${page}&per_page=${per_page}&sort=updated&direction=desc`;
    }
    
    if (query) {
      url = `${this.baseUrl}/search/repositories?q=${encodeURIComponent(query)}&page=${page}&per_page=${per_page}&sort=updated&order=desc`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return response.json();
  }

  async getRepository(owner: string, repo: string, token: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return response.json();
  }

  async getBranches(owner: string, repo: string, token: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/branches`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return response.json();
  }

  async getBranch(owner: string, repo: string, branch: string, token: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/branches/${branch}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return response.json();
  }

  async getTree(owner: string, repo: string, sha: string, recursive: boolean, token: string): Promise<any> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/git/trees/${sha}${recursive ? '?recursive=1' : ''}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return response.json();
  }

  async getBlob(owner: string, repo: string, sha: string, token: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/git/blobs/${sha}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return response.json();
  }
}

// GitLab API implementation
export class GitLabProviderAPI implements GitProviderAPI {
  private baseUrl = 'https://gitlab.com/api/v4';

  async validateToken(token: string): Promise<{ valid: boolean; user?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        return { valid: true, user };
      } else {
        return { valid: false, error: 'Invalid token' };
      }
    } catch (error) {
      return { valid: false, error: 'Network error' };
    }
  }

  async getRepositories(token: string, options?: { query?: string; page?: number; per_page?: number; username?: string }): Promise<any> {
    const { query, page = 1, per_page = 30, username } = options || {};
    let url = `${this.baseUrl}/projects?owned=true&page=${page}&per_page=${per_page}&order_by=updated_at&sort=desc`;
    
    if (username) {
      url = `${this.baseUrl}/users/${username}/projects?page=${page}&per_page=${per_page}&order_by=updated_at&sort=desc`;
    }
    
    if (query) {
      url = `${this.baseUrl}/projects?search=${encodeURIComponent(query)}&page=${page}&per_page=${per_page}&order_by=updated_at&sort=desc`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status}`);
    }

    return response.json();
  }

  async getRepository(owner: string, repo: string, token: string): Promise<any> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status}`);
    }

    return response.json();
  }

  async getBranches(owner: string, repo: string, token: string): Promise<any> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/repository/branches`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status}`);
    }

    return response.json();
  }

  async getBranch(owner: string, repo: string, branch: string, token: string): Promise<any> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/repository/branches/${branch}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status}`);
    }

    return response.json();
  }

  async getTree(owner: string, repo: string, sha: string, recursive: boolean, token: string): Promise<any> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/repository/tree?ref=${sha}&recursive=${recursive}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status}`);
    }

    return response.json();
  }

  async getBlob(owner: string, repo: string, sha: string, token: string): Promise<any> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/repository/blobs/${sha}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status}`);
    }

    return response.json();
  }
}

// Bitbucket API implementation
export class BitbucketProviderAPI implements GitProviderAPI {
  private baseUrl = 'https://api.bitbucket.org/2.0';

  async validateToken(token: string, username?: string): Promise<{ valid: boolean; user?: any; error?: string }> {
    if (!username) {
      return { valid: false, error: 'Username is required for Bitbucket' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        return { valid: true, user };
      } else {
        return { valid: false, error: 'Invalid credentials' };
      }
    } catch (error) {
      return { valid: false, error: 'Network error' };
    }
  }

  async getRepositories(token: string, options?: { query?: string; page?: number; per_page?: number; username?: string }): Promise<any> {
    const { query, page = 1, per_page = 30, username } = options || {};
    
    if (!username) {
      throw new Error('Username is required for Bitbucket');
    }
    
    let url = `${this.baseUrl}/repositories/${username}?page=${page}&pagelen=${per_page}&sort=-updated_on`;
    
    if (query) {
      url = `${this.baseUrl}/repositories?q=name~"${encodeURIComponent(query)}"&page=${page}&pagelen=${per_page}&sort=-updated_on`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Bitbucket API error: ${response.status}`);
    }

    return response.json();
  }

  async getRepository(owner: string, repo: string, token: string, username?: string): Promise<any> {
    if (!username) {
      throw new Error('Username is required for Bitbucket');
    }

    const response = await fetch(`${this.baseUrl}/repositories/${owner}/${repo}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Bitbucket API error: ${response.status}`);
    }

    return response.json();
  }

  async getBranches(owner: string, repo: string, token: string, username?: string): Promise<any> {
    if (!username) {
      throw new Error('Username is required for Bitbucket');
    }

    const response = await fetch(`${this.baseUrl}/repositories/${owner}/${repo}/refs/branches`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Bitbucket API error: ${response.status}`);
    }

    return response.json();
  }

  async getBranch(owner: string, repo: string, branch: string, token: string, username?: string): Promise<any> {
    if (!username) {
      throw new Error('Username is required for Bitbucket');
    }

    const response = await fetch(`${this.baseUrl}/repositories/${owner}/${repo}/refs/branches/${branch}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Bitbucket API error: ${response.status}`);
    }

    return response.json();
  }

  async getTree(owner: string, repo: string, sha: string, recursive: boolean, token: string, username?: string): Promise<any> {
    if (!username) {
      throw new Error('Username is required for Bitbucket');
    }

    // Bitbucket uses different API structure
    const response = await fetch(`${this.baseUrl}/repositories/${owner}/${repo}/src/${sha}/`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Bitbucket API error: ${response.status}`);
    }

    return response.json();
  }

  async getBlob(owner: string, repo: string, sha: string, token: string, username?: string): Promise<any> {
    // Bitbucket API is different - need file path, not just SHA
    throw new Error('Bitbucket blob retrieval requires file path, not just SHA');
  }
}

// Azure DevOps API implementation
export class AzureDevOpsProviderAPI implements GitProviderAPI {
  async validateToken(token: string): Promise<{ valid: boolean; user?: any; error?: string }> {
    try {
      const response = await fetch('https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=6.0', {
        headers: {
          'Authorization': `Basic ${Buffer.from(`:${token}`).toString('base64')}`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        return { valid: true, user };
      } else {
        return { valid: false, error: 'Invalid token' };
      }
    } catch (error) {
      return { valid: false, error: 'Network error' };
    }
  }

  async getRepositories(token: string, options?: { query?: string; page?: number; per_page?: number; username?: string }): Promise<any> {
    const { query, page = 1, per_page = 30, username } = options || {};
    
    // Azure DevOps requires organization/project info - this is a simplified implementation
    // In practice, you'd need to get organizations first, then projects, then repositories
    throw new Error('Azure DevOps repository listing requires organization and project context');
  }

  async getRepository(owner: string, repo: string, token: string): Promise<any> {
    // Azure DevOps URL format: https://dev.azure.com/{organization}/{project}/_git/{repository}
    const [organization, project] = owner.split('/');
    const response = await fetch(`https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repo}?api-version=6.0`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`:${token}`).toString('base64')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Azure DevOps API error: ${response.status}`);
    }

    return response.json();
  }

  async getBranches(owner: string, repo: string, token: string): Promise<any> {
    const [organization, project] = owner.split('/');
    const response = await fetch(`https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repo}/refs?filter=heads/&api-version=6.0`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`:${token}`).toString('base64')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Azure DevOps API error: ${response.status}`);
    }

    return response.json();
  }

  async getBranch(owner: string, repo: string, branch: string, token: string): Promise<any> {
    const [organization, project] = owner.split('/');
    const response = await fetch(`https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repo}/refs?filter=heads/${branch}&api-version=6.0`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`:${token}`).toString('base64')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Azure DevOps API error: ${response.status}`);
    }

    return response.json();
  }

  async getTree(owner: string, repo: string, sha: string, recursive: boolean, token: string): Promise<any> {
    const [organization, project] = owner.split('/');
    const response = await fetch(`https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repo}/trees/${sha}?recursive=${recursive}&api-version=6.0`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`:${token}`).toString('base64')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Azure DevOps API error: ${response.status}`);
    }

    return response.json();
  }

  async getBlob(owner: string, repo: string, sha: string, token: string): Promise<any> {
    const [organization, project] = owner.split('/');
    const response = await fetch(`https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repo}/blobs/${sha}?api-version=6.0`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`:${token}`).toString('base64')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Azure DevOps API error: ${response.status}`);
    }

    return response.json();
  }
}

// Factory function to get the appropriate API instance
export function getProviderAPI(provider: string): GitProviderAPI {
  switch (provider) {
    case 'github':
      return new GitHubProviderAPI();
    case 'gitlab':
      return new GitLabProviderAPI();
    case 'bitbucket':
      return new BitbucketProviderAPI();
    case 'azure':
      return new AzureDevOpsProviderAPI();
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
