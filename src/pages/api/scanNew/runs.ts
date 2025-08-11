import type { NextApiRequest, NextApiResponse } from 'next';
import type { ScanRun } from '../../../types/scanNew';
import { scanStore } from '../../../lib/scanNew/store';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ScanRun[] | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const runs = scanStore.getAllRuns();
    res.status(200).json(runs);
  } catch (error) {
    console.error('Failed to fetch runs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
