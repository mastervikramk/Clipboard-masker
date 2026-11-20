import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: path.join(__dirname, 'src/renderer'),
  publicDir: path.join(__dirname, 'public'),
  plugins: [
    react(),
    electron({
      main: {
        entry: path.join(__dirname, 'src/main/index.ts'),
        vite: {
          build: {
            outDir: path.join(__dirname, 'dist-electron/main'),
            rollupOptions: {
              output: {
                entryFileNames: 'index.js'
              }
            }
          }
        }
      },
      preload: {
        input: path.join(__dirname, 'src/preload/index.ts'),
        vite: {
          build: {
            outDir: path.join(__dirname, 'dist-electron/preload'),
            rollupOptions: {
              output: {
                entryFileNames: 'index.js'
              }
            }
          }
        }
      },
      renderer: {}
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: path.join(__dirname, 'dist'),
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
})
