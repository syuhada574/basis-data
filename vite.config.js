import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: 'src/index.html',
        login: 'src/login.html',
        signup: 'src/signup.html',
        dashboard: 'src/dashboard.html',
        profile: 'src/profile.html',
        chat: 'src/chat.html'
      }
    }
  },
  server: {
    port: 5173
  }
})