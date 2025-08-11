import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  private: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the user's GitHub access token from Clerk
    const clerkApiUrl = `https://api.clerk.com/v1/users/${userId}/oauth_access_tokens/github`;
    
    const clerkResponse = await fetch(clerkApiUrl, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!clerkResponse.ok) {
      console.error('Failed to get GitHub token from Clerk:', await clerkResponse.text());
      return res.status(500).json({ error: 'Failed to authenticate with GitHub' });
    }

    const tokenData = await clerkResponse.json();
    const githubToken = tokenData[0]?.token;

    if (!githubToken) {
      return res.status(400).json({ error: 'No GitHub token found. Please connect your GitHub account.' });
    }

    // Fetch repositories from GitHub API
    const githubResponse = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'CodeCare-AI',
      },
    });

    if (!githubResponse.ok) {
      console.error('GitHub API error:', await githubResponse.text());
      return res.status(500).json({ error: 'Failed to fetch repositories from GitHub' });
    }

    const githubRepos: GitHubRepo[] = await githubResponse.json();

    // Transform GitHub repos to our format
    const transformedRepos = githubRepos.map(repo => ({
      id: repo.id.toString(),
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      html_url: repo.html_url,
      clone_url: repo.clone_url,
      default_branch: repo.default_branch,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      updated_at: repo.updated_at,
      private: repo.private,
    }));

    return res.status(200).json(transformedRepos);

  } catch (error) {
    console.error('Error fetching user repositories:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
