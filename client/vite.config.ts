import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    await import('@vitejs/plugin-vue').then(m => m.default())
  ],
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
  },
})
