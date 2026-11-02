import { PHOTOS_FOLDER, lastUnlockedDay, sendJson } from '../../_lib/calendar.js'

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

async function findPhoto(env, day) {
  for (const [ext, type] of Object.entries(MIME)) {
    const object = await env.PHOTOS.get(`${PHOTOS_FOLDER}${day}${ext}`)
    if (object) return { object, type }
  }
}

export async function onRequestGet({ request, params, env }) {
  const { day } = params
  // Zamčený den vrací stejnou odpověď jako neexistující fotka,
  // aby nešlo ani zjistit, jestli pro něj fotka existuje.
  const photo =
    /^[1-9]\d?$/.test(day) && Number(day) <= lastUnlockedDay(env) && (await findPhoto(env, day))
  if (!photo) return sendJson(404, { error: 'Not found' })
  const { object, type } = photo
  const headers = {
    'Content-Type': type,
    'Cache-Control': 'private, max-age=3600',
    ETag: object.httpEtag,
  }
  // Fotku, kterou už prohlížeč má, není potřeba posílat znovu.
  if (request.headers.get('If-None-Match') === object.httpEtag) {
    await object.body.cancel()
    return new Response(null, { status: 304, headers })
  }
  return new Response(object.body, { headers })
}
