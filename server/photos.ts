import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'

export const DAYS = 24

// Fotky leží mimo `public/`, takže je Vite nikdy nezabalí do buildu.
// Ven se dostanou jen přes `/api/photo/:day`, a to až když je den odemčený.
const PHOTOS_DIR = path.resolve(import.meta.dirname, '../photos')
const SETTINGS_FILE = path.join(PHOTOS_DIR, 'settings.json')

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

// Výřez fotky a text v okénku, stejný typ i seznam písem je v `src/photoStyle.ts`.
const FONT_IDS = ['dancing', 'caveat', 'lobster', 'playfair', 'montserrat']

type PhotoSettings = {
  x: number
  y: number
  zoom: number
  text: string
  textColor: string
  textSize: number
  textFont: string
  textX: number
  textY: number
  textRotate: number
}

// Pro testování: ADVENT_DATE=2026-12-05 npm run dev
function now(): Date {
  const override = process.env.ADVENT_DATE
  return override ? new Date(`${override}T12:00:00`) : new Date()
}

// Den N se odemkne 1. prosince + (N - 1) o půlnoci (čas serveru).
export function isUnlocked(day: number, date = now()): boolean {
  return date >= new Date(date.getFullYear(), 11, day)
}

function findPhoto(day: number): string | undefined {
  for (const ext of Object.keys(MIME)) {
    const file = path.join(PHOTOS_DIR, `${day}${ext}`)
    if (existsSync(file)) return file
  }
}

function loadSettings(): Record<string, PhotoSettings> {
  try {
    return JSON.parse(readFileSync(SETTINGS_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function parseSettings(value: unknown): PhotoSettings | undefined {
  if (typeof value !== 'object' || value === null) return
  const { x, y, zoom, text, textColor, textSize, textFont, textX, textY, textRotate } =
    value as Record<string, unknown>
  const inRange = (n: unknown, min: number, max: number): n is number =>
    typeof n === 'number' && n >= min && n <= max
  if (
    inRange(x, 0, 100) &&
    inRange(y, 0, 100) &&
    inRange(zoom, 1, 3) &&
    typeof text === 'string' &&
    text.length <= 200 &&
    typeof textColor === 'string' &&
    /^#[0-9a-f]{6}$/i.test(textColor) &&
    inRange(textSize, 5, 40) &&
    typeof textFont === 'string' &&
    FONT_IDS.includes(textFont) &&
    inRange(textX, 0, 100) &&
    inRange(textY, 0, 100) &&
    inRange(textRotate, -180, 180)
  ) {
    return { x, y, zoom, text, textColor, textSize, textFont, textX, textY, textRotate }
  }
}

function parseDay(pathname: string, prefix: string): number | undefined {
  const match = pathname.match(new RegExp(`^${prefix}(\\d{1,2})$`))
  const day = Number(match?.[1])
  return day >= 1 && day <= DAYS ? day : undefined
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function sendPhoto(res: ServerResponse, file: string, cacheControl: string) {
  res.statusCode = 200
  res.setHeader('Content-Type', MIME[path.extname(file)])
  res.setHeader('Cache-Control', cacheControl)
  // Nečitelná fotka (třeba kvůli oprávněním macOS) nesmí shodit celý server.
  const stream = createReadStream(file)
  stream.on('error', (err) => {
    console.error(`Fotku ${path.basename(file)} nejde přečíst: ${err.message}`)
    if (res.headersSent) res.destroy()
    else sendJson(res, 500, { error: 'Cannot read photo' })
  })
  stream.pipe(res)
}

export function photoMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) {
  const url = new URL(req.url ?? '/', 'http://localhost')

  if (url.pathname === '/api/days') {
    const settings = loadSettings()
    const unlocked = []
    const photos: Record<number, PhotoSettings> = {}
    for (let day = 1; day <= DAYS; day++) {
      if (!isUnlocked(day)) continue
      unlocked.push(day)
      if (settings[day]) photos[day] = settings[day]
    }
    return sendJson(res, 200, { total: DAYS, unlocked, photos })
  }

  if (url.pathname.startsWith('/api/photo/')) {
    const day = parseDay(url.pathname, '/api/photo/')
    // Zamčený den vrací stejnou odpověď jako neexistující fotka,
    // aby nešlo ani zjistit, jestli pro něj fotka existuje.
    const file = day && isUnlocked(day) ? findPhoto(day) : undefined
    if (!file) return sendJson(res, 404, { error: 'Not found' })
    return sendPhoto(res, file, 'private, max-age=3600')
  }

  next()
}

// Editor fotek vidí i zamčené dny, proto se zapíná jen v `npm run dev`
// (viz vite.config.ts), nikdy na produkčním serveru.
export function adminMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) {
  const url = new URL(req.url ?? '/', 'http://localhost')

  if (url.pathname === '/api/admin/photos' && req.method === 'GET') {
    const settings = loadSettings()
    const days = []
    for (let day = 1; day <= DAYS; day++) {
      days.push({ day, hasPhoto: !!findPhoto(day), settings: settings[day] ?? null })
    }
    return sendJson(res, 200, days)
  }

  if (url.pathname.startsWith('/api/admin/photo/') && req.method === 'GET') {
    const day = parseDay(url.pathname, '/api/admin/photo/')
    const file = day && findPhoto(day)
    if (!file) return sendJson(res, 404, { error: 'Not found' })
    return sendPhoto(res, file, 'no-store')
  }

  if (url.pathname.startsWith('/api/admin/settings/') && req.method === 'PUT') {
    const day = parseDay(url.pathname, '/api/admin/settings/')
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk: string) => (body += chunk))
    req.on('end', () => {
      let parsed: PhotoSettings | undefined
      try {
        parsed = parseSettings(JSON.parse(body))
      } catch {
        // Neplatný JSON skončí jako neplatné nastavení níže.
      }
      if (!day || !parsed) return sendJson(res, 400, { error: 'Invalid settings' })

      const settings = loadSettings()
      settings[day] = parsed
      writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n')
      sendJson(res, 200, parsed)
    })
    return
  }

  next()
}
