import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

const querySchema = z.object({
  provider: z.enum(['github', 'gitlab', 'bitbucket', 'azure']),
  token: z.string(),
  username: z.string().optional(),
  repo: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { provider, token, username, repo } = querySchema.parse(req.query);
    
    // For now, only implement GitHub
    if (provider === 'github') {
      const response = await fetch(`https://api.github.com/repos/${repo}/branches`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const branches = await response.json();
      res.status(200).json(branches.map((branch: any) => ({
        name: branch.name,
        sha: branch.commit.sha,
      })));
    } else {
      // Placeholder for other providers
      res.status(200).json([
        { name: 'main', sha: 'abc123' },
        { name: 'develop', sha: 'def456' },
      ]);
    }
  } catch (error) {
    console.error('Multi-provider branches error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid request parameters',
        details: error.errors 
      });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
}
