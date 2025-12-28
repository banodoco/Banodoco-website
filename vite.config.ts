import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'react';
          return 'vendor';
        },
      },
    },
  },
})
