import type { NextApiRequest, NextApiResponse } from 'next';
import { getScanById } from '../../../lib/scanStorage';

interface RescanRequest {
  scanId: string;
}

interface RescanResponse {
  success: boolean;
  message: string;
  newScanId?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RescanResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false, 
      message: `Method ${req.method} Not Allowed` 
    });
  }

  try {
    const { scanId }: RescanRequest = req.body;
    
    if (!scanId || typeof scanId !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid scan ID' 
      });
    }

    const originalScan = getScanById(scanId);
    
    if (!originalScan) {
      return res.status(404).json({ 
        success: false, 
        message: 'Original scan not found' 
      });
    }

    // For now, we'll redirect to the scan API with the original repository info
    // In a full implementation, this would trigger a new scan and return the new scan ID
    const { repoName, branch } = originalScan;
    
    // This would typically trigger the scan process and return the new scan ID
    // For now, we'll return a placeholder response
    res.status(200).json({
      success: true,
      message: `Rescan initiated for ${repoName}${branch ? ` (${branch})` : ''}`,
      // In real implementation: newScanId: generatedId
    });

  } catch (error) {
    console.error('Error initiating rescan:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}
