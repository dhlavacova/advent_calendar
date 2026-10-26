import type { CSSProperties } from 'react'

// Písma se načítají z Google Fonts v index.html, id jsou i v `server/photos.ts`.
export const FONTS = [
  { id: 'dancing', name: 'Dancing Script', family: "'Dancing Script', cursive" },
  { id: 'caveat', name: 'Caveat', family: "'Caveat', cursive" },
  { id: 'lobster', name: 'Lobster', family: "'Lobster', cursive" },
  { id: 'playfair', name: 'Playfair Display', family: "'Playfair Display', serif" },
  { id: 'montserrat', name: 'Montserrat', family: "'Montserrat', sans-serif" },
] as const

export type FontId = (typeof FONTS)[number]['id']

// Výřez fotky v okénku: x/y v % (který kus fotky je vidět), zoom 1–3.
// Text: velikost v % menšího rozměru okénka, aby se přizpůsobil jeho velikosti,
// textX/textY je střed textu v % okénka, textRotate otočení ve stupních.
// Stejný typ je v `server/photos.ts`.
export type PhotoSettings = {
  x: number
  y: number
  zoom: number
  text: string
  textColor: string
  textSize: number
  textFont: FontId
  textX: number
  textY: number
  textRotate: number
}

export const DEFAULT_SETTINGS: PhotoSettings = {
  x: 50,
  y: 50,
  zoom: 1,
  text: '',
  textColor: '#ffffff',
  textSize: 16,
  textFont: 'dancing',
  textX: 50,
  textY: 85,
  textRotate: 0,
}

// Starší uložená nastavení nemusí mít všechna pole.
export function withDefaults(settings?: Partial<PhotoSettings> | null): PhotoSettings {
  return { ...DEFAULT_SETTINGS, ...settings }
}

export function photoStyle({ x, y, zoom }: PhotoSettings): CSSProperties {
  const position = `${x}% ${y}%`
  return {
    objectPosition: position,
    transform: `scale(${zoom})`,
    transformOrigin: position,
  }
}

export function textStyle({ textColor, textSize, textFont }: PhotoSettings): CSSProperties {
  return {
    color: textColor,
    fontSize: `${textSize}cqmin`,
    fontFamily: FONTS.find((font) => font.id === textFont)?.family,
  }
}

export type Size = { width: number; height: number }

// Text ve zvětšené (celé) fotce: přepočítá polohu a velikost z okénka, kde je jen
// výřez fotky, aby text ležel na stejném místě fotky jako v okénku.
// `box` je velikost okénka, `image` přirozená velikost fotky. Rámeček fotky musí mít
// `container-type: inline-size`, velikosti jsou v cqw.
export function fullPhotoTextStyle(settings: PhotoSettings, box: Size, image: Size): CSSProperties {
  const { x, y, zoom, textX, textY, textSize, textRotate } = settings

  // Stejný výpočet jako `object-fit: cover` + `object-position` + `scale(zoom)`.
  const cover = Math.max(box.width / image.width, box.height / image.height)
  const width = image.width * cover
  const height = image.height * cover
  const offsetX = ((box.width - width) * x) / 100
  const offsetY = ((box.height - height) * y) / 100
  const originX = (box.width * x) / 100
  const originY = (box.height * y) / 100

  // Střed textu v okénku -> bod na fotce (0–1).
  const centerX = (box.width * textX) / 100
  const centerY = (box.height * textY) / 100
  const u = ((centerX - originX) / zoom + originX - offsetX) / width
  const v = ((centerY - originY) / zoom + originY - offsetY) / height

  // Šířka celé fotky v pixelech okénka, vůči ní se přepočítá velikost textu.
  const photoWidth = width * zoom
  const fontSize = (textSize / 100) * Math.min(box.width, box.height)

  return {
    ...textStyle(settings),
    left: `${u * 100}%`,
    top: `${v * 100}%`,
    fontSize: `${(fontSize / photoWidth) * 100}cqw`,
    maxWidth: `${((0.88 * box.width) / photoWidth) * 100}cqw`,
    transform: `translate(-50%, -50%) rotate(${textRotate}deg)`,
  }
}

// Umístění textu v okénku (bez písma, to je v `textStyle`).
export function textPlacement({ textX, textY, textRotate }: PhotoSettings): CSSProperties {
  return {
    left: `${textX}%`,
    top: `${textY}%`,
    transform: `translate(-50%, -50%) rotate(${textRotate}deg)`,
  }
}
