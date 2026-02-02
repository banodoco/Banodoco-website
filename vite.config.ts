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
          // React and all React-dependent UI libraries must be in the same chunk
          if (
            id.includes('react') ||
            id.includes('react-dom') ||
            id.includes('scheduler') ||
            id.includes('recharts') ||
            id.includes('lucide-react') ||
            id.includes('@radix-ui')
          ) {
            return 'react';
          }
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('@supabase') || id.includes('supabase')) return 'supabase';
          return 'vendor';
        },
      },
    },
  },
})
