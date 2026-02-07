import fs from 'fs';
import path from 'path';

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
 * Read photos from a directory and organize by subdirectories
 */
export function readPhotosFromDirectory(baseDir: string): PhotoData {
  const directories: Directory[] = [];
  const photosByFolder: { [key: string]: Photo[] } = {};
  let photoIdCounter = 1;
  let folderIdCounter = 1;

  try {
    // Check if base directory exists
    if (!fs.existsSync(baseDir)) {
      console.warn(`Base directory does not exist: ${baseDir}`);
      return {
        selectedFolder: 1,
        directories: [],
        photosByFolder: {}
      };
    }

    // Read all entries in the base directory
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });

    // Process each subdirectory
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderPath = path.join(baseDir, entry.name);
        const folderId = folderIdCounter++;
        const photos: Photo[] = [];

        try {
          // Read files in the subdirectory
          const files = fs.readdirSync(folderPath);

          for (const file of files) {
            if (isImageFile(file)) {
              const filePath = path.join(folderPath, file);

              photos.push({
                id: photoIdCounter++,
                name: file,
                date: getFileDate(filePath),
                thumbnail: `/api/photos/thumbnail/${folderId}/${encodeURIComponent(file)}`
              });
            }
          }

          // Only add directories that contain photos
          if (photos.length > 0) {
            directories.push({
              id: folderId,
              name: entry.name,
              photoCount: photos.length
            });

            photosByFolder[folderId.toString()] = photos;
          }
        } catch (err) {
          console.error(`Error reading folder ${entry.name}:`, err);
        }
      }
    }

    return {
      selectedFolder: directories.length > 0 ? 1 : 0,
      directories,
      photosByFolder
    };
  } catch (error) {
    console.error('Error reading photos directory:', error);
    return {
      selectedFolder: 1,
      directories: [],
      photosByFolder: {}
    };
  }
}

/**
 * Get the path to a specific photo
 */
export function getPhotoPath(baseDir: string, folderId: number, filename: string, directories: Directory[]): string | null {
  try {
    const directory = directories.find(d => d.id === folderId);
    if (!directory) {
      return null;
    }

    const photoPath = path.join(baseDir, directory.name, filename);

    if (fs.existsSync(photoPath)) {
      return photoPath;
    }

    return null;
  } catch (error) {
    console.error('Error getting photo path:', error);
    return null;
  }
}
