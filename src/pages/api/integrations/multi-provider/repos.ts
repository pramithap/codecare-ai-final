import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

const querySchema = z.object({
  provider: z.enum(['github', 'gitlab', 'bitbucket', 'azure']),
  token: z.string(),
  username: z.string().optional(),
  query: z.string().optional(),
  page: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { provider, token, username, query, page } = querySchema.parse(req.query);
    
    // For now, only implement GitHub. Others will return placeholder data
    if (provider === 'github') {
      const pageNum = page ? parseInt(page) : 1;
      const perPage = 20;
      
      let url: string;
      if (query) {
        const params = new URLSearchParams({
          q: query,
          sort: 'updated',
          order: 'desc',
          page: pageNum.toString(),
          per_page: perPage.toString(),
        });
        url = `https://api.github.com/search/repositories?${params}`;
      } else {
        const params = new URLSearchParams({
          sort: 'updated',
          direction: 'desc',
          page: pageNum.toString(),
          per_page: perPage.toString(),
        });
        url = `https://api.github.com/user/repos?${params}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (query) {
        res.status(200).json({
          repos: data.items.map((repo: any) => ({
            id: repo.id.toString(),
            name: repo.name,
            full_name: repo.full_name,
            default_branch: repo.default_branch,
            description: repo.description,
            private: repo.private,
            clone_url: repo.clone_url,
            html_url: repo.html_url,
          })),
          totalCount: data.total_count,
          currentPage: pageNum,
          totalPages: Math.ceil(data.total_count / perPage),
        });
      } else {
        res.status(200).json({
          repos: data.map((repo: any) => ({
            id: repo.id.toString(),
            name: repo.name,
            full_name: repo.full_name,
            default_branch: repo.default_branch,
            description: repo.description,
            private: repo.private,
            clone_url: repo.clone_url,
            html_url: repo.html_url,
          })),
          totalCount: data.length,
          currentPage: pageNum,
          totalPages: 1,
        });
      }
    } else {
      // Placeholder for other providers
      res.status(200).json({
        repos: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 1,
      });
    }
  } catch (error) {
    console.error('Multi-provider repos error:', error);
    
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
