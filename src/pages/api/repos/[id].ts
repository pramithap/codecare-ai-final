import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import type { Repository, UpdateRepoRequest } from '../../../types/repos';

// Use the same in-memory store as repos.ts
const repoStore = new Map<string, Repository[]>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid repository ID' });
  }

  // Get the user session
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userEmail = session.user.email;

  if (req.method === 'PATCH') {
    try {
      const data: UpdateRepoRequest = req.body;

      // Get user's repositories from memory store
      const userRepos = repoStore.get(userEmail) || [];
      const repoIndex = userRepos.findIndex(repo => repo.id === id);

      if (repoIndex === -1) {
        return res.status(404).json({ error: 'Repository not found' });
      }

      // Validate branch name if provided
      if (data.defaultBranch && !data.defaultBranch.trim()) {
        return res.status(400).json({ error: 'Default branch cannot be empty' });
      }

      // Update the repository
      const updatedRepo: Repository = {
        ...userRepos[repoIndex],
        ...data,
        lastScanAt: data.lastScanAt || userRepos[repoIndex].lastScanAt,
        updatedAt: new Date().toISOString(),
      };

      userRepos[repoIndex] = updatedRepo;
      repoStore.set(userEmail, userRepos);

      return res.status(200).json(updatedRepo);
    } catch (error) {
      console.error('Error updating repository:', error);
      return res.status(500).json({ error: 'Failed to update repository' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Get user's repositories from memory store
      const userRepos = repoStore.get(userEmail) || [];
      const repoIndex = userRepos.findIndex(repo => repo.id === id);
      
      if (repoIndex === -1) {
        return res.status(404).json({ error: 'Repository not found' });
      }

      // Delete the repository from the array
      userRepos.splice(repoIndex, 1);
      repoStore.set(userEmail, userRepos);

      return res.status(204).end();
    } catch (error) {
      console.error('Error deleting repository:', error);
      return res.status(500).json({ error: 'Failed to delete repository' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
