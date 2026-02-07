<template>
  <div class="home-screen">
    <div class="container">
      <h1>Photo Backup App</h1>
      <p class="subtitle">Safely backup and manage your photos</p>
      <div class="features">
        <div class="feature-card">
          <h3>Secure Storage</h3>
          <p>Your photos are safely stored and encrypted</p>
        </div>
        <div class="feature-card">
          <h3>Easy Upload</h3>
          <p>Upload your photos with a simple drag and drop</p>
        </div>
        <div class="feature-card">
          <h3>Quick Access</h3>
          <p>Access your photos anytime, anywhere</p>
        </div>
      </div>
      <button class="btn-primary" @click="viewPhotos">View Photos</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomeScreen',
  methods: {
    viewPhotos() {
      this.$emit('navigate', 'photos')
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  margin-bottom: 3rem;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.feature-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 2rem;
  color: white;
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-card h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.feature-card p {
  font-size: 1rem;
  opacity: 0.9;
}

.btn-primary {
  background: white;
  color: #667eea;
  border: none;
  padding: 1rem 3rem;
  font-size: 1.2rem;
  font-weight: 600;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}
</style>
