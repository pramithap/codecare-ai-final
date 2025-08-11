import { NextApiRequest, NextApiResponse } from 'next';
import { scanStore } from '../../../../lib/scanStore';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { scanId } = req.query;

      if (!scanId || typeof scanId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Missing scanId parameter'
        });
      }

      const scan = scanStore.findScan(scanId);

      if (!scan) {
        return res.status(404).json({
          success: false,
          error: 'Scan not found'
        });
      }

      return res.status(200).json({
        success: true,
        scan
      });

    } catch (error) {
      console.error('Error retrieving scan details:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve scan details'
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
