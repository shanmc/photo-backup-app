import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { readPhotosFromDirectory, getPhotoPath } from './services/photoService';

const app: Express = express();

// Photos directory - configurable via environment variable
const PHOTOS_DIR = process.env.PHOTOS_DIR || path.join(__dirname, '../sample-photos');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Photo Backup API',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Get photos from local directory
app.get('/api/photos', (req: Request, res: Response) => {
  try {
    const photoData = readPhotosFromDirectory(PHOTOS_DIR);
    res.json(photoData);
  } catch (error) {
    console.error('Error reading photos:', error);
    res.status(500).json({
      error: 'Failed to read photos',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Serve photo thumbnails
app.get('/api/photos/thumbnail/:folderId/:filename', (req: Request, res: Response) => {
  try {
    const folderId = parseInt(req.params.folderId, 10);
    const filename = decodeURIComponent(req.params.filename);

    // Get photo data to find directory names
    const photoData = readPhotosFromDirectory(PHOTOS_DIR);
    const photoPath = getPhotoPath(PHOTOS_DIR, folderId, filename, photoData.directories);

    if (!photoPath || !fs.existsSync(photoPath)) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Send the image file
    res.sendFile(photoPath);
  } catch (error) {
    console.error('Error serving photo:', error);
    res.status(500).json({
      error: 'Failed to serve photo',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default app;
