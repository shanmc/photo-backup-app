import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { readPhotosFromDirectory, getPhotoPath } from './services/photoService';
import { backupService } from './services/backupService';
import { scanService } from './services/scanService';

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

// Photo scan endpoints

// Start photo scan
app.post('/api/photos/scan', async (req: Request, res: Response) => {
  try {
    const { sourceDirectory = PHOTOS_DIR } = req.body;

    await scanService.startScan(sourceDirectory);

    const stats = scanService.getScanStats();
    res.json({
      message: 'Photo scan completed successfully',
      ...stats
    });
  } catch (error) {
    console.error('Error during photo scan:', error);
    res.status(500).json({
      error: 'Failed to scan photos',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get scan progress
app.get('/api/photos/scan/progress', (req: Request, res: Response) => {
  try {
    const progress = scanService.getScanProgress();
    res.json(progress);
  } catch (error) {
    console.error('Error getting scan progress:', error);
    res.status(500).json({
      error: 'Failed to get scan progress',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get scan statistics
app.get('/api/photos/scan/stats', (req: Request, res: Response) => {
  try {
    const stats = scanService.getScanStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting scan stats:', error);
    res.status(500).json({
      error: 'Failed to get scan stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Backup endpoints

// Start backup process
app.post('/api/backup/start', (req: Request, res: Response) => {
  try {
    const { destination = 's3', destinationPath } = req.body;

    // Validate destination
    if (destination !== 'local' && destination !== 's3') {
      return res.status(400).json({
        error: 'Invalid destination',
        message: 'Destination must be either "local" or "s3"'
      });
    }

    const status = backupService.startBackup(PHOTOS_DIR, destination, destinationPath);
    res.json(status);
  } catch (error) {
    console.error('Error starting backup:', error);
    res.status(500).json({
      error: 'Failed to start backup',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Stop backup process
app.post('/api/backup/stop', (req: Request, res: Response) => {
  try {
    const status = backupService.stopBackup();
    res.json(status);
  } catch (error) {
    console.error('Error stopping backup:', error);
    res.status(500).json({
      error: 'Failed to stop backup',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get backup status
app.get('/api/backup/status', (req: Request, res: Response) => {
  try {
    const status = backupService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting backup status:', error);
    res.status(500).json({
      error: 'Failed to get backup status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get backup history
app.get('/api/backup/history', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const history = backupService.getBackupHistory(limit);
    res.json(history);
  } catch (error) {
    console.error('Error getting backup history:', error);
    res.status(500).json({
      error: 'Failed to get backup history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get specific backup session details
app.get('/api/backup/session/:sessionId', (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);

    if (isNaN(sessionId)) {
      return res.status(400).json({
        error: 'Invalid session ID'
      });
    }

    const sessionDetails = backupService.getBackupSessionDetails(sessionId);

    if (!sessionDetails) {
      return res.status(404).json({
        error: 'Backup session not found'
      });
    }

    res.json(sessionDetails);
  } catch (error) {
    console.error('Error getting backup session details:', error);
    res.status(500).json({
      error: 'Failed to get backup session details',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default app;
