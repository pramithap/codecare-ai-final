import { NextApiRequest, NextApiResponse } from 'next';
import { storeUserPAT, generateSessionId } from '../../../../lib/server/session';
import type { PATValidationResponse } from '../../../../types/repos';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pat } = req.body;

    if (!pat || typeof pat !== 'string') {
      return res.status(400).json({
        valid: false,
        error: 'Personal Access Token is required'
      });
    }

    // Validate PAT with GitHub API
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${pat}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'CodeCare-AI'
      }
    });

    if (!response.ok) {
      let errorMessage = 'Invalid token';
      
      if (response.status === 401) {
        errorMessage = 'Invalid token or token expired';
      } else if (response.status === 403) {
        errorMessage = 'Insufficient permissions. Ensure your token has repo access.';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      }

      return res.status(response.status).json({
        valid: false,
        error: errorMessage
      });
    }

    const user = await response.json();
    
    // Check token scopes
    const scopesHeader = response.headers.get('X-OAuth-Scopes');
    const scopes = scopesHeader ? scopesHeader.split(', ') : [];

    // For demo purposes, store PAT in session
    // TODO: In production, use secure session management and encrypt tokens
    const sessionId = generateSessionId();
    storeUserPAT(sessionId, pat, user.login);

    // Set session cookie
    res.setHeader('Set-Cookie', 
      `github-session=${sessionId}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );

    const validationResponse: PATValidationResponse = {
      valid: true,
      user: {
        login: user.login,
        name: user.name || user.login,
        avatar_url: user.avatar_url
      },
      scopes
    };

    return res.status(200).json(validationResponse);

  } catch (error) {
    console.error('GitHub validation error:', error);
    return res.status(500).json({
      valid: false,
      error: 'Failed to validate token'
    });
  }
}
