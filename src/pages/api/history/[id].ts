import type { NextApiRequest, NextApiResponse } from 'next';
import { getScanById } from '../../../lib/scanStorage';
import type { ScanRecord } from '../../../lib/scanStorage';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ScanRecord | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid scan ID' });
    }

    const scan = getScanById(id);
    
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    res.status(200).json(scan);

  } catch (error) {
    console.error('Error fetching scan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
