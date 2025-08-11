// Centralized scan storage to avoid module loading issues

export interface StoredScanResult {
  id: string;
  timestamp: string;
  repositories: {
    id: string;
    name: string;
    url?: string;
    branch: string;
    services: {
      id: string;
      name: string;
      path: string;
      language: string;
      runtime?: string;
      runtimeVersion?: string;
      components: {
        name: string;
        version: string;
        latestVersion?: string;
        type: 'dependency' | 'devDependency' | 'buildDependency';
        eol?: boolean;
        cveCount: number;
        flagged?: boolean;
        flagReason?: string;
      }[];
      manifestFiles: string[];
    }[];
  }[];
  summary: {
    totalServices: number;
    totalComponents: number;
    flaggedComponents: number;
    eolComponents: number;
    totalRepositories: number;
  };
}

class ScanStore {
  private scans: StoredScanResult[] = [];
  private initialized = false;

  private initializeSampleData() {
    if (this.initialized) return;

    // Start with empty array - no dummy data
    this.scans = [];

    this.initialized = true;
  }

  getAllScans(): StoredScanResult[] {
    this.initializeSampleData();
    return [...this.scans];
  }

  findScan(id: string): StoredScanResult | undefined {
    this.initializeSampleData();
    return this.scans.find(scan => scan.id === id);
  }

  addScan(scan: StoredScanResult): void {
    this.initializeSampleData();
    
    // Check for duplicates
    const recentDuplicate = this.scans.find(existingScan => {
      const existingRepoNames = existingScan.repositories.map(r => r.name).sort().join(',');
      const scanRepoNames = scan.repositories.map(r => r.name).sort().join(',');
      const timeDiff = Date.now() - new Date(existingScan.timestamp).getTime();
      return existingRepoNames === scanRepoNames && timeDiff < 5 * 60 * 1000; // 5 minutes
    });

    if (!recentDuplicate) {
      this.scans.push(scan);
      
      // Keep only the latest 50 scans to prevent memory issues
      if (this.scans.length > 50) {
        this.scans = this.scans.slice(-50);
      }
    }
  }

  removeScan(id: string): boolean {
    this.initializeSampleData();
    const index = this.scans.findIndex(scan => scan.id === id);
    if (index !== -1) {
      this.scans.splice(index, 1);
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const scanStore = new ScanStore();
