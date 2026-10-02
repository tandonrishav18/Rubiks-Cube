import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import geminiHintPlugin from './server/geminiPlugin.js'
import galleryPlugin from './server/galleryPlugin.js'

export default defineConfig({
  plugins: [react(), geminiHintPlugin(), galleryPlugin()],
  worker: { format: 'es' },
})
