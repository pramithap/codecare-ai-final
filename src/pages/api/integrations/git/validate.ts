import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getProviderAPI } from '../../../../lib/gitProviders';

const validateTokenSchema = z.object({
  provider: z.enum(['github', 'gitlab', 'bitbucket', 'azure']),
  token: z.string().min(1, 'Token is required'),
  username: z.string().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { provider, token, username } = validateTokenSchema.parse(req.body);

    const providerAPI = getProviderAPI(provider);
    const result = await providerAPI.validateToken(token, username);

    if (result.valid) {
      res.status(200).json({
        valid: true,
        user: result.user,
      });
    } else {
      res.status(400).json({
        valid: false,
        error: result.error || 'Invalid token',
      });
    }
  } catch (error) {
    console.error('Token validation error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        valid: false,
        error: error.errors.map(e => e.message).join(', '),
      });
    }

    res.status(500).json({
      valid: false,
      error: 'Internal server error',
    });
  }
}
