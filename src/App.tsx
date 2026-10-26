import { useEffect, useState } from 'react'
import type { PhotoSettings, Shown } from './types/calendar.ts'
import { fullPhotoTextStyle, withDefaults } from './photoStyle.ts'
import './App.css'
import CalendarWindow from './component/calendar-window.tsx'

// Okénka jsou rozházená jako u opravdového adventního kalendáře.
const ORDER = [
  7, 15, 2, 21, 11, 18, 4, 23, 9, 1, 14, 20, 6, 12, 24, 3, 17, 10, 22, 5, 13,
  19, 8, 16,
]

const OPENED_KEY = 'advent-opened'

function loadOpened(): Set<number> {
  try {
    return new Set(JSON.parse(localStorage.getItem(OPENED_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function saveOpened(opened: Set<number>) {
  try {
    localStorage.setItem(OPENED_KEY, JSON.stringify([...opened]))
  } catch {
    // Bez localStorage se okénka jen nezapamatují.
  }
}

function App() {
  const [unlocked, setUnlocked] = useState<Set<number> | null>(null)
  const [photos, setPhotos] = useState<Record<number, Partial<PhotoSettings>>>({})
  const [error, setError] = useState(false)
  const [opened, setOpened] = useState(loadOpened)
  const [shown, setShown] = useState<Shown | null>(null)

  useEffect(() => {
    fetch('/api/days')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { unlocked: number[]; photos: Record<number, Partial<PhotoSettings>> }) => {
        setUnlocked(new Set(data.unlocked))
        setPhotos(data.photos)
      })
      .catch(() => setError(true))
  }, [])

  useEffect(() => {
    if (shown === null) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShown(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shown])

  function openWindow(day: number) {
    const next = new Set(opened).add(day)
    setOpened(next)
    saveOpened(next)
  }

  return (
    <main className="calendar">
      <header className="calendar__header">
        <h1>Adventní kalendář</h1>
        <p>Každý den v prosinci se otevře jedno okénko.</p>
      </header>

      {error && <p className="calendar__status">Kalendář se nepodařilo načíst.</p>}
      {!error && !unlocked && <p className="calendar__status">Načítám…</p>}

      {unlocked && (
        <div className="calendar__board">
          <div className="calendar__grid">
            {ORDER.map((day) => (
              <CalendarWindow
                key={day}
                day={day}
                unlocked={unlocked.has(day)}
                opened={opened.has(day)}
                settings={withDefaults(photos[day])}
                onOpen={openWindow}
                onShow={setShown}
              />
            ))}
          </div>
        </div>
      )}

      {shown !== null && (
        <div className="lightbox" onClick={() => setShown(null)} role="dialog">
          {/* Rámeček má přesně tvar fotky, aby k němu šel text umístit v %. */}
          <div
            className="lightbox__frame"
            style={{
              aspectRatio: `${shown.image.width} / ${shown.image.height}`,
              width: `min(100%, calc(80svh * ${shown.image.width / shown.image.height}))`,
            }}
          >
            <img src={`/api/photo/${shown.day}`} alt={`Fotka ${shown.day}. prosince`} />
            {photos[shown.day]?.text && (
              <p
                className="photo-text"
                style={fullPhotoTextStyle(withDefaults(photos[shown.day]), shown.box, shown.image)}
              >
                {photos[shown.day].text}
              </p>
            )}
          </div>
          <span className="lightbox__caption">{shown.day}. prosince</span>
        </div>
      )}
    </main>
  )
}

export default App
