import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { splitVendorChunkPlugin } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    splitVendorChunkPlugin(),  // Split vendor chunks
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'C:\\inetpub\\wwwroot\\OfficeIntranet', // Absolute Windows path
    sourcemap: true,
    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks: undefined, // Disable manual chunking to fix React initialization
      },
    },
    // Increase warning limit for large chunks
    chunkSizeWarningLimit: 1000,
    // Enable brotli compression for better performance
    reportCompressedSize: true,
    // Temporarily disable minification to debug the issue
    minify: false,
  },
  server: {
    port: 3000,
    strictPort: true,
    // Allow connections from all hosts for development
    host: true,
    // Add proxy configuration to forward API requests to the backend
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}); 