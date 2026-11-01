import { DAYS, MIME, PHOTOS_FOLDER, isUnlocked, sendJson } from '../../_lib/calendar.js'

async function findPhoto(env, day) {
  for (const [ext, type] of Object.entries(MIME)) {
    const object = await env.PHOTOS.get(`${PHOTOS_FOLDER}${day}${ext}`)
    if (object) return { object, type }
  }
}

export async function onRequestGet({ params, env }) {
  const day = /^\d{1,2}$/.test(params.day) ? Number(params.day) : 0
  // Zamčený den vrací stejnou odpověď jako neexistující fotka,
  // aby nešlo ani zjistit, jestli pro něj fotka existuje.
  const photo = day >= 1 && day <= DAYS && isUnlocked(day, env) ? await findPhoto(env, day) : undefined
  if (!photo) return sendJson(404, { error: 'Not found' })
  return new Response(photo.object.body, {
    headers: { 'Content-Type': photo.type, 'Cache-Control': 'private, max-age=3600' },
  })
}
