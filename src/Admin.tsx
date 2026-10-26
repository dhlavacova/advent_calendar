import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import {
  DEFAULT_SETTINGS,
  FONTS,
  photoStyle,
  textPlacement,
  textStyle,
  withDefaults,
} from './photoStyle.ts'
import type { PhotoSettings } from './types/calendar.ts'
import './Admin.css'

type DayInfo = { day: number; hasPhoto: boolean; settings: Partial<PhotoSettings> | null }

// Přibližný tvar okénka na tomhle počítači: 9 sloupců × 3 řádky pod nadpisem.
function desktopAspect(): number {
  const ratio = window.innerWidth / 9 / ((window.innerHeight - 170) / 3)
  return Math.min(Math.max(ratio, 0.5), 3)
}

function sameSettings(a: PhotoSettings, b: PhotoSettings): boolean {
  return (Object.keys(a) as (keyof PhotoSettings)[]).every((key) => a[key] === b[key])
}

function clampPercent(value: number): number {
  return Math.round(Math.min(Math.max(value, 0), 100))
}

// Úhel do rozsahu -180..180°.
function normalizeAngle(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180
}

type EditableTextProps = {
  settings: PhotoSettings
  onChange: (patch: Partial<PhotoSettings>) => void
}

// Text v náhledu: tažením se posouvá, za kolečko nahoře se otáčí,
// z klávesnice šipky posouvají a Alt + ←/→ otáčí.
function EditableText({ settings, onChange }: EditableTextProps) {
  const drag = useRef<{ mode: 'move' | 'rotate'; dx: number; dy: number } | null>(null)

  // Střed textu v pixelech obrazovky a rozměry náhledu, ve kterém leží.
  function measure(el: HTMLElement) {
    const rect = el.closest('.preview')!.getBoundingClientRect()
    return {
      rect,
      cx: rect.left + (settings.textX / 100) * rect.width,
      cy: rect.top + (settings.textY / 100) * rect.height,
    }
  }

  function start(e: PointerEvent<HTMLElement>, mode: 'move' | 'rotate') {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const { cx, cy } = measure(e.currentTarget)
    drag.current = { mode, dx: e.clientX - cx, dy: e.clientY - cy }
  }

  function move(e: PointerEvent<HTMLElement>) {
    const current = drag.current
    if (!current) return
    const { rect, cx, cy } = measure(e.currentTarget)
    if (current.mode === 'move') {
      onChange({
        textX: clampPercent(((e.clientX - current.dx - rect.left) / rect.width) * 100),
        textY: clampPercent(((e.clientY - current.dy - rect.top) / rect.height) * 100),
      })
    } else {
      // Kolečko je nad textem, takže úhel 0° odpovídá směru nahoru.
      let angle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90
      angle = e.shiftKey ? Math.round(angle / 15) * 15 : Math.round(angle)
      onChange({ textRotate: normalizeAngle(angle) })
    }
  }

  function end() {
    drag.current = null
  }

  function handleKey(e: KeyboardEvent<HTMLElement>) {
    const step = e.shiftKey ? 5 : 1
    const { textX, textY, textRotate } = settings
    if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      const delta = (e.shiftKey ? 15 : 1) * (e.key === 'ArrowLeft' ? -1 : 1)
      onChange({ textRotate: normalizeAngle(textRotate + delta) })
    } else if (e.key === 'ArrowLeft') onChange({ textX: clampPercent(textX - step) })
    else if (e.key === 'ArrowRight') onChange({ textX: clampPercent(textX + step) })
    else if (e.key === 'ArrowUp') onChange({ textY: clampPercent(textY - step) })
    else if (e.key === 'ArrowDown') onChange({ textY: clampPercent(textY + step) })
    else return
    e.preventDefault()
  }

  return (
    <p
      className="photo-text photo-text--editable"
      style={{ ...textStyle(settings), ...textPlacement(settings) }}
      tabIndex={0}
      aria-label="Text – posuň šipkami, Alt + šipky otáčí"
      onPointerDown={(e) => start(e, 'move')}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={handleKey}
    >
      {settings.text}
      {/* Pohyb a puštění myši probublají do <p> výše. */}
      <span
        className="photo-text__rotate"
        aria-hidden="true"
        onPointerDown={(e) => start(e, 'rotate')}
      />
    </p>
  )
}

