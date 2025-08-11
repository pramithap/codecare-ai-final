// Simple in-memory repository store for demo
// TODO: Replace with proper database (PostgreSQL, MongoDB, etc.)

import type { Repository, CreateRepoRequest, UpdateRepoRequest } from '../../types/repos';

class RepositoryStore {
  private repos = new Map<string, Repository>();

  constructor() {
    // Add some demo data
    this.repos.set('demo-1', {
      id: 'demo-1',
      name: 'react-dashboard',
      provider: 'github',
      remoteUrl: 'https://github.com/user/react-dashboard',
      defaultBranch: 'main',
      lastScanAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      status: 'ready',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    });

    this.repos.set('demo-2', {
      id: 'demo-2',
      name: 'mobile-app',
      provider: 'zip',
      remoteUrl: null,
      defaultBranch: 'develop',
      lastScanAt: null,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async findAll(): Promise<Repository[]> {
    return Array.from(this.repos.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async findById(id: string): Promise<Repository | null> {
    return this.repos.get(id) || null;
  }

  async create(data: CreateRepoRequest): Promise<Repository> {
    const id = `repo_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const now = new Date().toISOString();

    const repo: Repository = {
      id,
      name: data.name,
      provider: data.provider,
      remoteUrl: data.remoteUrl || null,
      defaultBranch: data.defaultBranch,
      lastScanAt: null,
      status: 'new',
      createdAt: now,
      updatedAt: now,
    };

    this.repos.set(id, repo);
    return repo;
  }

  async update(id: string, data: UpdateRepoRequest): Promise<Repository | null> {
    const repo = this.repos.get(id);
    if (!repo) return null;

    const updatedRepo: Repository = {
      ...repo,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    this.repos.set(id, updatedRepo);
    return updatedRepo;
  }

  async delete(id: string): Promise<boolean> {
    return this.repos.delete(id);
  }

  async findByName(name: string, provider?: string): Promise<Repository | null> {
    for (const repo of this.repos.values()) {
      if (repo.name === name && (!provider || repo.provider === provider)) {
        return repo;
      }
    }
    return null;
  }
}

// Singleton instance
export const repositoryStore = new RepositoryStore();
