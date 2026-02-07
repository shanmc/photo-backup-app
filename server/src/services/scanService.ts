import fs from 'fs';
import path from 'path';
import { databaseService } from './databaseService';

interface ScanProgress {
  isScanning: boolean;
  totalDirectories: number;
  scannedDirectories: number;
  totalPhotos: number;
  currentDirectory: string;
  startTime?: string;
  endTime?: string;
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

class ScanService {
  private scanProgress: ScanProgress = {
    isScanning: false,
    totalDirectories: 0,
    scannedDirectories: 0,
    totalPhotos: 0,
    currentDirectory: ''
  };

  /**
   * Check if a file is an image based on extension
   */
  private isImageFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
  }

  /**
   * Recursively scan a directory and return all subdirectories with their photos
   */
  private scanDirectory(baseDir: string, relativePath: string = ''): Map<string, string[]> {
    const result = new Map<string, string[]>();
    const currentPath = path.join(baseDir, relativePath);

    try {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const relativeItemPath = path.join(relativePath, item);

        try {
          const stats = fs.statSync(itemPath);

          if (stats.isDirectory()) {
            // Recursively scan subdirectories
            const subResults = this.scanDirectory(baseDir, relativeItemPath);

            // Merge subdirectory results
            for (const [dir, photos] of subResults.entries()) {
              result.set(dir, photos);
            }
          } else if (stats.isFile() && this.isImageFile(item)) {
            // Add photo to current directory
            if (!result.has(relativePath)) {
              result.set(relativePath, []);
            }
            result.get(relativePath)!.push(item);
          }
        } catch (error) {
          console.error(`Error processing ${itemPath}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${currentPath}:`, error);
    }

    return result;
  }

  /**
   * Start scanning the photos directory and persist to database
   */
  public async startScan(sourceDirectory: string): Promise<void> {
    if (this.scanProgress.isScanning) {
      throw new Error('A scan is already in progress');
    }

    // Verify source directory exists
    if (!fs.existsSync(sourceDirectory)) {
      throw new Error(`Source directory does not exist: ${sourceDirectory}`);
    }

    this.scanProgress = {
      isScanning: true,
      totalDirectories: 0,
      scannedDirectories: 0,
      totalPhotos: 0,
      currentDirectory: '',
      startTime: new Date().toISOString()
    };

    try {
      console.log(`Starting photo scan of: ${sourceDirectory}`);

      // Scan the directory structure
      const directoryMap = this.scanDirectory(sourceDirectory);

      this.scanProgress.totalDirectories = directoryMap.size;
      console.log(`Found ${directoryMap.size} directories with photos`);

      // Clear existing photo data
      console.log('Clearing existing photo data...');
      databaseService.clearPhotoData();

      // Process each directory
      for (const [relativePath, photoFiles] of directoryMap.entries()) {
        this.scanProgress.currentDirectory = relativePath || '(root)';

        // Get directory name
        const dirName = relativePath ? path.basename(relativePath) : 'root';

        // Insert or update directory
        const directoryId = databaseService.upsertPhotoDirectory({
          name: dirName,
          path: relativePath,
          photoCount: photoFiles.length
        });

        console.log(`Processing directory: ${dirName} (${photoFiles.length} photos)`);

        // Prepare photo records for bulk insert
        const photos = photoFiles.map(fileName => {
          const fullPath = path.join(sourceDirectory, relativePath, fileName);
          const stats = fs.statSync(fullPath);

          return {
            directoryId,
            fileName,
            filePath: path.join(relativePath, fileName),
            fileSize: stats.size,
            dateModified: stats.mtime.toISOString()
          };
        });

        // Bulk insert photos
        if (photos.length > 0) {
          databaseService.bulkUpsertPhotos(photos);
          this.scanProgress.totalPhotos += photos.length;
        }

        this.scanProgress.scannedDirectories++;
      }

      this.scanProgress.endTime = new Date().toISOString();
      console.log(`Scan completed: ${this.scanProgress.totalPhotos} photos in ${this.scanProgress.totalDirectories} directories`);

    } catch (error) {
      console.error('Error during photo scan:', error);
      throw error;
    } finally {
      this.scanProgress.isScanning = false;
    }
  }

  /**
   * Get current scan progress
   */
  public getScanProgress(): ScanProgress {
    return { ...this.scanProgress };
  }

  /**
   * Get scan statistics
   */
  public getScanStats(): { totalDirectories: number; totalPhotos: number } {
    const directories = databaseService.getAllPhotoDirectories();
    const photos = databaseService.getAllPhotos();

    return {
      totalDirectories: directories.length,
      totalPhotos: photos.length
    };
  }
}

// Export a singleton instance
export const scanService = new ScanService();
