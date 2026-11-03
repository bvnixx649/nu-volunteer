/** Largest poster we keep, as the size of the JPEG itself. */
export const MAX_POSTER_BYTES = 300 * 1024

/** Tries from the sharpest to the smallest: longest side in pixels and JPEG quality. */
export const ATTEMPTS: readonly (readonly [number, number])[] = [
  [1280, 0.82],
  [1080, 0.74],
  [960, 0.66],
  [800, 0.6],
  [640, 0.55],
  [480, 0.5],
]

/** Shrinks to fit inside max x max, keeping the ratio. Never enlarges. */
export function fitSize(w: number, h: number, max: number) {
  const scale = Math.min(1, max / Math.max(w, h))
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) }
}

/** Decoded size of a base64 data URL in bytes. */
export function dataUrlBytes(url: string) {
  const b64 = url.slice(url.indexOf(',') + 1)
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0
  return Math.floor((b64.length * 3) / 4) - pad
}

/** Reads an image file and returns a JPEG data URL of at most maxBytes (the smallest attempt if even that is bigger). */
export async function resizeToDataUrl(file: File, maxBytes = MAX_POSTER_BYTES): Promise<string> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  let out = ''
  for (const [max, quality] of ATTEMPTS) {
    const { w, h } = fitSize(bmp.width, bmp.height, max)
    canvas.width = w
    canvas.height = h
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bmp, 0, 0, w, h)
    out = canvas.toDataURL('image/jpeg', quality)
    if (dataUrlBytes(out) <= maxBytes) break
  }
  bmp.close?.()
  return out
}
