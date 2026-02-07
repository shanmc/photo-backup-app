<template>
  <div class="view-photos">
    <div class="header">
      <h1>Photo Library</h1>
      <p class="subtitle">Browse your photos by directory</p>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading photos...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p class="error-message">{{ error }}</p>
      <button @click="fetchPhotos" class="retry-btn">Retry</button>
    </div>

    <div v-else class="container">
      <div class="directory-tree">
        <div class="tree-header">
          <h3>Directories</h3>
        </div>
        <div class="tree-content">
          <div
            v-for="folder in directories"
            :key="folder.id"
            class="folder-item"
            :class="{ active: selectedFolder === folder.id }"
            @click="selectFolder(folder.id)"
          >
            <span class="folder-icon">📁</span>
            <span class="folder-name">{{ folder.name }}</span>
            <span class="photo-count">{{ folder.photoCount }}</span>
          </div>
        </div>
      </div>

      <div class="photo-grid-container">
        <div class="grid-header">
          <h3>{{ currentFolderName }}</h3>
          <span class="grid-count">{{ currentPhotos.length }} photos</span>
        </div>
        <div class="photo-grid">
          <div
            v-for="photo in currentPhotos"
            :key="photo.id"
            class="photo-card"
          >
            <div class="photo-thumbnail">
              <img :src="photo.thumbnail" :alt="photo.name">
            </div>
            <div class="photo-info">
              <p class="photo-name">{{ photo.name }}</p>
              <p class="photo-date">{{ photo.date }}</p>
            </div>
          </div>
        </div>
        <div v-if="currentPhotos.length === 0" class="empty-state">
          <p>No photos in this directory</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ViewPhotos',
  data() {
    return {
      selectedFolder: 1,
      directories: [],
      photosByFolder: {},
      loading: true,
      error: null,
      apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000'
    }
  },
  computed: {
    currentPhotos() {
      return this.photosByFolder[this.selectedFolder] || []
    },
    currentFolderName() {
      const folder = this.directories.find(f => f.id === this.selectedFolder)
      return folder ? folder.name : 'Select a folder'
    }
  },
  mounted() {
    this.fetchPhotos()
  },
  methods: {
    async fetchPhotos() {
      this.loading = true
      this.error = null

      try {
        const response = await fetch(`${this.apiBaseUrl}/api/photos`)

        if (!response.ok) {
          throw new Error(`Failed to fetch photos: ${response.statusText}`)
        }

        const data = await response.json()

        // Update component state with fetched data
        this.directories = data.directories || []
        this.photosByFolder = data.photosByFolder || {}
        this.selectedFolder = data.selectedFolder || (this.directories.length > 0 ? this.directories[0].id : 1)

        // Update thumbnail URLs to use the server
        Object.keys(this.photosByFolder).forEach(folderId => {
          this.photosByFolder[folderId] = this.photosByFolder[folderId].map(photo => ({
            ...photo,
            thumbnail: `${this.apiBaseUrl}${photo.thumbnail}`
          }))
        })
      } catch (err) {
        console.error('Error fetching photos:', err)
        this.error = err.message || 'Failed to load photos. Please make sure the server is running.'
      } finally {
        this.loading = false
      }
    },
    selectFolder(folderId) {
      this.selectedFolder = folderId
    }
  }
}
</script>

<style scoped>
.view-photos {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.header {
  text-align: center;
  color: white;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.2rem;
  opacity: 0.9;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
  align-items: start;
}

.directory-tree {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 2rem;
}

.tree-header {
  padding: 1.5rem;
  background: rgba(102, 126, 234, 0.1);
  border-bottom: 1px solid rgba(102, 126, 234, 0.2);
}

.tree-header h3 {
  margin: 0;
  color: #667eea;
  font-size: 1.1rem;
}

.tree-content {
  padding: 0.5rem;
}

.folder-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  margin: 0.25rem 0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 0.75rem;
}

.folder-item:hover {
  background: rgba(102, 126, 234, 0.1);
}

.folder-item.active {
  background: rgba(102, 126, 234, 0.2);
  font-weight: 600;
}

.folder-icon {
  font-size: 1.2rem;
}

.folder-name {
  flex: 1;
  text-align: left;
  color: #2c3e50;
}

.photo-count {
  background: rgba(102, 126, 234, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.85rem;
  color: #667eea;
  font-weight: 600;
}

.photo-grid-container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  min-height: 500px;
}

.grid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(102, 126, 234, 0.2);
}

.grid-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.grid-count {
  color: #667eea;
  font-weight: 600;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.photo-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.photo-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.photo-thumbnail {
  width: 100%;
  height: 180px;
  overflow: hidden;
  background: #f0f0f0;
}

.photo-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-info {
  padding: 1rem;
}

.photo-name {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.photo-date {
  margin: 0;
  color: #7f8c8d;
  font-size: 0.85rem;
}

.empty-state {
  text-align: center;
  padding: 4rem;
  color: #95a5a6;
  font-size: 1.2rem;
}

.loading-state,
.error-state {
  max-width: 600px;
  margin: 4rem auto;
  text-align: center;
  background: rgba(255, 255, 255, 0.95);
  padding: 3rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.loading-state {
  color: #667eea;
}

.loading-state p {
  margin-top: 1.5rem;
  font-size: 1.2rem;
  font-weight: 600;
}

.spinner {
  width: 60px;
  height: 60px;
  margin: 0 auto;
  border: 4px solid rgba(102, 126, 234, 0.2);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-state {
  color: #e74c3c;
}

.error-message {
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
}

.retry-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  background: #5568d3;
  transform: translateY(-2px);
}

@media (max-width: 968px) {
  .container {
    grid-template-columns: 1fr;
  }

  .directory-tree {
    position: relative;
    top: 0;
  }

  .photo-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}
</style>
