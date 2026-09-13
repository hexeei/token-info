import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Relative base so the built site works when served from a subpath
  // (e.g. GitHub Pages at /token-info/) as well as from a domain root.
  base: './',
  plugins: [react()],
})
