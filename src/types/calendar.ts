import type {FontId, Size} from "../photoStyle.ts";

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
export type Shown = { day: number; box: Size; image: Size }
export type WindowProps = {
    day: number
    unlocked: boolean
    opened: boolean
    settings: PhotoSettings
    onOpen: (day: number) => void
    onShow: (shown: Shown) => void
}
