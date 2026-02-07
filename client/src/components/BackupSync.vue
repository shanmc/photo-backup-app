<template>
  <div class="backup-sync">
    <div class="header">
      <h1>Photo Backup & Sync</h1>
      <p class="subtitle">Backup your photos safely to the cloud</p>
    </div>

    <div class="container">
      <div class="status-card">
        <div class="status-header">
          <h2>Backup Status</h2>
          <span :class="['status-badge', statusClass]">{{ statusText }}</span>
        </div>

        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">Total Files</div>
            <div class="stat-value">{{ backupStatus.totalFiles }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Completed</div>
            <div class="stat-value">{{ backupStatus.completedFiles }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Failed</div>
            <div class="stat-value error">{{ backupStatus.failedFiles }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Total Size</div>
            <div class="stat-value">{{ formatSize(backupStatus.totalSize) }}</div>
          </div>
        </div>

        <div class="progress-section" v-if="backupStatus.isRunning || backupStatus.totalFiles > 0">
          <div class="progress-header">
            <span class="progress-label">Progress</span>
            <span class="progress-percentage">{{ progressPercentage }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
          </div>
          <div class="progress-info">
            <span v-if="backupStatus.currentFile">
              Currently backing up: {{ backupStatus.currentFile }}
            </span>
            <span v-else-if="backupStatus.isRunning">
              Scanning for files...
            </span>
            <span v-else-if="backupStatus.completedFiles > 0">
              Backup completed
            </span>
          </div>
        </div>

        <div class="error-message" v-if="error">
          <p>{{ error }}</p>
        </div>

        <div class="action-buttons">
          <button
            v-if="!backupStatus.isRunning"
            @click="startBackup"
            class="btn-start"
            :disabled="loading"
          >
            {{ loading ? 'Starting...' : 'Start Backup' }}
          </button>
          <button
            v-if="backupStatus.isRunning"
            @click="stopBackup"
            class="btn-stop"
            :disabled="loading"
          >
            {{ loading ? 'Stopping...' : 'Stop Backup' }}
          </button>
          <button
            v-if="backupStatus.completedFiles > 0 && !backupStatus.isRunning"
            @click="resetBackup"
            class="btn-reset"
          >
            Reset
          </button>
        </div>
      </div>

      <div class="files-card" v-if="backupStatus.files.length > 0">
        <div class="files-header">
          <h3>Backup Files</h3>
          <span class="files-count">{{ backupStatus.files.length }} files</span>
        </div>
        <div class="files-list">
          <div
            v-for="file in backupStatus.files"
            :key="file.path"
            :class="['file-item', file.status]"
          >
            <div class="file-icon">
              <span v-if="file.status === 'completed'">✓</span>
              <span v-else-if="file.status === 'failed'">✗</span>
              <span v-else-if="file.status === 'inProgress'" class="spinner-small"></span>
              <span v-else>○</span>
            </div>
            <div class="file-details">
              <div class="file-name">{{ file.name }}</div>
              <div class="file-path">{{ file.path }}</div>
            </div>
            <div class="file-size">{{ formatSize(file.size) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BackupSync',
  data() {
    return {
      backupStatus: {
        isRunning: false,
        totalFiles: 0,
        completedFiles: 0,
        failedFiles: 0,
        totalSize: 0,
        currentFile: '',
        files: []
      },
      loading: false,
      error: null,
      statusPollInterval: null,
      apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000'
    }
  },
  computed: {
    progressPercentage() {
      if (this.backupStatus.totalFiles === 0) return 0
      return Math.round((this.backupStatus.completedFiles / this.backupStatus.totalFiles) * 100)
    },
    statusText() {
      if (this.backupStatus.isRunning) return 'Running'
      if (this.backupStatus.completedFiles > 0 && this.backupStatus.failedFiles === 0) return 'Completed'
      if (this.backupStatus.failedFiles > 0) return 'Completed with Errors'
      return 'Idle'
    },
    statusClass() {
      if (this.backupStatus.isRunning) return 'running'
      if (this.backupStatus.completedFiles > 0 && this.backupStatus.failedFiles === 0) return 'completed'
      if (this.backupStatus.failedFiles > 0) return 'error'
      return 'idle'
    }
  },
  mounted() {
    this.fetchStatus()
  },
  beforeUnmount() {
    this.stopPolling()
  },
  methods: {
    async startBackup() {
      this.loading = true
      this.error = null

      try {
        const response = await fetch(`${this.apiBaseUrl}/api/backup/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to start backup: ${response.statusText}`)
        }

        const data = await response.json()
        this.backupStatus = data
        this.startPolling()
      } catch (err) {
        console.error('Error starting backup:', err)
        this.error = err.message || 'Failed to start backup. Please make sure the server is running.'
      } finally {
        this.loading = false
      }
    },
    async stopBackup() {
      this.loading = true
      this.error = null

      try {
        const response = await fetch(`${this.apiBaseUrl}/api/backup/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to stop backup: ${response.statusText}`)
        }

        const data = await response.json()
        this.backupStatus = data
        this.stopPolling()
      } catch (err) {
        console.error('Error stopping backup:', err)
        this.error = err.message || 'Failed to stop backup.'
      } finally {
        this.loading = false
      }
    },
    async fetchStatus() {
      try {
        const response = await fetch(`${this.apiBaseUrl}/api/backup/status`)

        if (!response.ok) {
          throw new Error(`Failed to fetch status: ${response.statusText}`)
        }

        const data = await response.json()
        this.backupStatus = data

        // If backup is running, start polling
        if (data.isRunning && !this.statusPollInterval) {
          this.startPolling()
        }
      } catch (err) {
        console.error('Error fetching backup status:', err)
        this.error = err.message || 'Failed to fetch backup status.'
      }
    },
    resetBackup() {
      this.backupStatus = {
        isRunning: false,
        totalFiles: 0,
        completedFiles: 0,
        failedFiles: 0,
        totalSize: 0,
        currentFile: '',
        files: []
      }
      this.error = null
    },
    startPolling() {
      if (this.statusPollInterval) return
      this.statusPollInterval = setInterval(() => {
        this.fetchStatus()
      }, 1000) // Poll every second
    },
    stopPolling() {
      if (this.statusPollInterval) {
        clearInterval(this.statusPollInterval)
        this.statusPollInterval = null
      }
    },
    formatSize(bytes) {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
    }
  }
}
</script>

<style scoped>
.backup-sync {
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
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.status-card,
.files-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(102, 126, 234, 0.2);
}

.status-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.8rem;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
}

.status-badge.idle {
  background: rgba(149, 165, 166, 0.2);
  color: #95a5a6;
}

.status-badge.running {
  background: rgba(52, 152, 219, 0.2);
  color: #3498db;
  animation: pulse 2s ease-in-out infinite;
}

.status-badge.completed {
  background: rgba(39, 174, 96, 0.2);
  color: #27ae60;
}

.status-badge.error {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-item {
  background: rgba(102, 126, 234, 0.05);
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
}

.stat-label {
  font-size: 0.9rem;
  color: #7f8c8d;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  font-weight: 600;
}

.stat-value {
  font-size: 2rem;
  color: #2c3e50;
  font-weight: 700;
}

.stat-value.error {
  color: #e74c3c;
}

.progress-section {
  margin-bottom: 2rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.progress-label {
  font-weight: 600;
  color: #2c3e50;
}

.progress-percentage {
  font-weight: 700;
  color: #667eea;
}

.progress-bar {
  height: 24px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.5s ease;
  border-radius: 12px;
}

.progress-info {
  font-size: 0.9rem;
  color: #7f8c8d;
  font-style: italic;
}

.error-message {
  background: rgba(231, 76, 60, 0.1);
  border-left: 4px solid #e74c3c;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 4px;
}

.error-message p {
  margin: 0;
  color: #e74c3c;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-start,
.btn-stop,
.btn-reset {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-start {
  background: #27ae60;
  color: white;
}

.btn-start:hover:not(:disabled) {
  background: #229954;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
}

.btn-stop {
  background: #e74c3c;
  color: white;
}

.btn-stop:hover:not(:disabled) {
  background: #c0392b;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
}

.btn-reset {
  background: #95a5a6;
  color: white;
}

.btn-reset:hover {
  background: #7f8c8d;
  transform: translateY(-2px);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.files-card {
  max-height: 600px;
  display: flex;
  flex-direction: column;
}

.files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(102, 126, 234, 0.2);
}

.files-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.files-count {
  color: #667eea;
  font-weight: 600;
}

.files-list {
  overflow-y: auto;
  max-height: 450px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
  transition: background 0.2s ease;
  gap: 1rem;
}

.file-item:hover {
  background: rgba(102, 126, 234, 0.05);
}

.file-item.completed {
  opacity: 0.7;
}

.file-item.inProgress {
  background: rgba(52, 152, 219, 0.1);
  border-left: 3px solid #3498db;
}

.file-item.failed {
  background: rgba(231, 76, 60, 0.1);
  border-left: 3px solid #e74c3c;
}

.file-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.file-item.completed .file-icon {
  color: #27ae60;
}

.file-item.failed .file-icon {
  color: #e74c3c;
}

.file-item.inProgress .file-icon {
  color: #3498db;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(52, 152, 219, 0.2);
  border-top-color: #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.file-details {
  flex: 1;
  text-align: left;
}

.file-name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.file-path {
  font-size: 0.85rem;
  color: #7f8c8d;
}

.file-size {
  font-size: 0.9rem;
  color: #95a5a6;
  font-weight: 600;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .action-buttons {
    flex-direction: column;
  }

  .file-item {
    flex-wrap: wrap;
  }
}
</style>
