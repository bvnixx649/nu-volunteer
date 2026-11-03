import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from '@phosphor-icons/react'
import { haptic } from '../../lib/device'
import { extractToken } from '../../lib/qr'
import { useBack } from '../../ui/BackBar'
import { Button } from '../../ui/Button'

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
type DetectorCtor = new (o: { formats: string[] }) => Detector

/** Camera scanner for phones that have BarcodeDetector. Others use the normal camera app, which opens /claim by itself. */
export default function Scan() {
  const nav = useNavigate()
  const back = useBack('/')
  const video = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<'starting' | 'on' | 'unsupported' | 'denied'>('starting')
  const [bad, setBad] = useState(false)

  useEffect(() => {
    const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) return setState('unsupported')
    let stream: MediaStream | undefined
    let stopped = false
    const detector = new Ctor({ formats: ['qr_code'] })
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
      const tick = async () => {
        if (stopped) return
        try {
          const found = await detector.detect(el)
          for (const f of found) {
            const token = extractToken(f.rawValue)
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
      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-8">
        <h1 className="text-3xl leading-tight font-bold tracking-tight">{state === 'denied' ? 'เปิดกล้องไม่ได้' : 'สแกนด้วยกล้องมือถือ'}</h1>
        <p className="mt-3 text-lg text-muted">
          {state === 'denied' ? 'อนุญาตให้เว็บใช้กล้องในการตั้งค่าของเบราว์เซอร์ หรือ' : 'เบราว์เซอร์นี้สแกนในแอพไม่ได้'} เปิดกล้องปกติของเครื่อง แล้วสแกน QR จากจอผู้คุม ระบบจะพาไปรับชั่วโมงเอง
        </p>
        <Button size="lg" variant="secondary" className="mt-auto w-full" onClick={back}>
          กลับ
        </Button>
      </main>
    )
  }

  return (
    <main className="fixed inset-0 bg-black text-white">
      <video ref={video} playsInline muted className="size-full object-cover" />
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="size-64 rounded-[2rem] ring-4 ring-white/80" />
      </div>
      <button onClick={back} aria-label="ปิดกล้อง" className="pressable absolute top-[calc(1rem+env(safe-area-inset-top,0px))] left-4 grid size-12 place-items-center rounded-full bg-black/50 backdrop-blur-md">
        <X size={24} weight="bold" />
      </button>
      <p className="absolute inset-x-0 bottom-[calc(3rem+env(safe-area-inset-bottom,0px))] px-8 text-center text-lg font-semibold">
        {bad ? 'QR นี้ไม่ใช่ของจิตอาสา มน.' : state === 'starting' ? 'กำลังเปิดกล้อง' : 'ส่องไปที่ QR บนจอผู้คุม'}
      </p>
    </main>
  )
}
