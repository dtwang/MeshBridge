import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'move-index-html',
      closeBundle() {
        const indexPath = path.resolve(__dirname, '../index.html')
        const targetPath = path.resolve(__dirname, '../templates/app_noteboard/index.html')
        try {
          if (existsSync(indexPath)) {
            let content = readFileSync(indexPath, 'utf-8')
            
            content = content.replace(
              /src="\/static\/app_noteboard\/([^"]+)"/g,
              'src="{{ url_for(\'static\', filename=\'$1\') }}"'
            )
            content = content.replace(
              /href="\/static\/app_noteboard\/([^"]+)"/g,
              'href="{{ url_for(\'static\', filename=\'$1\') }}"'
            )
            
            writeFileSync(targetPath, content)
            unlinkSync(indexPath)
            console.log('✓ Moved index.html to templates/app_noteboard/ with Flask url_for syntax')
          }
        } catch (e) {
          console.error('Error moving index.html:', e)
        }
      }
    }
  ],
  build: {
    outDir: '../',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: 'static/app_noteboard/[name].js',
        chunkFileNames: 'static/app_noteboard/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'static/app_noteboard/[name][extname]';
          }
          return 'static/app_noteboard/[name][extname]';
        }
      },
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  }
})
