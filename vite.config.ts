import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5173,
    host: true,
    // Enhanced proxy configuration with better error handling
    proxy: process.env.VITE_USE_LOCAL_BACKEND === 'true' ? {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        timeout: 30000, // 30 second timeout
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('❌ Proxy error:', err.message);
            console.log('💡 Make sure your local backend is running on port 3001');
            
            // Send a proper error response
            if (!res.headersSent) {
              res.writeHead(503, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
              });
              res.end(JSON.stringify({
                error: 'Local backend server is not running. Please start it with "npm run server" or disable VITE_USE_LOCAL_BACKEND in your .env file.'
              }));
            }
          });
          
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('🔄 Proxying request:', req.method, req.url);
          });
          
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            if (proxyRes.statusCode >= 400) {
              console.warn('⚠️ Proxy response error:', proxyRes.statusCode, req.url);
            } else {
              console.log('✅ Proxy response:', proxyRes.statusCode, req.url);
            }
          });
        },
      },
    } : undefined,
  },
  // Ensure environment variables are properly loaded
  envPrefix: 'VITE_',
  // Enhanced build configuration
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['framer-motion', 'lucide-react'],
          utils: ['date-fns', 'zustand']
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  // Define global constants for better error messages
  define: {
    __API_BASE_URL__: JSON.stringify(process.env.VITE_API_BASE_URL || 'https://pb2-ahh9.onrender.com/api'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});