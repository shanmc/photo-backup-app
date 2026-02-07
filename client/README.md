# Photo Backup Client

Vue.js frontend application for the Photo Backup system.

## Features

- Modern, responsive UI with gradient design
- Home screen with feature highlights
- Photo library view with directory navigation
- Photo grid with thumbnails
- Real-time data fetching from backend API
- Loading and error states
- Mobile-friendly responsive design

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the client directory (see `.env.example`):

```env
VITE_API_URL=http://localhost:3000
```

**Note:** The API URL should point to your running backend server. By default, it's configured for `http://localhost:3000`.

## Development

```bash
npm run dev
```

The app will start on `http://localhost:5173` (or another port if 5173 is busy).

## Build

```bash
npm run build
```

The production-ready files will be in the `dist` directory.

## Preview Production Build

```bash
npm run preview
```

## Project Structure

```
client/
├── public/              # Static assets
├── src/
│   ├── components/      # Vue components
│   │   ├── HomeScreen.vue
│   │   └── ViewPhotos.vue
│   ├── App.vue         # Root component
│   ├── main.js         # Application entry point
│   └── style.css       # Global styles
├── index.html          # HTML template
└── vite.config.js      # Vite configuration
```

## Components

### HomeScreen
Landing page with:
- Application branding
- Feature cards showcasing key capabilities
- Navigation to photo library

### ViewPhotos
Photo library interface with:
- Directory sidebar for navigation
- Photo grid with thumbnails
- Photo metadata (name and date)
- Dynamic loading from server API
- Error handling and retry capability

## API Integration

The client fetches photo data from the backend API:

**Endpoint:** `GET /api/photos`

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
        "name": "photo.jpg",
        "date": "2025-01-15",
        "thumbnail": "/api/photos/thumbnail/1/photo.jpg"
      }
    ]
  }
}
```

Photo thumbnails are loaded from: `GET /api/photos/thumbnail/:folderId/:filename`

## Environment Variables

- `VITE_API_URL` - Backend API base URL (default: `http://localhost:3000`)

## Browser Support

Modern browsers with ES6+ support:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Troubleshooting

### API Connection Issues

If you see "Failed to load photos" errors:

1. Ensure the backend server is running on the configured port (default: 3000)
2. Check that `VITE_API_URL` in your `.env` file matches the server URL
3. Verify CORS is enabled on the backend
4. Check browser console for detailed error messages

### Port Already in Use

If port 5173 is busy, Vite will automatically use the next available port. Check the terminal output for the actual URL.
