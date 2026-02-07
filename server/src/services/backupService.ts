import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface BackupFile {
  path: string;
  name: string;
  size: number;
  status: 'pending' | 'inProgress' | 'completed' | 'failed';
}

interface BackupStatus {
  isRunning: boolean;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  totalSize: number;
  currentFile: string;
  files: BackupFile[];
}

const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

class BackupService {
  private backupStatus: BackupStatus;
  private backupInterval: NodeJS.Timeout | null = null;
  private currentIndex: number = 0;
  private sourceDirectory: string = '';
  private s3Client: S3Client;

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
      return true;
    } catch (error) {
      console.error(`Error uploading ${file.name} to S3:`, error);
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

    try {
      const success = await this.backupSingleFile(file);

      if (success) {
        file.status = 'completed';
        this.backupStatus.completedFiles++;
      } else {
        file.status = 'failed';
        this.backupStatus.failedFiles++;
      }
    } catch (error) {
      console.error(`Error backing up file ${file.name}:`, error);
      file.status = 'failed';
      this.backupStatus.failedFiles++;
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

    // Initialize backup status
    this.backupStatus = {
      isRunning: true,
      totalFiles: files.length,
      completedFiles: 0,
      failedFiles: 0,
      totalSize,
      currentFile: '',
      files
    };

    this.currentIndex = 0;

    // Start processing files
    if (files.length > 0) {
      this.processNextFile();
    } else {
      this.backupStatus.isRunning = false;
    }

    return this.backupStatus;
  }

  /**
   * Stop the backup process
   */
  public stopBackup(): BackupStatus {
    this.backupStatus.isRunning = false;
    this.backupStatus.currentFile = '';

    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
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
  }
}

// Export a singleton instance
export const backupService = new BackupService();
