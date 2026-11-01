// Celý web (i stránka a fotky) je za heslem z proměnné SITE_PASSWORD.
// Prohlížeč se na něj zeptá sám a pamatuje si ho, dokud se nezavře.
const encoder = new TextEncoder()

function askForPassword() {
  return new Response('Zadej heslo.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Adventni kalendar", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  })
}

// Jméno se ignoruje, záleží jen na hesle.
function passwordFrom(request) {
  const header = request.headers.get('Authorization') ?? ''
  if (!header.startsWith('Basic ')) return
  try {
    const bytes = Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0))
    const text = new TextDecoder().decode(bytes)
    return text.slice(text.indexOf(':') + 1)
  } catch {
    // Neplatné base64 je jako žádné heslo.
  }
}

// Porovnává otisky, aby délka odpovědi neprozradila nic o hesle.
async function samePassword(a, b) {
  const [hashA, hashB] = await Promise.all(
    [a, b].map((text) => crypto.subtle.digest('SHA-256', encoder.encode(text))),
  )
  return crypto.subtle.timingSafeEqual(hashA, hashB)
}

export async function onRequest({ request, env, next }) {
  // Bez nastaveného hesla se web raději neotevře nikomu.
  if (!env.SITE_PASSWORD) {
    return new Response('Heslo není nastavené (SITE_PASSWORD).', { status: 500 })
  }
  const password = passwordFrom(request)
  if (password === undefined || !(await samePassword(password, env.SITE_PASSWORD))) {
    return askForPassword()
  }
  return next()
}
