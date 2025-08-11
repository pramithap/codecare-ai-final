export type Provider = 'github' | 'zip';

export interface Repository {
  id: string;
  name: string;
  provider: Provider;
  remoteUrl?: string | null;
  defaultBranch: string;
  lastScanAt?: string | null;
  status: 'new' | 'ready' | 'drift' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface GitHubRepoSummary {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
}

export interface BranchSummary {
  name: string;
  commitSha?: string;
}

export interface PATValidationResponse {
  valid: boolean;
  user?: {
    login: string;
    name: string;
    avatar_url: string;
  };
  error?: string;
  scopes?: string[];
}

export interface GitHubRepoResponse {
  repos: GitHubRepoSummary[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface UploadInitResponse {
  uploadUrl: string;
  uploadId: string;
  maxSizeBytes: number;
}

export interface CreateRepoRequest {
  provider: Provider;
  name: string;
  defaultBranch: string;
  remoteUrl?: string;
  githubRepoId?: number;
  uploadId?: string;
}

export interface UpdateRepoRequest {
  defaultBranch?: string;
  status?: 'new' | 'ready' | 'drift' | 'error';
  lastScanAt?: string;
}
