import type { ScanRun, ScanResults, ScanProgress } from '../../types/scanNew';

// In-memory storage for scan runs and results
class ScanStore {
  private runs = new Map<string, ScanRun>();
  private results = new Map<string, ScanResults>();
  private repoCache = new Map<string, {
    lastCommitSha?: string;
    manifestIndex?: Set<string>;
    fileHashes?: Map<string, string>;
  }>();

  // Scan runs management
  createRun(run: ScanRun): void {
    this.runs.set(run.id, run);
  }

  getRun(id: string): ScanRun | undefined {
    return this.runs.get(id);
  }

  updateRun(id: string, updates: Partial<ScanRun>): void {
    const run = this.runs.get(id);
    if (run) {
      this.runs.set(id, { ...run, ...updates });
    }
  }

  updateProgress(runId: string, repoId: string, progress: Partial<ScanProgress>): void {
    const run = this.runs.get(runId);
    if (run) {
      // Update specific repo progress
      if (run.progress[repoId]) {
        run.progress[repoId] = { ...run.progress[repoId], ...progress };
      }
      
      // Update overall run status
      const progressValues = Object.values(run.progress);
      const completedRepos = progressValues.filter(p => p.status === 'completed' || p.status === 'failed').length;
      const failedRepos = progressValues.filter(p => p.status === 'failed').length;
      
      if (completedRepos === run.totalRepos) {
        run.status = failedRepos > 0 ? 'failed' : 'completed';
        run.endTime = new Date().toISOString();
      }
      
      run.completedRepos = completedRepos;
      this.runs.set(runId, run);
    }
  }

  getAllRuns(): ScanRun[] {
    return Array.from(this.runs.values()).sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  // Results management
  setResults(runId: string, results: ScanResults): void {
    this.results.set(runId, results);
  }

  getResults(runId: string): ScanResults | undefined {
    return this.results.get(runId);
  }

  // Repository cache management
  getRepoCache(repoId: string) {
    return this.repoCache.get(repoId) || {};
  }

  updateRepoCache(repoId: string, cache: {
    lastCommitSha?: string;
    manifestIndex?: Set<string>;
    fileHashes?: Map<string, string>;
  }): void {
    const existing = this.repoCache.get(repoId) || {};
    this.repoCache.set(repoId, { ...existing, ...cache });
  }

  clearRepoCache(repoId: string): void {
    this.repoCache.delete(repoId);
  }

  // Utility methods
  cleanup(olderThanDays = 7): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    for (const [id, run] of this.runs.entries()) {
      if (new Date(run.startTime) < cutoff) {
        this.runs.delete(id);
        this.results.delete(id);
      }
    }
  }

  getStats() {
    return {
      totalRuns: this.runs.size,
      totalResults: this.results.size,
      cachedRepos: this.repoCache.size,
    };
  }
}

// Ensure global singleton in development mode
declare global {
  var __scanStore: ScanStore | undefined;
}

// Export singleton instance - use global storage in development to survive hot reloads
export const scanStore = globalThis.__scanStore ?? new ScanStore();
globalThis.__scanStore = scanStore;

// Auto-cleanup old runs daily
if (typeof global !== 'undefined') {
  setInterval(() => {
    scanStore.cleanup();
  }, 24 * 60 * 60 * 1000); // 24 hours
}
