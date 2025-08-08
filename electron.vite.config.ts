import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('packages/shared-types/src')
      }
    },
    build: {
      lib: {
        entry: 'src-electron/main.ts'
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('packages/shared-types/src')
      }
    },
    build: {
      lib: {
        entry: 'src-electron/preload/index.ts'
      }
    }
  },
  renderer: {
    root: 'src',
    resolve: {
      alias: {
        '@renderer': resolve('src'),
        '@shared': resolve('packages/shared-types/src')
      }
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/index.html')
      }
    }
  }
})
