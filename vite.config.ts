import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

function injectSwVersionPlugin(version: string): Plugin {
  return {
    name: 'inject-sw-version',
    closeBundle() {
      const swDistPath = path.resolve(__dirname, 'dist/sw.js')
      if (fs.existsSync(swDistPath)) {
        let content = fs.readFileSync(swDistPath, 'utf-8')
        content = content.replace(
          /const CACHE_NAME = ['"][^'"]+['"];/,
          `const CACHE_NAME = 'irontrack-v${version}';`
        )
        fs.writeFileSync(swDistPath, content, 'utf-8')
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), injectSwVersionPlugin(pkg.version || '1.0.0')],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || '1.0.0'),
  },
})

