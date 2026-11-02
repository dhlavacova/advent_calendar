import { PHOTOS_FOLDER, lastUnlockedDay, sendJson } from '../_lib/calendar.js'

// Výřezy a texty fotek jsou v R2 v `settings.json`, zamčené dny se nevydají.
async function loadSettings(env) {
  try {
    const object = await env.PHOTOS.get(`${PHOTOS_FOLDER}settings.json`)
    return object ? await object.json() : {}
  } catch (err) {
    // Kalendář se otevře i bez výřezů a textů, chyba se aspoň objeví v logu.
    console.error(`Nastavení fotek nejde načíst: ${err.message}`)
    return {}
  }
}

export async function onRequestGet({ env }) {
  const settings = await loadSettings(env)
  const last = lastUnlockedDay(env)
  const unlocked = []
  const photos = {}
  for (let day = 1; day <= last; day++) {
    unlocked.push(day)
    if (settings[day]) photos[day] = settings[day]
  }
  return sendJson(200, { unlocked, photos })
}
