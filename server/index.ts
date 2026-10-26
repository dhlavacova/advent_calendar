import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { photoMiddleware } from './photos.ts'

// Produkční server: `npm run build && npm start`
const DIST_DIR = path.resolve(import.meta.dirname, '../dist')
const PORT = Number(process.env.PORT ?? 3000)

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

createServer((req, res) => {
  photoMiddleware(req, res, () => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost')
    // Mimo jiné /api/admin/*, které běží jen v `npm run dev`.
    if (pathname.startsWith('/api/')) {
      res.statusCode = 404
      return res.end()
    }
    let file = path.join(DIST_DIR, path.normalize(decodeURIComponent(pathname)))
    if (!file.startsWith(DIST_DIR) || !existsSync(file) || statSync(file).isDirectory()) {
      file = path.join(DIST_DIR, 'index.html')
    }
    res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream')
    createReadStream(file)
      .on('error', () => {
        res.statusCode = 500
        res.end()
      })
      .pipe(res)
  })
}).listen(PORT, () => {
  console.log(`Adventní kalendář běží na http://localhost:${PORT}`)
})
