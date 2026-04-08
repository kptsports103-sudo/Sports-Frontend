import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  plugins: [mkcert(), react()],
  server: {
    port: 5176,
    host: 'localhost',
    strictPort: true,
    https: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      },
      '/ocr': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ocr/, '')
      }
    }
  },
  build: {
    sourcemap: false
  }
});
