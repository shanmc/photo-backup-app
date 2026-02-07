import fs from 'fs';
import path from 'path';

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
   * Simulate backing up a single file
   * In a real application, this would upload the file to cloud storage
   */
  private async backupSingleFile(file: BackupFile): Promise<boolean> {
    return new Promise((resolve) => {
      // Simulate network delay and upload time based on file size
      const uploadTime = Math.min(500 + Math.random() * 1000, 2000);

      setTimeout(() => {
        // Simulate 95% success rate
        const success = Math.random() > 0.05;
        resolve(success);
      }, uploadTime);
    });
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
