import fs from 'fs';
import path from 'path';

export interface ScanRecord {
  id: string;
  repoName: string;
  repoUrl?: string;
  branch?: string;
  commit?: string;
  scannedAt: string;
  libsTotal: number;
  libsOutdated: number;
  vulns: { low: number; med: number; high: number };
  eol: { overdue: number; soon: number };
  compat: { avg: number; min: number };
  planReady: boolean;
  tags?: string[];
  sampleLibs?: Array<{
    name: string;
    current: string;
    latest?: string;
    severity?: 'Low' | 'Med' | 'High';
    eol?: string | null;
  }>;
}

const SCANS_FILE_PATH = path.join(process.cwd(), 'data', 'scans.json');

export function readScans(): ScanRecord[] {
  try {
    if (!fs.existsSync(SCANS_FILE_PATH)) {
      return [];
    }
    const data = fs.readFileSync(SCANS_FILE_PATH, 'utf8');
    return JSON.parse(data) || [];
  } catch (error) {
    console.error('Error reading scans:', error);
    return [];
  }
}

export function writeScans(scans: ScanRecord[]): void {
  try {
    const dir = path.dirname(SCANS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SCANS_FILE_PATH, JSON.stringify(scans, null, 2));
  } catch (error) {
    console.error('Error writing scans:', error);
    throw error;
  }
}

export function addScan(scan: ScanRecord): void {
  const scans = readScans();
  scans.push(scan);
  writeScans(scans);
}

export function getScanById(id: string): ScanRecord | null {
  const scans = readScans();
  return scans.find(scan => scan.id === id) || null;
}

export function generateScanId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
