import  { useRef, useState} from 'react';
import {photoStyle, textPlacement, textStyle} from "../photoStyle.ts";
import type {WindowProps} from "../types/calendar.ts";

// Štědrý den je přes 2×2 políčka.
const BIG_DAY = 24

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

export default CalendarWindow;