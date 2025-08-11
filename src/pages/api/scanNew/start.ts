import type { NextApiRequest, NextApiResponse } from 'next';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import type { StartScanRequest, StartScanResponse, RepoRef, ScanRun, ScanProgress } from '../../../types/scanNew';
import { scanStore } from '../../../lib/scanNew/store';

const startScanSchema = z.object({
  repos: z.array(z.object({
    id: z.string(),
    name: z.string(),
    provider: z.enum(['github', 'gitlab', 'bitbucket', 'azure', 'zip']),
    remoteUrl: z.string().optional(),
    defaultBranch: z.string(),
  })).min(1, 'At least one repository is required'),
  depth: z.enum(['full', 'incremental']),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StartScanResponse | { error: string }>
) {
  console.log(`[API] ===== SCAN START ENDPOINT HIT =====`);
  console.log(`[API] Method: ${req.method}`);
  console.log(`[API] URL: ${req.url}`);
  console.log(`[API] Headers:`, req.headers);
  console.log(`[API] Body:`, req.body);
  
  // Test scanStore availability first
  try {
    const allRuns = scanStore.getAllRuns();
    console.log(`[API] ScanStore is working, current runs: ${allRuns.length}`);
  } catch (storeError) {
    console.error(`[API] ScanStore error:`, storeError);
    return res.status(500).json({ error: 'Scan store not available' });
  }
  
  if (req.method !== 'POST') {
    console.log(`[API] Method not allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log(`[API] Request body:`, req.body);
    
    // Get user session for GitHub authentication
    const session = await getServerSession(req, res, authOptions);
    const githubToken = (session as any)?.accessToken;
    console.log(`[API] Session found: ${!!session}, GitHub token available: ${!!githubToken}`);

    // Parse and validate request body
    const parsed = startScanSchema.parse(req.body);
    const { repos, depth } = parsed;
    console.log(`[API] Parsed request: ${repos.length} repos, depth: ${depth}`);

    // Create new scan run
    const runId = nanoid();
    const now = new Date().toISOString();

    // Create progress entries for each repo
    const progress: Record<string, ScanProgress> = {};
    repos.forEach(repo => {
      progress[repo.id] = {
        repoId: repo.id,
        repoName: repo.name,
        status: 'pending',
        progress: 0,
        message: 'Queued for scanning',
      };
    });

    const scanRun: ScanRun = {
      id: runId,
      repos,
      depth,
      status: 'pending',
      startTime: now,
      progress,
      totalRepos: repos.length,
      completedRepos: 0,
    };

    console.log(`[API] Creating scan run with ID: ${runId}`);
    scanStore.createRun(scanRun);
    console.log(`[API] Created scan run: ${runId} with ${repos.length} repositories`);

    // Verify the run was created
    const createdRun = scanStore.getRun(runId);
    if (!createdRun) {
      console.error(`[API] Failed to create scan run: ${runId} - run not found after creation`);
      return res.status(500).json({ error: 'Failed to create scan run' });
    }
    console.log(`[API] Verified scan run created successfully: ${runId}`);

    // Start the scanning process in background
    startScanProcess(runId, githubToken);

    console.log(`[API] Returning scan ID: ${runId}`);
    
    // Final verification before returning
    const finalCheck = scanStore.getRun(runId);
    console.log(`[API] Final check - run exists: ${!!finalCheck}`);
    if (finalCheck) {
      console.log(`[API] Final check - run status: ${finalCheck.status}, repos: ${finalCheck.repos.length}`);
    }
    
    res.status(200).json({ runId });
  } catch (error) {
    console.error('[API] Failed to start scan:', error);
    
    if (error instanceof z.ZodError) {
      console.error('[API] Validation error:', error.errors);
      return res.status(400).json({
        error: error.errors.map((e: any) => e.message).join(', ')
      });
    }

    console.error('[API] Internal server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function startScanProcess(runId: string, githubToken?: string) {
  console.log(`[API] Starting scan process for run: ${runId}, authenticated: ${!!githubToken}`);
  try {
    // Import the scanner and start processing
    const { ScanEngine } = await import('../../../lib/scanNew/scanner');
    const scanner = new ScanEngine(githubToken);
    
    // Run the scan in the background
    scanner.runScan(runId).catch((error: Error) => {
      console.error(`Scan ${runId} failed:`, error);
      scanStore.updateRun(runId, { 
        status: 'failed',
        endTime: new Date().toISOString(),
      });
    });
  } catch (error) {
    console.error(`Failed to import scanner for run ${runId}:`, error);
    scanStore.updateRun(runId, { 
      status: 'failed',
      endTime: new Date().toISOString(),
    });
  }
}
