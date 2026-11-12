import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from '@phosphor-icons/react'
import { haptic } from '../../lib/device'
import { extractToken } from '../../lib/qr'
import { canUseCamera, qrReader, type QrReader } from '../../lib/scanner'
import { useBack } from '../../ui/BackBar'
import { Button } from '../../ui/Button'

/** Camera scanner. Android reads with the built-in detector, iPhone and in-app browsers with a JS decoder (lib/scanner). */
export default function Scan() {
  const nav = useNavigate()
  const back = useBack('/')
  const video = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<'starting' | 'on' | 'unsupported' | 'denied'>('starting')
  const [bad, setBad] = useState(false)

  useEffect(() => {
    if (!canUseCamera()) return setState('unsupported')
    let stream: MediaStream | undefined
    let stopped = false
    // The reader may have to download its decoder; start that while the camera opens.
    const reading = qrReader()
    reading.catch(() => {})
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      } catch {
        return setState('denied')
      }
      const el = video.current
      if (stopped || !el) return stream.getTracks().forEach((t) => t.stop())
      el.srcObject = stream
      await el.play().catch(() => {})
      setState('on')
      let read: QrReader
      try {
        read = await reading
      } catch {
        stream.getTracks().forEach((t) => t.stop())
        return setState('unsupported')
      }
      const tick = async () => {
        if (stopped) return
        try {
          for (const text of await read(el)) {
            const token = extractToken(text)
            if (token) {
              haptic.tap()
              stopped = true
              return nav(`/claim?t=${encodeURIComponent(token)}`, { replace: true })
            }
            setBad(true)
          }
        } catch {
          /* a frame that cannot be read is skipped */
        }
        setTimeout(tick, 150)
      }
      tick()
    })()
    return () => {
      stopped = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [nav])

  if (state === 'unsupported' || state === 'denied') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-balance">{state === 'denied' ? 'เปิดกล้องไม่ได้' : 'สแกนด้วยกล้องมือถือ'}</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-muted">
          {state === 'denied' ? 'อนุญาตให้ใช้กล้องในตั้งค่าเบราว์เซอร์ หรือ' : 'เบราว์เซอร์นี้สแกนในแอปไม่ได้'} เปิดกล้องของเครื่องแล้วสแกน QR จากจอผู้ดูแล
        </p>
        <Button size="lg" variant="secondary" className="mt-auto w-full" onClick={back}>
          กลับ
        </Button>
      </main>
    )
  }

  // The camera view is true black with white type: it sits over video, not on the page surface.
  return (
    <main className="fixed inset-0 bg-black text-white">
      <video ref={video} playsInline muted className="size-full object-cover" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="size-64 rounded-[28px] ring-4 ring-white/85" />
      </div>
      <button onClick={back} aria-label="ปิดกล้อง" className="pressable absolute top-[calc(1rem+env(safe-area-inset-top,0px))] left-4 grid size-12 place-items-center rounded-full bg-black/50">
        <X size={24} weight="bold" />
      </button>
      <p className="absolute inset-x-0 bottom-[calc(3rem+env(safe-area-inset-bottom,0px))] px-8 text-center text-lg font-semibold text-balance" role="status">
        {bad ? 'QR นี้ไม่ใช่ของจิตอาสา มน.' : state === 'starting' ? 'กำลังเปิดกล้อง' : 'หันกล้องไปที่ QR'}
      </p>
    </main>
  )
}
