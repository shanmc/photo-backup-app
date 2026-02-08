<template>
  <div class="home-screen">
    <div class="container">
      <h1>Photo Backup App</h1>
      <p class="subtitle">Safely backup and manage your photos</p>
      <div class="action-buttons">
        <button class="btn-primary" @click="viewPhotos">View Photos</button>
        <button class="btn-secondary" @click="startBackup">Backup & Sync</button>
        <button class="btn-secondary" @click="viewHistory">Backup History</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomeScreen',
  methods: {
    viewPhotos() {
      this.$emit('navigate', 'photos')
    },
    startBackup() {
      this.$emit('navigate', 'backup')
    },
    viewHistory() {
      this.$emit('navigate', 'history')
    }
  }
}
</script>

<style scoped>
.home-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #202fb8 100%);
  padding: 20px;
}

.container {
  max-width: 1200px;
  width: 100%;
}

h1 {
  font-size: 3rem;
  color: white;
  margin-bottom: 1rem;
  font-weight: 700;
}

.subtitle {
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 4rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary {
  border: none;
  padding: 1rem 3rem;
  font-size: 1.2rem;
  font-weight: 600;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.btn-primary {
  background: white;
  color: #667eea;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
}

.btn-primary:hover,
.btn-secondary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
