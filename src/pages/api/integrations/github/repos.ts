import { NextApiRequest, NextApiResponse } from 'next';
import { getUserPAT } from '../../../../lib/server/session';
import type { GitHubRepoResponse, GitHubRepoSummary } from '../../../../types/repos';

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

    const { query = '', page = '1' } = req.query;
    const pageNum = parseInt(page as string);
    const perPage = 30;

    // Build GitHub API URL
    let url = `https://api.github.com/user/repos?per_page=${perPage}&page=${pageNum}&sort=updated&type=all`;
    
    if (query) {
      // Use search API for queries
      url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query as string)}+user:@me&per_page=${perPage}&page=${pageNum}&sort=updated`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${pat}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'CodeCare-AI'
      }
    });

    if (!response.ok) {
      let errorMessage = 'Failed to fetch repositories';
      
      if (response.status === 401) {
        errorMessage = 'Token expired or invalid';
      } else if (response.status === 403) {
        errorMessage = 'Rate limit exceeded or insufficient permissions';
      } else if (response.status === 422) {
        errorMessage = 'Invalid search query';
      }

      return res.status(response.status).json({ error: errorMessage });
    }

    const data = await response.json();
    
    let repos: GitHubRepoSummary[];
    let totalCount: number;

    if (query) {
      // Search API response format
      repos = data.items.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        default_branch: repo.default_branch
      }));
      totalCount = data.total_count;
    } else {
      // User repos API response format
      repos = data.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        default_branch: repo.default_branch
      }));
      
      // Get total count from Link header if available
      const linkHeader = response.headers.get('Link');
      if (linkHeader) {
        const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
        if (lastMatch) {
          totalCount = parseInt(lastMatch[1]) * perPage;
        } else {
          totalCount = repos.length;
        }
      } else {
        totalCount = repos.length;
      }
    }

    const totalPages = Math.ceil(totalCount / perPage);

    const repoResponse: GitHubRepoResponse = {
      repos,
      totalCount,
      currentPage: pageNum,
      totalPages
    };

    return res.status(200).json(repoResponse);

  } catch (error) {
    console.error('GitHub repos fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch repositories' });
  }
}
