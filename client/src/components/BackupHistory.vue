<template>
  <div class="backup-history">
    <div class="container">
      <div class="history-card">
        <div class="card-header">
          <h2>Backup Sessions</h2>
          <button @click="refreshHistory" class="btn-refresh" :disabled="loading">
            {{ loading ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>

        <div class="error-message" v-if="error">
          <p>{{ error }}</p>
        </div>

        <div v-if="loading && sessions.length === 0" class="loading-state">
          <div class="spinner"></div>
          <p>Loading backup history...</p>
        </div>

        <div v-else-if="sessions.length === 0" class="empty-state">
          <p>No backup sessions found</p>
          <p class="empty-hint">Start a backup to see it appear here</p>
        </div>

        <div v-else class="sessions-list">
          <div
            v-for="session in sessions"
            :key="session.id"
            :class="['session-item', session.status]"
            @click="viewSessionDetails(session.id)"
          >
            <div class="session-header">
              <div class="session-info">
                <h3>Session #{{ session.id }}</h3>
                <div class="session-time">
                  <span class="time-label">Started:</span>
                  <span>{{ formatDateTime(session.startTime) }}</span>
                </div>
                <div class="session-time" v-if="session.endTime">
                  <span class="time-label">Ended:</span>
                  <span>{{ formatDateTime(session.endTime) }}</span>
                </div>
              </div>
              <span :class="['status-badge', session.status]">{{ formatStatus(session.status) }}</span>
            </div>

            <div class="session-stats">
              <div class="stat">
                <span class="stat-label">Total Files</span>
                <span class="stat-value">{{ session.totalFiles }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Completed</span>
                <span class="stat-value success">{{ session.completedFiles }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Failed</span>
                <span class="stat-value error">{{ session.failedFiles }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Total Size</span>
                <span class="stat-value">{{ formatSize(session.totalSize) }}</span>
              </div>
            </div>

            <div class="session-footer">
              <div class="session-info-grid">
                <div class="session-path">
                  <span class="path-label">Source:</span>
                  <span class="path-value">{{ session.sourceDirectory }}</span>
                </div>
                <div class="session-destination">
                  <span class="path-label">Destination:</span>
                  <span :class="['destination-badge', session.destination]">
                    {{ session.destination === 's3' ? 'AWS S3' : 'Local Directory' }}
                  </span>
                  <span v-if="session.destination === 'local' && session.destinationPath" class="path-value">
                    {{ session.destinationPath }}
                  </span>
                </div>
              </div>
              <button
                @click.stop="viewSessionDetails(session.id)"
                class="btn-details"
              >
                View Details →
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Session Details Modal -->
      <div v-if="selectedSession" class="modal-overlay" @click="closeSessionDetails">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>Session #{{ selectedSession.id }} Details</h2>
            <button @click="closeSessionDetails" class="btn-close">×</button>
          </div>

          <div class="modal-body">
            <div class="session-summary">
              <div class="summary-item">
                <span class="summary-label">Status:</span>
                <span :class="['status-badge', selectedSession.status]">
                  {{ formatStatus(selectedSession.status) }}
                </span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Started:</span>
                <span>{{ formatDateTime(selectedSession.startTime) }}</span>
              </div>
              <div class="summary-item" v-if="selectedSession.endTime">
                <span class="summary-label">Ended:</span>
                <span>{{ formatDateTime(selectedSession.endTime) }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Duration:</span>
                <span>{{ calculateDuration(selectedSession.startTime, selectedSession.endTime) }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Source Directory:</span>
                <span>{{ selectedSession.sourceDirectory }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Backup Destination:</span>
                <span :class="['destination-badge', selectedSession.destination]">
                  {{ selectedSession.destination === 's3' ? 'AWS S3' : 'Local Directory' }}
                </span>
              </div>
              <div class="summary-item" v-if="selectedSession.destination === 'local' && selectedSession.destinationPath">
                <span class="summary-label">Destination Path:</span>
                <span>{{ selectedSession.destinationPath }}</span>
              </div>
            </div>

            <div class="files-section">
              <h3>Files ({{ selectedSession.files.length }})</h3>
              <div class="files-list">
                <div
                  v-for="file in selectedSession.files"
                  :key="file.id"
                  :class="['file-item', file.status]"
                >
                  <div class="file-icon">
                    <span v-if="file.status === 'completed'">✓</span>
                    <span v-else-if="file.status === 'failed'">✗</span>
                    <span v-else-if="file.status === 'inProgress'">⟳</span>
                    <span v-else>○</span>
                  </div>
                  <div class="file-details">
                    <div class="file-name">{{ file.fileName }}</div>
                    <div class="file-path">{{ file.filePath }}</div>
                    <div class="file-meta">
                      <span class="file-size">{{ formatSize(file.fileSize) }}</span>
                      <span v-if="file.uploadTime" class="file-time">
                        Uploaded: {{ formatDateTime(file.uploadTime) }}
                      </span>
                      <span v-if="file.errorMessage" class="file-error">
                        Error: {{ file.errorMessage }}
                      </span>
                    </div>
                  </div>
                  <span :class="['file-status', file.status]">{{ file.status }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BackupHistory',
  data() {
    return {
      sessions: [],
      selectedSession: null,
      loading: false,
      error: null,
      apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000'
    }
  },
  mounted() {
    this.fetchHistory()
  },
  methods: {
    async fetchHistory() {
      this.loading = true
      this.error = null

      try {
        const response = await fetch(`${this.apiBaseUrl}/api/backup/history?limit=50`)

        if (!response.ok) {
          throw new Error(`Failed to fetch backup history: ${response.statusText}`)
        }

        const data = await response.json()
        this.sessions = data
      } catch (err) {
        console.error('Error fetching backup history:', err)
        this.error = err.message || 'Failed to load backup history. Please make sure the server is running.'
      } finally {
        this.loading = false
      }
    },
    async viewSessionDetails(sessionId) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/api/backup/session/${sessionId}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch session details: ${response.statusText}`)
        }

        const data = await response.json()
        this.selectedSession = data
      } catch (err) {
        console.error('Error fetching session details:', err)
        this.error = err.message || 'Failed to load session details.'
      }
    },
    closeSessionDetails() {
      this.selectedSession = null
    },
    refreshHistory() {
      this.fetchHistory()
    },
    formatDateTime(dateString) {
      if (!dateString) return 'N/A'
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    formatStatus(status) {
      const statusMap = {
        running: 'Running',
        completed: 'Completed',
        stopped: 'Stopped',
        failed: 'Failed',
        pending: 'Pending',
        inProgress: 'In Progress'
      }
      return statusMap[status] || status
    },
    formatSize(bytes) {
      if (!bytes || bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
    },
    calculateDuration(startTime, endTime) {
      if (!startTime) return 'N/A'

      const start = new Date(startTime)
      const end = endTime ? new Date(endTime) : new Date()
      const durationMs = end - start

      const seconds = Math.floor(durationMs / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)

      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`
      } else {
        return `${seconds}s`
      }
    }
  }
}
</script>

<style scoped>
.backup-history {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.history-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(102, 126, 234, 0.2);
}

.card-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.8rem;
}

.btn-refresh {
  padding: 0.5rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #667eea;
  color: white;
  transition: all 0.3s ease;
}

.btn-refresh:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-2px);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.loading-state,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #7f8c8d;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(102, 126, 234, 0.2);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-hint {
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.session-item {
  background: rgba(102, 126, 234, 0.05);
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.session-item:hover {
  background: rgba(102, 126, 234, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.session-item.completed {
  border-left: 4px solid #27ae60;
}

.session-item.running {
  border-left: 4px solid #3498db;
}

.session-item.stopped {
  border-left: 4px solid #f39c12;
}

.session-item.failed {
  border-left: 4px solid #e74c3c;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.session-info h3 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.3rem;
}

.session-time {
  font-size: 0.9rem;
  color: #7f8c8d;
  margin-bottom: 0.25rem;
}

.time-label {
  font-weight: 600;
  margin-right: 0.5rem;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
}

.status-badge.completed {
  background: rgba(39, 174, 96, 0.2);
  color: #27ae60;
}

.status-badge.running {
  background: rgba(52, 152, 219, 0.2);
  color: #3498db;
}

.status-badge.stopped {
  background: rgba(243, 156, 18, 0.2);
  color: #f39c12;
}

.status-badge.failed {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}

.status-badge.pending,
.status-badge.inProgress {
  background: rgba(149, 165, 166, 0.2);
  color: #95a5a6;
}

.session-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
}

.stat-label {
  font-size: 0.8rem;
  color: #7f8c8d;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  font-weight: 600;
}

.stat-value {
  font-size: 1.5rem;
  color: #2c3e50;
  font-weight: 700;
}

.stat-value.success {
  color: #27ae60;
}

.stat-value.error {
  color: #e74c3c;
}

.session-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-top: 1rem;
  border-top: 1px solid rgba(102, 126, 234, 0.2);
  gap: 1rem;
}

.session-info-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.session-path,
.session-destination {
  text-align: left;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.path-label {
  font-weight: 600;
  color: #7f8c8d;
  font-size: 0.85rem;
}

.path-value {
  font-size: 0.85rem;
  color: #2c3e50;
  font-family: monospace;
}

.destination-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.destination-badge.s3 {
  background: rgba(52, 152, 219, 0.2);
  color: #3498db;
}

.destination-badge.local {
  background: rgba(39, 174, 96, 0.2);
  color: #27ae60;
}

.btn-details {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #667eea;
  color: white;
  transition: all 0.3s ease;
}

.btn-details:hover {
  background: #5568d3;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 2px solid rgba(102, 126, 234, 0.2);
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
}

.modal-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.btn-close {
  background: none;
  border: none;
  font-size: 2rem;
  color: #7f8c8d;
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.btn-close:hover {
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.modal-body {
  padding: 2rem;
}

.session-summary {
  background: rgba(102, 126, 234, 0.05);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-label {
  font-size: 0.85rem;
  color: #7f8c8d;
  font-weight: 600;
  text-transform: uppercase;
}

.files-section {
  margin-top: 2rem;
}

.files-section h3 {
  color: #2c3e50;
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

.files-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
  gap: 1rem;
}

.file-item:last-child {
  border-bottom: none;
}

.file-item.completed {
  background: rgba(39, 174, 96, 0.05);
}

.file-item.failed {
  background: rgba(231, 76, 60, 0.05);
}

.file-item.inProgress {
  background: rgba(52, 152, 219, 0.05);
}

.file-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
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

.file-details {
  flex: 1;
  text-align: left;
  min-width: 0;
}

.file-name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.file-path {
  font-size: 0.85rem;
  color: #7f8c8d;
  font-family: monospace;
  margin-bottom: 0.25rem;
  word-break: break-all;
}

.file-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #95a5a6;
  flex-wrap: wrap;
}

.file-error {
  color: #e74c3c;
}

.file-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  flex-shrink: 0;
}

.file-status.completed {
  background: rgba(39, 174, 96, 0.2);
  color: #27ae60;
}

.file-status.failed {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}

.file-status.pending {
  background: rgba(149, 165, 166, 0.2);
  color: #95a5a6;
}

.file-status.inProgress {
  background: rgba(52, 152, 219, 0.2);
  color: #3498db;
}

@media (max-width: 768px) {
  .backup-history {
    padding: 1rem;
  }

  .card-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .session-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .session-footer {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .modal-content {
    max-height: 95vh;
  }

  .session-summary {
    grid-template-columns: 1fr;
  }
}
</style>
