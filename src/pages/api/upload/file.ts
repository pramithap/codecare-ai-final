import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { uploadId } = req.query;

    if (!uploadId) {
      return res.status(400).json({ error: 'Upload ID is required' });
    }

    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      return res.status(413).json({ 
        error: `File size exceeds maximum limit of ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB` 
      });
    }

    // Read the raw body data
    const chunks: Buffer[] = [];
    
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);

        if (buffer.length > MAX_FILE_SIZE) {
          return res.status(413).json({ 
            error: `File size exceeds maximum limit of ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB` 
          });
        }

        // Ensure upload directory exists
        const uploadDir = join(process.cwd(), 'tmp', 'uploads');
        try {
          await mkdir(uploadDir, { recursive: true });
        } catch (error) {
          // Directory might already exist, ignore error
        }

        // Save file to temporary location
        // TODO: In production, upload to S3 or similar cloud storage
        const filePath = join(uploadDir, `${uploadId}.zip`);
        await writeFile(filePath, buffer);

        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('File save error:', error);
        return res.status(500).json({ error: 'Failed to save file' });
      }
    });

    req.on('error', (error) => {
      console.error('Upload error:', error);
      return res.status(500).json({ error: 'Upload failed' });
    });

  } catch (error) {
    console.error('File upload error:', error);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
}
