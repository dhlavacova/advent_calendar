// Stejná pravidla jako v `server/photos.ts` pro `npm run dev`, jen fotky leží v R2 (binding PHOTOS).
const DAYS = 24

// Složka s fotkami a `settings.json` v R2.
export const PHOTOS_FOLDER = 'POKEMON/'

const PRAGUE_DATE = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Prague',
  month: 'numeric',
  day: 'numeric',
})

// Cloudflare běží v UTC, okénka se ale mají otevírat o půlnoci českého času.
// Pro testování jde datum přepsat proměnnou ADVENT_DATE=2026-12-05.
function today(env) {
  if (env.ADVENT_DATE) {
    const [, month, day] = env.ADVENT_DATE.split('-').map(Number)
    return { month, day }
  }
  const parts = PRAGUE_DATE.formatToParts(new Date())
  return Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]))
}

// Poslední odemčený den, mimo prosinec 0.
export function lastUnlockedDay(env) {
  const { month, day } = today(env)
  return month === 12 ? Math.min(day, DAYS) : 0
}

export function sendJson(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
