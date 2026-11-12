import QRCode from 'qrcode'
import { describe, expect, it } from 'vitest'
import { extractToken, makeToken } from './qr'
import { decodeImage } from './scanner'

/** Paints a QR the way a camera would see it on a screen: dark modules on white with a quiet border, `scale` pixels per module. */
function paint(text: string, scale: number) {
  const { size, data } = QRCode.create(text, { errorCorrectionLevel: 'M' }).modules
  const quiet = 4
  const side = (size + quiet * 2) * scale
  const px = new Uint8ClampedArray(side * side * 4).fill(255)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (!data[y * size + x]) continue
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++) {
          const i = (((y + quiet) * scale + dy) * side + (x + quiet) * scale + dx) * 4
          px[i] = px[i + 1] = px[i + 2] = 0
        }
    }
  return { px, side }
}

describe('decodeImage', () => {
  const token = makeToken({ a: 'blood-2569', h: 6 }, 'dynamic', Date.UTC(2026, 10, 20, 3))
  const url = `https://bvnixx649.github.io/nu-volunteer/#/claim?t=${encodeURIComponent(token)}`

  it('reads the claim link from a supervisor QR at 3 pixels per module', async () => {
    const { px, side } = paint(url, 3)
    const text = await decodeImage(px, side, side)
    expect(text).toBe(url)
    expect(extractToken(text!)).toBe(token)
  })

  it('returns null for a frame with no QR in it', async () => {
    expect(await decodeImage(new Uint8ClampedArray(120 * 120 * 4).fill(180), 120, 120)).toBeNull()
  })
})
