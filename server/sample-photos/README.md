# Sample Photos Directory

This directory contains sample photo folders for the Photo Backup API.

## Structure

The API expects photos to be organized in subdirectories:

```
sample-photos/
├── Vacation 2025/
│   ├── photo1.jpg
│   └── photo2.png
├── Family Photos/
│   └── family.jpg
└── Work Events/
    └── event.jpg
```

## Supported Image Formats

- `.jpg`, `.jpeg`
- `.png`
- `.gif`
- `.webp`
- `.bmp`

## Configuration

To use a different directory for photos, set the `PHOTOS_DIR` environment variable in your `.env` file:

```
PHOTOS_DIR=/path/to/your/photos
```

If not set, the API will default to this `sample-photos` directory.

## Adding Photos

1. Create subdirectories within this folder (each subdirectory becomes a photo album)
2. Add image files to the subdirectories
3. Restart the server or call the `/api/photos` endpoint to see your photos
