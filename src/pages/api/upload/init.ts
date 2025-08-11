import { NextApiRequest, NextApiResponse } from 'next';
import type { UploadInitResponse } from '../../../types/repos';

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName, fileSize } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'File name is required' });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return res.status(400).json({ 
        error: `File size exceeds maximum limit of ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB` 
      });
    }

    // Generate unique upload ID
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // For demo: create mock presigned URL
    // TODO: In production, integrate with AWS S3 or similar service for presigned URLs
    const mockUploadUrl = `/api/upload/file?uploadId=${uploadId}`;

    const response: UploadInitResponse = {
      uploadUrl: mockUploadUrl,
      uploadId,
      maxSizeBytes: MAX_FILE_SIZE
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Upload init error:', error);
    return res.status(500).json({ error: 'Failed to initialize upload' });
  }
}
