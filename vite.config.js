import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: 'src/index.html',
        home: 'src/home.html',
        login: 'src/login.html',
        signup: 'src/signup.html',
        dashboard: 'src/dashboard.html',
        customerDashboard: 'src/customer-dashboard.html',
        freelancerDashboard: 'src/freelancer-dashboard.html',
        freelancerProfile: 'src/freelancer-profile.html',
        profile: 'src/profile.html',
        favorites: 'src/favorites.html',
        chat: 'src/chat.html'
      }
    }
  },
  server: {
    port: 5173
  }
})