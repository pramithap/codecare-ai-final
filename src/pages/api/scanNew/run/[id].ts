import type { NextApiRequest, NextApiResponse } from 'next';
import type { ScanRun } from '../../../../types/scanNew';
import { scanStore } from '../../../../lib/scanNew/store';

export default async function handler(
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

  console.log(`[API] Looking for scan run: ${id}`);
  
  // Check if run exists, if not, wait a moment and try again (race condition fix)
  let run = scanStore.getRun(id);
  if (!run) {
    console.log(`[API] Scan run not found immediately, waiting 100ms and trying again...`);
    await new Promise(resolve => setTimeout(resolve, 100));
    run = scanStore.getRun(id);
  }

  if (!run) {
    console.log(`[API] Scan run not found: ${id}`);
    
    // Debug: List all available runs
    const allRunIds = scanStore.getAllRuns().map(r => r.id);
    console.log(`[API] Available runs: ${allRunIds.join(', ')}`);
    
    return res.status(404).json({ error: 'Scan run not found' });
  }

  console.log(`[API] Found scan run: ${id}, status: ${run.status}`);
  res.status(200).json(run);
}
