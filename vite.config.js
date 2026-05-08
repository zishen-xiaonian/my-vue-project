import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          singleLineMap_mapOnly: resolve(__dirname, 'singleLineMap_mapOnly.html'),
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5172,
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://127.0.0.1:5000',
          changeOrigin: true,
          secure: false,
        },
        '/realMeasCenter': {
          target: env.VITE_BACKEND_URL || 'http://127.0.0.1:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
