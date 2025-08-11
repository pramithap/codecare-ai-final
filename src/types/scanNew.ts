export interface RepoRef {
  id: string;
  name: string;
  provider: 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'zip';
  remoteUrl?: string;
  defaultBranch: string;
}

export type ScanDepth = 'full' | 'incremental';

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ScanProgress {
  repoId: string;
  repoName: string;
  status: RunStatus;
  progress: number;
  message: string;
  error?: string;
}

export interface ScanRun {
  id: string;
  repos: RepoRef[];
  depth: ScanDepth;
  status: RunStatus;
  startTime: string;
  endTime?: string;
  progress: Record<string, ScanProgress>;
  totalRepos: number;
  completedRepos: number;
}

export interface ServiceComponent {
  name: string;
  version: string;
  latestVersion?: string;
  type: 'dependency' | 'devDependency' | 'buildDependency';
  scope?: string;
  eol?: boolean;
  cveCount: number;
  flagged?: boolean;
  flagReason?: string;
}

export interface ServiceSummary {
  id: string;
  name: string;
  path: string;
  language: string;
  runtime?: string;
  runtimeVersion?: string;
  components: ServiceComponent[];
  manifestFiles: string[];
  eol?: boolean;
  baseImage?: string;
}

export interface TechnologySummary {
  name: string;
  category: 'language' | 'runtime' | 'framework' | 'database' | 'infrastructure' | 'build-tool' | 'testing' | 'container' | 'cloud' | 'monitoring' | 'security' | 'other';
  version?: string;
  serviceCount: number;
  services: string[]; // Service names using this technology
}

export interface ScanResults {
  runId: string;
  services: ServiceSummary[];
  totalServices: number;
  totalComponents: number;
  flaggedComponents: number;
  eolComponents: number;
  technologies: TechnologySummary[];
}

export interface StartScanRequest {
  repos: RepoRef[];
  depth: ScanDepth;
}

export interface StartScanResponse {
  runId: string;
}

// GitHub API types
export interface GitHubTree {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubBlob {
  sha: string;
  url: string;
  content: string;
  encoding: 'base64';
  size: number;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubComparison {
  base_commit: {
    sha: string;
  };
  commits: Array<{
    sha: string;
  }>;
  files: Array<{
    sha: string;
    filename: string;
    status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
    additions: number;
    deletions: number;
    changes: number;
    blob_url: string;
    raw_url: string;
    contents_url: string;
    patch?: string;
    previous_filename?: string;
  }>;
}

// Manifest patterns
export const MANIFEST_PATTERNS = [
  '**/package.json',
  '**/pom.xml',
  '**/build.gradle',
  '**/build.gradle.kts',
  '**/build.xml',
  '**/cpanfile',
  '**/Makefile.PL',
  '**/Dockerfile',
  '**/.nvmrc',
  '**/.node-version',
  '**/.java-version',
] as const;

// EOL data
export const NODE_EOL_VERSIONS = ['18'] as const;
export const NODE_LTS_VERSIONS = ['20'] as const;
export const NODE_CURRENT_VERSIONS = ['22'] as const;

export const JAVA_LTS_VERSIONS = ['8', '11', '17', '21'] as const;

// Flagged dependencies
export const FLAGGED_COORDINATES = {
  axis2: ['org.apache.axis2', 'axis2'],
  chemaxon: ['chemaxon', 'jchem'],
} as const;
