import fs from 'fs';
import path from 'path';
import { databaseService } from './databaseService';

interface Photo {
  id: number;
  name: string;
  date: string;
  thumbnail: string;
}

interface Directory {
  id: number;
  name: string;
  photoCount: number;
}

interface PhotoData {
  selectedFolder: number;
  directories: Directory[];
  photosByFolder: { [key: string]: Photo[] };
}

const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

/**
 * Check if a file is an image based on its extension
 */
function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Get file modification date
 */
function getFileDate(filePath: string): string {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime.toISOString().split('T')[0]; // Return date in YYYY-MM-DD format
  } catch (error) {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Read photos from database and organize by subdirectories
 * Note: The database must be populated by running a scan first
 */
export function readPhotosFromDirectory(baseDir: string): PhotoData {
  try {
    // Get all directories from database
    const dbDirectories = databaseService.getAllPhotoDirectories();

    if (dbDirectories.length === 0) {
      console.warn('No directories found in database. Please run a photo scan first.');
      return {
        selectedFolder: 1,
        directories: [],
        photosByFolder: {}
      };
    }

    const directories: Directory[] = [];
    const photosByFolder: { [key: string]: Photo[] } = {};
    let photoIdCounter = 1;

    // Process each directory from database
    for (const dbDir of dbDirectories) {
      // Get all photos for this directory
      const dbPhotos = databaseService.getPhotosByDirectory(dbDir.id!);

      if (dbPhotos.length > 0) {
        directories.push({
          id: dbDir.id!,
          name: dbDir.name,
          photoCount: dbDir.photoCount
        });

        // Convert database photos to Photo interface format
        const photos: Photo[] = dbPhotos.map(dbPhoto => ({
          id: photoIdCounter++,
          name: dbPhoto.fileName,
          date: dbPhoto.dateModified.split('T')[0], // Convert to YYYY-MM-DD format
          thumbnail: `/api/photos/thumbnail/${dbDir.id}/${encodeURIComponent(dbPhoto.fileName)}`
        }));

        photosByFolder[dbDir.id!.toString()] = photos;
      }
    }

    return {
      selectedFolder: directories.length > 0 ? directories[0].id : 1,
      directories,
      photosByFolder
    };
  } catch (error) {
    console.error('Error reading photos from database:', error);
    return {
      selectedFolder: 1,
      directories: [],
      photosByFolder: {}
    };
  }
}

/**
 * Get the path to a specific photo from the database
 */
export function getPhotoPath(baseDir: string, folderId: number, filename: string, directories: Directory[]): string | null {
  try {
    // Get directory from database
    const dbDirectory = databaseService.getPhotoDirectory(folderId);
    if (!dbDirectory) {
      console.warn(`Directory with id ${folderId} not found in database`);
      return null;
    }

    // Construct the full file path
    const photoPath = path.join(baseDir, dbDirectory.path, filename);

    if (fs.existsSync(photoPath)) {
      return photoPath;
    }

    console.warn(`Photo file not found: ${photoPath}`);
    return null;
  } catch (error) {
    console.error('Error getting photo path:', error);
    return null;
  }
}
