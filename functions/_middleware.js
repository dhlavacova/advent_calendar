// Celý web (i stránka a fotky) je za heslem z proměnné SITE_PASSWORD.
// Prohlížeč se na něj zeptá sám a pamatuje si ho, dokud se nezavře.

function askForPassword() {
  return new Response('Zadej heslo.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Adventni kalendar", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  })
}

// Jméno se ignoruje, záleží jen na hesle. Bez hesla vrací '', které nikdy neprojde,
// protože SITE_PASSWORD je vždy neprázdné.
function passwordFrom(request) {
  const header = request.headers.get('Authorization') ?? ''
  if (!/^basic /i.test(header)) return ''
  try {
    const bytes = Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0))
    const text = new TextDecoder().decode(bytes)
    return text.slice(text.indexOf(':') + 1)
  } catch {
    return ''
  }
}

const hash = (text) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))

// Porovnává otisky, aby doba porovnání neprozradila nic o hesle.
async function samePassword(a, b) {
  return crypto.subtle.timingSafeEqual(await hash(a), await hash(b))
}

export async function onRequest({ request, env, next }) {
  // Bez nastaveného hesla se web raději neotevře nikomu.
  if (!env.SITE_PASSWORD) {
    return new Response('Heslo není nastavené (SITE_PASSWORD).', { status: 500 })
  }
  if (!(await samePassword(passwordFrom(request), env.SITE_PASSWORD))) return askForPassword()
  return next()
}
