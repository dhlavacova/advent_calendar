import { DAYS, PHOTOS_FOLDER, isUnlocked, sendJson } from '../_lib/calendar.js'

// Výřezy a texty fotek jsou v R2 v `settings.json`, zamčené dny se nevydají.
async function loadSettings(env) {
  try {
    const object = await env.PHOTOS.get(`${PHOTOS_FOLDER}settings.json`)
    return object ? await object.json() : {}
  } catch {
    return {}
  }
}

export async function onRequestGet({ env }) {
  const settings = await loadSettings(env)
  const unlocked = []
  const photos = {}
  for (let day = 1; day <= DAYS; day++) {
    if (!isUnlocked(day, env)) continue
    unlocked.push(day)
    if (settings[day]) photos[day] = settings[day]
  }
  return sendJson(200, { total: DAYS, unlocked, photos })
}
