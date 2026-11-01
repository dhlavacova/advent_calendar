// Stejná pravidla jako v `server/photos.ts`, jen fotky leží v R2 (binding PHOTOS).
export const DAYS = 24

// Složka s fotkami a `settings.json` v R2.
export const PHOTOS_FOLDER = 'POKEMON/'

export const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

// Cloudflare běží v UTC, okénka se ale mají otevírat o půlnoci českého času.
// Pro testování jde datum přepsat proměnnou ADVENT_DATE=2026-12-05.
function today(env) {
  if (env.ADVENT_DATE) {
    const [, month, day] = env.ADVENT_DATE.split('-').map(Number)
    return { month, day }
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Prague',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date())
  const part = (type) => Number(parts.find((p) => p.type === type).value)
  return { month: part('month'), day: part('day') }
}

export function isUnlocked(day, env) {
  const date = today(env)
  return date.month === 12 && date.day >= day
}

export function sendJson(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
