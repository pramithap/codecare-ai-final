import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import type { Repository, CreateRepoRequest } from '../../types/repos';

// Temporary in-memory store while database is being set up
const repoStore = new Map<string, Repository[]>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get the user session
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userEmail = session.user.email;

  if (req.method === 'GET') {
    try {
      // Get repositories for the current user from memory store
      const repositories = repoStore.get(userEmail) || [];
      return res.status(200).json(repositories);
    } catch (error) {
      console.error('Error fetching repositories:', error);
      return res.status(200).json([]);
    }
  }

  if (req.method === 'POST') {
    try {
      const data: CreateRepoRequest = req.body;
      
      // Validate required fields
      if (!data.name || !data.provider || !data.defaultBranch) {
        return res.status(400).json({ 
          error: 'Name, provider, and default branch are required' 
        });
      }

      // Get user's repositories from memory store
      const userRepos = repoStore.get(userEmail) || [];

      // Check for duplicate names for this user
      const existingRepo = userRepos.find(repo => repo.name === data.name);

      if (existingRepo) {
        return res.status(409).json({ 
          error: 'A repository with this name already exists' 
        });
      }

      // Validate provider-specific requirements
      if (data.provider === 'github' && !data.remoteUrl) {
        return res.status(400).json({ 
          error: 'Remote URL is required for GitHub repositories' 
        });
      }

      if (data.provider === 'zip' && !data.uploadId) {
        return res.status(400).json({ 
          error: 'Upload ID is required for ZIP repositories' 
        });
      }

      // Create repository
      const repository: Repository = {
        id: `repo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: data.name,
        provider: data.provider,
        remoteUrl: data.remoteUrl || null,
        defaultBranch: data.defaultBranch,
        status: 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      userRepos.push(repository);
      repoStore.set(userEmail, userRepos);

      return res.status(201).json(repository);
    } catch (error) {
      console.error('Error creating repository:', error);
      return res.status(500).json({ error: 'Failed to create repository' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