function Admin() {
  const [days, setDays] = useState<DayInfo[] | null>(null)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [drafts, setDrafts] = useState<Record<number, PhotoSettings>>({})
  const [saved, setSaved] = useState<Record<number, PhotoSettings>>({})
  const [status, setStatus] = useState('')
  const [aspect] = useState(desktopAspect)

  useEffect(() => {
    fetch('/api/admin/photos')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: DayInfo[]) => {
        const settings: Record<number, PhotoSettings> = {}
        for (const info of data) settings[info.day] = withDefaults(info.settings)
        setDays(data)
        setSaved(settings)
        setDrafts(settings)
        setSelected(data.find((info) => info.hasPhoto)?.day ?? null)
      })
      .catch(() => setError(true))
  }, [])

  const current = selected !== null ? drafts[selected] : undefined
  const dirty = (day: number) => !sameSettings(drafts[day], saved[day])

  function update(patch: Partial<PhotoSettings>) {
    if (selected === null) return
    setDrafts((d) => ({ ...d, [selected]: { ...d[selected], ...patch } }))
    setStatus('')
  }

  // Kliknutím nebo tažením po fotce se vybere místo, které má být v okénku vidět.
  function pickPoint(e: PointerEvent<HTMLDivElement>) {
    if (e.type === 'pointerdown') e.currentTarget.setPointerCapture(e.pointerId)
    else if (e.buttons !== 1) return
    const rect = e.currentTarget.getBoundingClientRect()
    update({
      x: clampPercent(((e.clientX - rect.left) / rect.width) * 100),
      y: clampPercent(((e.clientY - rect.top) / rect.height) * 100),
    })
  }

  async function save() {
    if (selected === null || !current) return
    setStatus('Ukládám…')
    const res = await fetch(`/api/admin/settings/${selected}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(current),
    }).catch(() => null)
    if (res?.ok) {
      setSaved((s) => ({ ...s, [selected]: current }))
      setStatus('Uloženo')
    } else {
      setStatus('Uložení se nepovedlo')
    }
  }

  if (error) {
    return (
      <main className="admin">
        <p className="admin__note">
          Úprava fotek funguje jen při spuštění přes <code>npm run dev</code>.
        </p>
      </main>
    )
  }

  if (!days) {
    return (
      <main className="admin">
        <p className="admin__note">Načítám…</p>
      </main>
    )
  }

  return (
    <main className="admin">
      <header className="admin__header">
        <h1>Úprava fotek</h1>
        <a href="/">← Zpět na kalendář</a>
      </header>

      <div className="admin__layout">
        <nav className="admin__days" aria-label="Okénka">
          {days.map(({ day, hasPhoto }) => (
            <button
              key={day}
              type="button"
              className={`thumb${day === selected ? ' thumb--active' : ''}`}
              disabled={!hasPhoto}
              onClick={() => {
                setSelected(day)
                setStatus('')
              }}
            >
              {hasPhoto && (
                <img src={`/api/admin/photo/${day}`} alt="" style={photoStyle(drafts[day])} />
              )}
              <span className="thumb__number">
                {day}
                {hasPhoto && dirty(day) && ' •'}
              </span>
            </button>
          ))}
        </nav>

        {selected === null || !current ? (
          <p className="admin__note">
            Ve složce <code>photos/</code> zatím nejsou žádné fotky.
          </p>
        ) : (
          <section className="editor">
            <h2>Okénko {selected}</h2>
            <p className="admin__note">
              Klikni nebo táhni po fotce na místo, které má být v okénku vidět.
            </p>

            <div className="editor__body">
              <div
                className="editor__source"
                onPointerDown={pickPoint}
                onPointerMove={pickPoint}
              >
                <img src={`/api/admin/photo/${selected}`} alt="" draggable={false} />
                <span
                  className="editor__marker"
                  style={{ left: `${current.x}%`, top: `${current.y}%` }}
                />
              </div>

              <div className="editor__side">
                <div className="editor__previews">
                  <figure>
                    <div className="preview" style={{ aspectRatio: aspect }}>
                      <img src={`/api/admin/photo/${selected}`} alt="" style={photoStyle(current)} />
                      {current.text && <EditableText settings={current} onChange={update} />}
                    </div>
                    <figcaption>Počítač</figcaption>
                  </figure>
                  <figure>
                    <div className="preview preview--square">
                      <img src={`/api/admin/photo/${selected}`} alt="" style={photoStyle(current)} />
                      {current.text && <EditableText settings={current} onChange={update} />}
                    </div>
                    <figcaption>Mobil</figcaption>
                  </figure>
                </div>

                <label className="editor__field">
                  <span>Přiblížení {current.zoom.toFixed(2)}×</span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={current.zoom}
                    onChange={(e) => update({ zoom: Number(e.target.value) })}
                  />
                </label>
                <label className="editor__field">
                  <span>Vodorovně {current.x} %</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={current.x}
                    onChange={(e) => update({ x: Number(e.target.value) })}
                  />
                </label>
                <label className="editor__field">
                  <span>Svisle {current.y} %</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={current.y}
                    onChange={(e) => update({ y: Number(e.target.value) })}
                  />
                </label>

                <fieldset className="editor__text">
                  <legend>Text</legend>
                  <textarea
                    rows={2}
                    maxLength={200}
                    placeholder="Napiš text, který bude přes fotku…"
                    value={current.text}
                    onChange={(e) => update({ text: e.target.value })}
                  />

                  <div className="editor__fonts" role="radiogroup" aria-label="Písmo">
                    {FONTS.map((font) => (
                      <button
                        key={font.id}
                        type="button"
                        role="radio"
                        aria-checked={current.textFont === font.id}
                        className={`font-option${current.textFont === font.id ? ' font-option--active' : ''}`}
                        style={{ fontFamily: font.family }}
                        onClick={() => update({ textFont: font.id })}
                      >
                        {font.name}
                      </button>
                    ))}
                  </div>

                  <div className="editor__row">
                    <label className="editor__color">
                      <input
                        type="color"
                        value={current.textColor}
                        onChange={(e) => update({ textColor: e.target.value })}
                      />
                      <span>Barva</span>
                    </label>
                    <label className="editor__field editor__field--grow">
                      <span>Velikost {current.textSize}</span>
                      <input
                        type="range"
                        min={5}
                        max={40}
                        value={current.textSize}
                        onChange={(e) => update({ textSize: Number(e.target.value) })}
                      />
                    </label>
                  </div>

                  <label className="editor__field">
                    <span>Otočení {current.textRotate}°</span>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={current.textRotate}
                      onChange={(e) => update({ textRotate: Number(e.target.value) })}
                    />
                  </label>

                  <p className="editor__hint">
                    Text v náhledu chyť myší a přetáhni, za zlaté kolečko ho otočíš (se Shiftem po
                    15°). Nebo na text klikni a posouvej ho šipkami, Alt + ←/→ ho otáčí.
                  </p>
                  <button
                    type="button"
                    className="button button--small"
                    onClick={() =>
                      update({
                        textX: DEFAULT_SETTINGS.textX,
                        textY: DEFAULT_SETTINGS.textY,
                        textRotate: DEFAULT_SETTINGS.textRotate,
                      })
                    }
                  >
                    Text zpět dolů
                  </button>
                </fieldset>

                <div className="editor__actions">
                  <button
                    type="button"
                    className="button"
                    onClick={() =>
                      update({ x: DEFAULT_SETTINGS.x, y: DEFAULT_SETTINGS.y, zoom: DEFAULT_SETTINGS.zoom })
                    }
                  >
                    Fotku na střed
                  </button>
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={!dirty(selected)}
                    onClick={save}
                  >
                    Uložit
                  </button>
                  <span className="editor__status" role="status">
                    {status}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default Admin
