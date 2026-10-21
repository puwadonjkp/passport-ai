import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base ต้องตรงกับชื่อ repo บน GitHub Pages (https://<user>.github.io/passport-ai/)
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/passport-ai/',
  build: { chunkSizeWarningLimit: 1600 },
})
