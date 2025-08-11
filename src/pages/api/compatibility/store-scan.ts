import { NextApiRequest, NextApiResponse } from 'next';
import { scanStore, StoredScanResult } from '../../../lib/scanStore';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { scanResults, repositories } = req.body;

      if (!scanResults || !repositories) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing scanResults or repositories data' 
        });
      }

      // Create a unique key for this scan based on repositories and approximate timing
      const repoNames = repositories.map((repo: any) => repo.name).sort().join(',');
      const currentTime = Date.now();
      
      // Check if a similar scan was stored in the last 5 minutes (to prevent immediate duplicates)
      const allScans = scanStore.getAllScans();
      const recentDuplicate = allScans.find(existingScan => {
        const existingRepoNames = existingScan.repositories.map(r => r.name).sort().join(',');
        const timeDiff = currentTime - new Date(existingScan.timestamp).getTime();
        return existingRepoNames === repoNames && timeDiff < 5 * 60 * 1000; // 5 minutes
      });

      if (recentDuplicate) {
        console.log('Duplicate scan detected, returning existing scan ID:', recentDuplicate.id);
        return res.status(200).json({
          success: true,
          scanId: recentDuplicate.id,
          message: 'Scan results already exist (duplicate prevented)'
        });
      }

      // Create stored scan result
      const storedScan: StoredScanResult = {
        id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        repositories: repositories.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          url: repo.remoteUrl,
          branch: repo.defaultBranch || 'main',
          services: scanResults.services
            .filter((service: any) => service.repoId === repo.id || service.repositoryName === repo.name)
            .map((service: any) => ({
              id: service.id,
              name: service.name,
              path: service.path,
              language: service.language,
              runtime: service.runtime,
              runtimeVersion: service.runtimeVersion,
              components: service.components.map((comp: any) => ({
                name: comp.name,
                version: comp.version,
                latestVersion: comp.latestVersion,
                type: comp.type,
                eol: comp.eol,
                cveCount: comp.cveCount,
                flagged: comp.flagged,
                flagReason: comp.flagReason,
              })),
              manifestFiles: service.manifestFiles || [],
            }))
        })),
        summary: {
          totalServices: scanResults.totalServices,
          totalComponents: scanResults.totalComponents,
          flaggedComponents: scanResults.flaggedComponents,
          eolComponents: scanResults.eolComponents,
          totalRepositories: repositories.length,
        }
      };

      // Store the scan result
      scanStore.addScan(storedScan);
      
      console.log(`Stored scan result: ${storedScan.id}`);

      return res.status(200).json({
        success: true,
        scanId: storedScan.id,
        message: 'Scan results stored successfully'
      });

    } catch (error) {
      console.error('Error storing scan results:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to store scan results'
      });
    }
  }

  if (req.method === 'GET') {
    try {
      // Return all stored scans with full data for the collapsible interface
      const allScans = scanStore.getAllScans();
      console.log('[API] GET store-scan - allScans length:', allScans.length);
      console.log('[API] GET store-scan - allScans:', allScans.map(s => ({ id: s.id, repoCount: s.repositories.length })));
      
      const scanList = allScans.map((scan: StoredScanResult) => ({
        id: scan.id,
        timestamp: scan.timestamp,
        summary: scan.summary,
        repositories: scan.repositories.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          url: repo.url,
          branch: repo.branch,
          serviceCount: repo.services.length,
          services: repo.services // Include services data for collapsible interface
        }))
      })).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      console.log('[API] GET store-scan - returning scanList length:', scanList.length);

      return res.status(200).json({
        success: true,
        scans: scanList
      });

    } catch (error) {
      console.error('Error retrieving scan results:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve scan results'
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { scanId } = req.query;

      if (!scanId || typeof scanId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Missing scanId parameter'
        });
      }

      const removed = scanStore.removeScan(scanId);

      if (!removed) {
        return res.status(404).json({
          success: false,
          error: 'Scan not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Scan deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting scan result:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete scan result'
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

// Export scan store for other API routes
export { scanStore };
