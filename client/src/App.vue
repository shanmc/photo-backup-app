<template>
  <div id="app">
    <nav class="main-nav" v-if="currentView !== 'home'">
      <div class="nav-content">
        <button @click="currentView = 'home'" class="nav-btn">
          ← Back to Home
        </button>
      </div>
    </nav>
    <HomeScreen v-if="currentView === 'home'" @navigate="navigateTo" />
    <ViewPhotos v-if="currentView === 'photos'" />
    <BackupSync v-if="currentView === 'backup'" />
    <BackupHistory v-if="currentView === 'history'" />
  </div>
</template>

<script>
import HomeScreen from './components/HomeScreen.vue'
import ViewPhotos from './components/ViewPhotos.vue'
import BackupSync from './components/BackupSync.vue'
import BackupHistory from './components/BackupHistory.vue'

export default {
  name: 'App',
  components: {
    HomeScreen,
    ViewPhotos,
    BackupSync,
    BackupHistory
  },
  data() {
    return {
      currentView: 'home'
    }
  },
  methods: {
    navigateTo(view) {
      this.currentView = view
    }
  }
}
</script>

<style>
#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin: 0;
  padding: 0;
}

.main-nav {
  position: block;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  padding: 1rem 0;
}

.nav-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  align-items: center;
}

.nav-btn {
  background: transparent;
  border: none;
  color: #667eea;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.nav-btn:hover {
  background: rgba(102, 126, 234, 0.1);
}
</style>
