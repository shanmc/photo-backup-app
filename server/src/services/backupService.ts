import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { databaseService } from './databaseService';

interface BackupFile {
  path: string;
  name: string;
  size: number;
  status: 'pending' | 'inProgress' | 'completed' | 'failed';
  dbId?: number;
}

interface BackupStatus {
  isRunning: boolean;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  totalSize: number;
  currentFile: string;
  files: BackupFile[];
  sessionId?: number;
}

const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

class BackupService {
  private backupStatus: BackupStatus;
  private backupInterval: NodeJS.Timeout | null = null;
  private currentIndex: number = 0;
  private sourceDirectory: string = '';
  private s3Client: S3Client;
  private currentSessionId: number | null = null;

  constructor() {
    this.backupStatus = {
      isRunning: false,
      totalFiles: 0,
      completedFiles: 0,
      failedFiles: 0,
      totalSize: 0,
      currentFile: '',
      files: []
    };

    // Initialize S3 client with credentials from environment variables
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || '',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });
  }

  /**
   * Check if a file is an image based on its extension
   */
  private isImageFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
  }

  /**
   * Recursively scan a directory for all image files
   */
  private scanDirectory(dirPath: string, baseDir: string): BackupFile[] {
    const files: BackupFile[] = [];

    try {
      if (!fs.existsSync(dirPath)) {
        return files;
      }

      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          files.push(...this.scanDirectory(fullPath, baseDir));
        } else if (entry.isFile() && this.isImageFile(entry.name)) {
          try {
            const stats = fs.statSync(fullPath);
            const relativePath = path.relative(baseDir, fullPath);

            files.push({
              path: relativePath,
              name: entry.name,
              size: stats.size,
              status: 'pending'
            });
          } catch (error) {
            console.error(`Error reading file stats for ${entry.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }

    return files;
  }

  /**
   * Upload a single file to AWS S3
   */
  private async backupSingleFile(file: BackupFile): Promise<boolean> {
    try {
      const bucketName = process.env.AWS_S3_BUCKET_NAME;

      if (!bucketName) {
        console.error('AWS_S3_BUCKET_NAME environment variable is not set');
        return false;
      }

      // Construct the full file path
      const fullPath = path.join(this.sourceDirectory, file.path);

      // Read the file from disk
      const fileContent = fs.readFileSync(fullPath);

      // Determine content type based on file extension
      const ext = path.extname(file.name).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp'
      };

      const contentType = contentTypeMap[ext] || 'application/octet-stream';

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: file.path, // Use the relative path as the S3 key
        Body: fileContent,
        ContentType: contentType
      });

      await this.s3Client.send(command);

      console.log(`Successfully uploaded ${file.name} to S3`);

      // Update database with successful upload
      if (file.dbId) {
        databaseService.updateFileUpload(file.dbId, {
          status: 'completed',
          uploadTime: new Date().toISOString()
        });
      }

      return true;
    } catch (error) {
      console.error(`Error uploading ${file.name} to S3:`, error);

      // Update database with failed upload
      if (file.dbId) {
        databaseService.updateFileUpload(file.dbId, {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      return false;
    }
  }

  /**
   * Process the next file in the backup queue
   */
  private async processNextFile(): Promise<void> {
    if (!this.backupStatus.isRunning || this.currentIndex >= this.backupStatus.files.length) {
      this.stopBackup();
      return;
    }

    const file = this.backupStatus.files[this.currentIndex];
    file.status = 'inProgress';
    this.backupStatus.currentFile = file.name;

    // Update file status in database
    if (file.dbId) {
      databaseService.updateFileUpload(file.dbId, {
        status: 'inProgress'
      });
    }

    try {
      const success = await this.backupSingleFile(file);

      if (success) {
        file.status = 'completed';
        this.backupStatus.completedFiles++;
      } else {
        file.status = 'failed';
        this.backupStatus.failedFiles++;
      }

      // Update session progress in database
      if (this.currentSessionId) {
        databaseService.updateBackupSession(this.currentSessionId, {
          completedFiles: this.backupStatus.completedFiles,
          failedFiles: this.backupStatus.failedFiles
        });
      }
    } catch (error) {
      console.error(`Error backing up file ${file.name}:`, error);
      file.status = 'failed';
      this.backupStatus.failedFiles++;

      // Update session with failed file count
      if (this.currentSessionId) {
        databaseService.updateBackupSession(this.currentSessionId, {
          failedFiles: this.backupStatus.failedFiles
        });
      }
    }

    this.currentIndex++;

    // Process next file
    if (this.backupStatus.isRunning && this.currentIndex < this.backupStatus.files.length) {
      this.processNextFile();
    } else {
      this.stopBackup();
    }
  }

  /**
   * Start the backup process
   */
  public startBackup(sourceDir: string): BackupStatus {
    if (this.backupStatus.isRunning) {
      return this.backupStatus;
    }

    // Store the source directory for later use
    this.sourceDirectory = sourceDir;

    // Scan directory for files
    const files = this.scanDirectory(sourceDir, sourceDir);

    // Calculate total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    // Create backup session in database
    const sessionId = databaseService.createBackupSession({
      startTime: new Date().toISOString(),
      status: 'running',
      totalFiles: files.length,
      completedFiles: 0,
      failedFiles: 0,
      totalSize,
      sourceDirectory: sourceDir
    });

    this.currentSessionId = sessionId;

    // Create file upload records in database
    const fileUploads = files.map(file => ({
      sessionId,
      filePath: file.path,
      fileName: file.name,
      fileSize: file.size,
      status: 'pending' as const
    }));

    databaseService.bulkCreateFileUploads(fileUploads);

    // Get the created file records with their IDs
    const createdFiles = databaseService.getFileUploadsBySession(sessionId);

    // Map database IDs back to our files
    files.forEach((file) => {
      const dbFile = createdFiles.find(f => f.filePath === file.path);
      if (dbFile) {
        file.dbId = dbFile.id;
      }
    });

    // Initialize backup status
    this.backupStatus = {
      isRunning: true,
      totalFiles: files.length,
      completedFiles: 0,
      failedFiles: 0,
      totalSize,
      currentFile: '',
      files,
      sessionId
    };

    this.currentIndex = 0;

    // Start processing files
    if (files.length > 0) {
      this.processNextFile();
    } else {
      this.backupStatus.isRunning = false;
      // Update session as completed if no files
      databaseService.updateBackupSession(sessionId, {
        status: 'completed',
        endTime: new Date().toISOString()
      });
    }

    return this.backupStatus;
  }

  /**
   * Stop the backup process
   */
  public stopBackup(): BackupStatus {
    const wasRunning = this.backupStatus.isRunning;
    this.backupStatus.isRunning = false;
    this.backupStatus.currentFile = '';

    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }

    // Update backup session in database
    if (this.currentSessionId && wasRunning) {
      const status = this.currentIndex >= this.backupStatus.files.length ? 'completed' : 'stopped';
      databaseService.updateBackupSession(this.currentSessionId, {
        status,
        endTime: new Date().toISOString()
      });
      this.currentSessionId = null;
    }

    return this.backupStatus;
  }

  /**
   * Get current backup status
   */
  public getStatus(): BackupStatus {
    return this.backupStatus;
  }

  /**
   * Reset backup status
   */
  public resetStatus(): void {
    this.stopBackup();
    this.backupStatus = {
      isRunning: false,
      totalFiles: 0,
      completedFiles: 0,
      failedFiles: 0,
      totalSize: 0,
      currentFile: '',
      files: []
    };
    this.currentIndex = 0;
    this.currentSessionId = null;
  }

  /**
   * Get backup history from database
   */
  public getBackupHistory(limit: number = 50) {
    return databaseService.getAllBackupSessions(limit);
  }

  /**
   * Get a specific backup session with its files
   */
  public getBackupSessionDetails(sessionId: number) {
    const session = databaseService.getBackupSession(sessionId);
    if (!session) {
      return null;
    }

    const files = databaseService.getFileUploadsBySession(sessionId);
    return {
      ...session,
      files
    };
  }
}

// Export a singleton instance
export const backupService = new BackupService();
