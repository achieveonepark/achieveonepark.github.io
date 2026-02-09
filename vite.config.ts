import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'

const PARK_ROOT_DIR = 'public/parkachieveone'
const PARK_MANIFEST_FILE = 'files.json'
const SUPPORTED_EXTENSIONS = new Set(['.md', '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'])

const normalizeToPosix = (value: string) => value.split(path.sep).join('/')

const walkFiles = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...await walkFiles(fullPath))
      continue
    }

    files.push(fullPath)
  }

  return files
}

const companyLogoNameBySlug: Record<string, string> = {
  '111percent': '111percent',
  'snowpipe': 'snowpipe',
  'gridinc': 'gridinc',
  'snowballs': 'snowballs',
  'dalcomsoft': 'dalcomsoft',
}

const createParkManifestPlugin = (): Plugin => {
  let rootDir = ''
  let baseUrl = '/'

  const generateManifest = async () => {
    const parkAbsolutePath = path.resolve(rootDir, PARK_ROOT_DIR)
    const manifestAbsolutePath = path.join(parkAbsolutePath, PARK_MANIFEST_FILE)

    let sourceFiles: string[] = []
    try {
      sourceFiles = await walkFiles(parkAbsolutePath)
    } catch {
      return
    }

    const files = sourceFiles
      .filter(filePath => {
        const relPath = normalizeToPosix(path.relative(parkAbsolutePath, filePath))
        if (!relPath || relPath === PARK_MANIFEST_FILE) return false

        const ext = path.extname(relPath).toLowerCase()
        return SUPPORTED_EXTENSIONS.has(ext)
      })
      .map(filePath => {
        const relPath = normalizeToPosix(path.relative(parkAbsolutePath, filePath))
        const fileName = path.basename(relPath)
        const fileNameNoExt = fileName.replace(path.extname(fileName), '').toLowerCase()

        const entry: { path: string; thumbnail?: string } = { path: relPath }
        const matchedLogo = companyLogoNameBySlug[fileNameNoExt]
        if (matchedLogo) {
          const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
          entry.thumbnail = `${normalizedBase}images/${matchedLogo}.png`
        }

        return entry
      })
      .sort((a, b) => a.path.localeCompare(b.path, 'en'))

    const payload = JSON.stringify({ files }, null, 2)
    await fs.writeFile(manifestAbsolutePath, `${payload}\n`, 'utf8')
  }

  return {
    name: 'parkachieveone-manifest-plugin',
    configResolved(config) {
      rootDir = config.root
      baseUrl = config.base || '/'
    },
    async buildStart() {
      await generateManifest()
    },
    configureServer(server) {
      const watchPath = path.resolve(rootDir || process.cwd(), PARK_ROOT_DIR)

      server.watcher.add(watchPath)
      const onFileChange = async (changedPath: string) => {
        const normalized = normalizeToPosix(changedPath)
        if (!normalized.includes(normalizeToPosix(PARK_ROOT_DIR))) return
        if (normalized.endsWith(`/${PARK_MANIFEST_FILE}`)) return

        await generateManifest()
      }

      server.watcher.on('add', onFileChange)
      server.watcher.on('unlink', onFileChange)
      server.watcher.on('change', onFileChange)
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), createParkManifestPlugin()],
  // Custom domain deploy uses root path.
  base: command === 'serve' ? '/' : '/',
}))
