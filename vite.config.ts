import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-dom')) return 'react-vendor'
          if (id.includes('/react/') || id.includes('scheduler')) return 'react-vendor'
          if (id.includes('react-router')) return 'react-vendor'
          if (
            id.includes('react-markdown') ||
            id.includes('remark-') ||
            id.includes('rehype-') ||
            id.includes('mdast') ||
            id.includes('hast') ||
            id.includes('unist') ||
            id.includes('micromark') ||
            id.includes('decode-named-character-reference') ||
            id.includes('character-entities')
          ) {
            return 'markdown'
          }
          if (id.includes('@tanstack/react-table')) return 'table'
          if (id.includes('fuse.js')) return 'search'
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('zustand')) return 'state'
        },
      },
    },
  },
})
