import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

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
  owner: {
    login: string;
    avatar_url: string;
    type: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get session from NextAuth.js
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(200).json({
        repositories: [],
        message: 'Please sign in with GitHub to view your repositories.',
        setup_required: true,
        empty_state: true
      });
    }

    // Get GitHub access token from session (we need to modify NextAuth config to include this)
    let githubToken = (session as any).accessToken;
    
    // Fallback: Check if GitHub token is provided in the request headers
    if (!githubToken) {
      githubToken = req.headers['x-github-token'] as string || 
                   req.body?.githubToken ||
                   (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
    }

    if (!githubToken) {
      // User is signed in but may not have GitHub connected or token not available
      return res.status(200).json({
        repositories: [],
        message: 'GitHub repositories will appear here automatically when you sign in with GitHub.',
        setup_required: false,
        empty_state: true
      });
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
      
      if (githubResponse.status === 401) {
        return res.status(401).json({ 
          error: 'GitHub authentication failed. Please reconnect your GitHub account.' 
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to fetch repositories from GitHub. Please try again later.' 
      });
    }

    const githubRepos: GitHubRepo[] = await githubResponse.json();

    // Transform GitHub repos to our format
    const repositories = githubRepos.map(repo => ({
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
      owner: repo.owner,
    }));

    return res.status(200).json({ repositories });

  } catch (error) {
    console.error('Error fetching user repositories:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
