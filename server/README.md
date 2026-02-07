# Photo Backup Server

Node.js Express API server for the Photo Backup application, built with TypeScript.

## Features

- RESTful API for photo management
- Reads photos from local directory structure
- Serves photo thumbnails
- CORS enabled for frontend integration
- TypeScript for type safety

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the server directory (see `.env.example`):

```env
PORT=3000
NODE_ENV=development
PHOTOS_DIR=/path/to/your/photos  # Optional: defaults to ./sample-photos
```

## Development

```bash
npm run dev
```

The server will start with hot-reloading enabled on `http://localhost:3000`

## Build

```bash
npm run build
```

## Production

```bash
npm start
```

## API Endpoints

### GET `/`
Returns API information and status.

**Response:**
```json
{
  "message": "Photo Backup API",
  "version": "1.0.0",
  "status": "running"
}
```

### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-02-05T20:17:00.000Z"
}
```

### GET `/api/photos`
Retrieves photos organized by directory from the configured photos directory.

**Response Format:**
```json
{
  "selectedFolder": 1,
  "directories": [
    {
      "id": 1,
      "name": "Vacation 2025",
      "photoCount": 24
    }
  ],
  "photosByFolder": {
    "1": [
      {
        "id": 1,
        "name": "beach-sunset.jpg",
        "date": "2025-01-15",
        "thumbnail": "/api/photos/thumbnail/1/beach-sunset.jpg"
      }
    ]
  }
}
```

### GET `/api/photos/thumbnail/:folderId/:filename`
Serves a specific photo file.

**Parameters:**
- `folderId` - The ID of the folder/directory
- `filename` - The name of the photo file (URL encoded)

**Example:**
```
GET /api/photos/thumbnail/1/beach-sunset.jpg
```

## Photos Directory Structure

The API expects photos to be organized in subdirectories:

```
photos/
├── Vacation 2025/
│   ├── photo1.jpg
│   └── photo2.png
├── Family Photos/
│   └── family.jpg
└── Work Events/
    └── event.jpg
```

Each subdirectory becomes a photo album/folder in the API response.

## Supported Image Formats

- `.jpg`, `.jpeg`
- `.png`
- `.gif`
- `.webp`
- `.bmp`

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `404` - Resource not found
- `500` - Server error

Error responses include a descriptive message:
```json
{
  "error": "Error description",
  "message": "Detailed error message"
}
```
