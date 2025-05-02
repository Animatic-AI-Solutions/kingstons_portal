import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { splitVendorChunkPlugin } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    splitVendorChunkPlugin(),  // Split vendor chunks
  ],
  build: {
    outDir: 'build',
    sourcemap: true,
    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Create separate chunks for big libraries
          if (id.includes('node_modules')) {
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-react-query';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('tailwind') || id.includes('headless')) {
              return 'vendor-ui';
            }
            return 'vendor'; // All other dependencies
          }
        },
      },
    },
    // Increase warning limit for large chunks
    chunkSizeWarningLimit: 1000,
    // Enable brotli compression for better performance
    reportCompressedSize: true,
    // Enable minification for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    // Allow connections from all hosts for development
    host: true,
    // Add proxy configuration to forward API requests to the backend
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}); 