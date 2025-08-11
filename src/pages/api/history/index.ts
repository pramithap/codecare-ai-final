import type { NextApiRequest, NextApiResponse } from 'next';
import { readScans } from '../../../lib/scanStorage';
import type { ScanRecord } from '../../../lib/scanStorage';

interface HistoryQuery {
  repo?: string;
  severity?: 'high' | 'med' | 'low';
  dateFrom?: string;
  dateTo?: string;
  compatibility?: string;
  page?: string;
  limit?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  export?: 'csv' | 'json';
}

interface HistorySummary {
  repos: number;
  scans: number;
  highVulns: number;
  eolOverdue: number;
  avgCompat: number;
}

interface HistoryResponse {
  summary: HistorySummary;
  scans: ScanRecord[];
  page: number;
  pageSize: number;
  total: number;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<HistoryResponse | ScanRecord[] | string>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const {
      repo,
      severity,
      dateFrom,
      dateTo,
      compatibility,
      page = '1',
      limit = '20',
      sortField = 'scannedAt',
      sortDirection = 'desc',
      export: exportFormat
    } = req.query as HistoryQuery;

    let scans = readScans();

    // Apply filters
    if (repo) {
      scans = scans.filter(scan => 
        scan.repoName.toLowerCase().includes(repo.toLowerCase())
      );
    }

    if (severity) {
      scans = scans.filter(scan => {
        switch (severity) {
          case 'high': return scan.vulns.high > 0;
          case 'med': return scan.vulns.med > 0;
          case 'low': return scan.vulns.low > 0;
          default: return true;
        }
      });
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      scans = scans.filter(scan => new Date(scan.scannedAt) >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      scans = scans.filter(scan => new Date(scan.scannedAt) <= toDate);
    }

    if (compatibility) {
      let minCompatNum = 0;
      let maxCompatNum = 100;
      
      switch (compatibility) {
        case 'good':
          minCompatNum = 80;
          break;
        case 'fair':
          minCompatNum = 60;
          maxCompatNum = 79;
          break;
        case 'poor':
          maxCompatNum = 59;
          break;
      }
      
      scans = scans.filter(scan => 
        scan.compat.avg >= minCompatNum && 
        (maxCompatNum === 100 || scan.compat.avg <= maxCompatNum)
      );
    }

    // Sort scans  
    if (sortField === 'scannedAt') {
      scans.sort((a, b) => {
        const dateA = new Date(a.scannedAt).getTime();
        const dateB = new Date(b.scannedAt).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    } else {
      scans.sort((a, b) => {
        const aValue = a[sortField as keyof ScanRecord];
        const bValue = b[sortField as keyof ScanRecord];
        
        if (!aValue || !bValue) return 0;
        
        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }

    // Handle export
    if (exportFormat === 'csv') {
      const csvHeaders = 'Repo,Scanned At,Total Deps,Outdated Deps,High Vulns,Med Vulns,Low Vulns,EOL Overdue,EOL Soon,Avg Compat,Min Compat\n';
      const csvRows = scans.map(scan => 
        `"${scan.repoName}","${scan.scannedAt}",${scan.libsTotal},${scan.libsOutdated},${scan.vulns.high},${scan.vulns.med},${scan.vulns.low},${scan.eol.overdue},${scan.eol.soon},${scan.compat.avg},${scan.compat.min}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="scan-history.csv"');
      return res.status(200).send(csvHeaders + csvRows);
    }

    if (exportFormat === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="scan-history.json"');
      return res.status(200).json(scans);
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const total = scans.length;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedScans = scans.slice(startIndex, endIndex);

    // Calculate summary
    const uniqueRepos = new Set(scans.map(scan => scan.repoName)).size;
    const totalHighVulns = scans.reduce((sum, scan) => sum + scan.vulns.high, 0);
    const totalEolOverdue = scans.reduce((sum, scan) => sum + scan.eol.overdue, 0);
    const avgCompat = scans.length > 0 
      ? scans.reduce((sum, scan) => sum + scan.compat.avg, 0) / scans.length 
      : 0;

    const summary: HistorySummary = {
      repos: uniqueRepos,
      scans: scans.length,
      highVulns: totalHighVulns,
      eolOverdue: totalEolOverdue,
      avgCompat: Math.round(avgCompat)
    };

    const response: HistoryResponse = {
      summary,
      scans: paginatedScans,
      page: pageNum,
      pageSize: limitNum,
      total
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error in history API:', error);
    res.status(500).json({
      summary: { repos: 0, scans: 0, highVulns: 0, eolOverdue: 0, avgCompat: 0 },
      scans: [],
      page: 1,
      pageSize: 10,
      total: 0
    } as HistoryResponse);
  }
}
