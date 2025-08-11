import { NextApiRequest, NextApiResponse } from 'next';
import { getUserPAT } from '../../../../lib/server/session';
import type { BranchSummary } from '../../../../types/repos';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sessionId = req.cookies['github-session'];

    if (!sessionId) {
      return res.status(401).json({ error: 'No GitHub session found' });
    }

    const pat = getUserPAT(sessionId);
    if (!pat) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const { owner, repo } = req.query;

    if (!owner || !repo) {
      return res.status(400).json({ error: 'Owner and repo parameters are required' });
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      {
        headers: {
          'Authorization': `token ${pat}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'CodeCare-AI'
        }
      }
    );

    if (!response.ok) {
      let errorMessage = 'Failed to fetch branches';
      
      if (response.status === 401) {
        errorMessage = 'Token expired or invalid';
      } else if (response.status === 403) {
        errorMessage = 'Rate limit exceeded or insufficient permissions';
      } else if (response.status === 404) {
        errorMessage = 'Repository not found or access denied';
      }

      return res.status(response.status).json({ error: errorMessage });
    }

    const branches = await response.json();
    
    const branchSummaries: BranchSummary[] = branches.map((branch: any) => ({
      name: branch.name,
      commitSha: branch.commit?.sha
    }));

    return res.status(200).json({ branches: branchSummaries });

  } catch (error) {
    console.error('GitHub branches fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch branches' });
  }
}
