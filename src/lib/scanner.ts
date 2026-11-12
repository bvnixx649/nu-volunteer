/** Reads the QR codes visible in one camera frame and returns their text. */
export type QrReader = (video: HTMLVideoElement) => Promise<string[]>

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
type DetectorCtor = (new (o: { formats: string[] }) => Detector) & { getSupportedFormats?: () => Promise<string[]> }

/** Longest side of the image handed to the JS decoder. Large enough for a QR held inside the guide frame, small enough to decode in a few ms. */
const FRAME = 600

/** Decodes one RGBA image. Split out so it can be tested without a camera. */
export async function decodeImage(data: Uint8ClampedArray, width: number, height: number): Promise<string | null> {
  const { default: jsQR } = await import('jsqr')
  // The supervisor's QR is always dark on light, so the inverted pass (half the work) is skipped.
  return jsQR(data, width, height, { inversionAttempts: 'dontInvert' })?.data || null
}

/**
 * Android Chrome has a built-in detector. iPhone Safari and the browser inside LINE do not, so those decode the frame in JS;
 * that code is only downloaded on phones that need it.
 */
export async function qrReader(): Promise<QrReader> {
  const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector
  if (Ctor) {
    try {
      const formats = await Ctor.getSupportedFormats?.()
      if (!formats || formats.includes('qr_code')) {
        const detector = new Ctor({ formats: ['qr_code'] })
        return async (v) => (await detector.detect(v)).map((f) => f.rawValue)
      }
    } catch {
      /* fall through to the JS decoder */
    }
  }
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  return async (v) => {
    const w = v.videoWidth
    const h = v.videoHeight
    if (!ctx || !w || !h) return []
    // The centre square of the camera image: the guide frame on screen sits inside it whichever way the phone is held.
    const side = Math.min(w, h)
    const size = Math.min(side, FRAME)
    canvas.width = canvas.height = size
    ctx.drawImage(v, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size)
    const text = await decodeImage(ctx.getImageData(0, 0, size, size).data, size, size)
    return text ? [text] : []
  }
}

/** True when the page can open a camera at all (needs https; missing in a few in-app browsers). */
export const canUseCamera = () => !!navigator.mediaDevices?.getUserMedia
