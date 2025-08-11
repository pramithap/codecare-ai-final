import type { NextApiRequest, NextApiResponse } from 'next';
import type { ScanRun } from '../../../../types/scanNew';
import { scanStore } from '../../../../lib/scanNew/store';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ScanRun | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid scan ID' });
  }

  const run = scanStore.getRun(id);

  if (!run) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  res.status(200).json(run);
}
