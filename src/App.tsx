import { useEffect, useRef, useState } from 'react'
import {
  fullPhotoTextStyle,
  photoStyle,
  textPlacement,
  textStyle,
  withDefaults,
  type PhotoSettings,
  type Size,
} from './photoStyle.ts'
import './App.css'

// Okénka jsou rozházená jako u opravdového adventního kalendáře.
const ORDER = [
  7, 15, 2, 21, 11, 18, 4, 23, 9, 1, 14, 20, 6, 12, 24, 3, 17, 10, 22, 5, 13,
  19, 8, 16,
]

// Štědrý den je přes 2×2 políčka.
const BIG_DAY = 24

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

// Zvětšená fotka: velikost okénka a fotky, aby šel text přepočítat na celou fotku.
type Shown = { day: number; box: Size; image: Size }

type WindowProps = {
  day: number
  unlocked: boolean
  opened: boolean
  settings: PhotoSettings
  onOpen: (day: number) => void
  onShow: (shown: Shown) => void
}

function CalendarWindow({ day, unlocked, opened, settings, onOpen, onShow }: WindowProps) {
  const [shaking, setShaking] = useState(false)
  const [missing, setMissing] = useState(false)
  const insideRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  function handleClick() {
    if (!unlocked) {
      setShaking(true)
      return
    }
    if (!opened) return onOpen(day)

    const inside = insideRef.current
    const img = imgRef.current
    if (!inside || !img?.naturalWidth) return
    onShow({
      day,
      box: { width: inside.clientWidth, height: inside.clientHeight },
      image: { width: img.naturalWidth, height: img.naturalHeight },
    })
  }

  const state = !unlocked ? 'locked' : opened ? 'opened' : 'ready'

  return (
    <button
      type="button"
      className={`window window--${state}${day === BIG_DAY ? ' window--big' : ''}${shaking ? ' window--shake' : ''}`}
      onClick={handleClick}
      onAnimationEnd={() => setShaking(false)}
      aria-label={
        unlocked
          ? `Okénko ${day}${opened ? ', otevřené' : ''}`
          : `Okénko ${day}, ještě zamčené`
      }
    >
      <div className="window__inside" ref={insideRef}>
        {/* Zamčené okénko fotku vůbec nenačítá – server by ji stejně nevydal. */}
        {unlocked && opened && !missing && (
          <img
            ref={imgRef}
            src={`/api/photo/${day}`}
            alt={`Fotka ${day}. prosince`}
            style={photoStyle(settings)}
            onError={() => setMissing(true)}
          />
        )}
        {unlocked && opened && !missing && settings.text && (
          <p className="photo-text" style={{ ...textStyle(settings), ...textPlacement(settings) }}>
            {settings.text}
          </p>
        )}
        {missing && <span className="window__missing">Fotka chybí</span>}
      </div>
      <div className="window__door">
        <span className="window__number">{day}</span>
      </div>
    </button>
  )
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
