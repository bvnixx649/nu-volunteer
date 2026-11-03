import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { DownloadSimple, Printer, X } from '@phosphor-icons/react'
import { api, now } from '../../data/api'
import type { Activity, Credit } from '../../data/types'
import { qrWindowMs } from '../../config'
import { isBottle } from '../../lib/bottle'
import { checkinOf } from '../../lib/checkin'
import { claimUrl, makeToken, windowOf } from '../../lib/qr'
import { watchFix, type Fix, type GeoError } from '../../lib/geo'
import { keepAwake } from '../../lib/wake'
import { useDevice } from '../../store'
import { Counter } from '../../ui/Counter'
import { QrCode } from './QrCode'
import { LiveFeed } from './LiveFeed'

/** The current QR window in server time. Re-renders once per window, and at once when the interval changes. */
function useWindow(enabled: boolean, interval: number) {
  const [, setTick] = useState(0)
  const w = windowOf(now(), interval)
  useEffect(() => {
    if (!enabled) return
    const t = setInterval(() => windowOf(now(), interval) !== w && setTick((n) => n + 1), 250)
    return () => clearInterval(t)
  }, [enabled, interval, w])
  return w
}

const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString()

/**
 * The screen students scan. Phone: big QR with a countdown. Tablet or laptop (768px+): QR on the
 * left, live count and the latest five names on the right. Always white so every camera reads it.
 */
export default function QrScreen() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const sup = useDevice((s) => s.sup)
  const [activity, setActivity] = useState<Activity | null | undefined>(undefined)
  const [credits, setCredits] = useState<Credit[]>([])
  const [fix, setFix] = useState<Fix | null>(null)
  const [geoErr, setGeoErr] = useState<GeoError | null>(null)

  useEffect(() => api.watchActivity(id, setActivity), [id])
  useEffect(() => api.watchCredits(id, setCredits), [id])
  useEffect(() => keepAwake(), [])

  const { locMode, qrInterval: interval } = checkinOf(activity ?? {})
  const checksLocation = !!activity && locMode === 'on'
  useEffect(() => {
    if (!checksLocation) return
    return watchFix(
      (f) => {
        setFix(f)
        setGeoErr(null)
      },
      setGeoErr,
    )
  }, [checksLocation])

  const dynamic = activity?.qrMode !== 'static'
  const w = useWindow(dynamic, interval)
  // A static QR only changes once, when the first GPS fix arrives.
  const coords = fix && checksLocation ? { la: +fix.lat.toFixed(6), lo: +fix.lng.toFixed(6), ac: Math.round(fix.acc) } : null
  const coordKey = dynamic ? JSON.stringify(coords) : coords ? 'fixed' : 'none'
  const token = useMemo(
    () => (activity ? makeToken({ a: activity.id, h: activity.hours, ...coords }, activity.qrMode, w * qrWindowMs(interval), interval) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activity?.id, activity?.hours, activity?.qrMode, w, interval, coordKey],
  )

  if (!sup) return <Navigate to="/sup/login" replace />
  if (activity === undefined) return null
  if (!activity) return <p className="p-6">ไม่พบกิจกรรมนี้</p>
  if (isBottle(activity)) return <Navigate to={`/sup/a/${activity.id}`} replace />

  const url = claimUrl(token)
  const today = credits.filter((c) => sameDay(c.at, now())).length
  const remaining = qrWindowMs(interval) - (now() % qrWindowMs(interval))

  const download = async () => {
    const a = document.createElement('a')
    a.href = await QRCode.toDataURL(url, { width: 1200, margin: 2 })
    a.download = `qr-${activity.id}.png`
    a.click()
  }

  const gps = !checksLocation
    ? null
    : fix
      ? `GPS แม่นยำ ±${Math.round(fix.acc)} ม.`
      : geoErr === 'denied'
        ? 'ยังไม่ได้เปิดตำแหน่ง QR จะไม่มีพิกัด'
        : 'กำลังหาตำแหน่ง'

  return (
    <main data-kiosk className="min-h-dvh bg-white text-[#1a1918]" style={{ colorScheme: 'light' }}>
      <div className="mx-auto grid min-h-dvh max-w-7xl gap-8 px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-center md:gap-14 md:px-10">
        <section className="flex flex-col items-center gap-4">
          <div className="flex w-full items-center gap-3 print:hidden">
            <button
              onClick={() => nav(`/sup/a/${id}`)}
              aria-label="ปิดจอ QR"
              className="pressable grid size-11 shrink-0 place-items-center rounded-full bg-[#f4f2ef]"
            >
              <X size={22} />
            </button>
            <h1 className="line-clamp-2 text-xl font-bold md:text-2xl">{activity.title}</h1>
          </div>

          <QrCode value={url} token={token} className="w-full max-w-[min(100%,68dvh)]" />

          {dynamic ? (
            <div className="h-1.5 w-full max-w-[min(100%,68dvh)] overflow-hidden rounded-full bg-[#ece9e5]" aria-hidden>
              <div key={`${interval}-${w}`} data-interval={interval} className="h-full origin-left rounded-full bg-[#e8590c]" style={{ animation: `drain ${remaining}ms linear forwards` }} />
            </div>
          ) : (
            <div className="flex gap-3 print:hidden">
              <button onClick={download} className="pressable flex min-h-12 items-center gap-2 rounded-full bg-[#f4f2ef] px-5 font-semibold">
                <DownloadSimple size={20} /> ดาวน์โหลดภาพ
              </button>
              <button onClick={() => window.print()} className="pressable flex min-h-12 items-center gap-2 rounded-full bg-[#f4f2ef] px-5 font-semibold">
                <Printer size={20} /> พิมพ์
              </button>
            </div>
          )}
          <p className="text-center text-[15px] text-[#6b6862] print:hidden">
            {dynamic ? `QR เปลี่ยนทุก ${interval} วินาที` : 'QR นี้ใช้ได้ตลอดช่วงกิจกรรม'}
            {gps && (
              <>
                <br />
                {gps}
              </>
            )}
          </p>
          <p className="num text-lg font-semibold md:hidden">ได้ชั่วโมงวันนี้ {today} คน</p>
        </section>

        <section className="hidden flex-col gap-8 md:flex print:hidden">
          <div>
            <Counter value={today} className="block text-[8rem] leading-none font-bold tracking-tight" />
            <p className="mt-3 text-xl text-[#6b6862]">คนได้ชั่วโมงวันนี้</p>
          </div>
          <LiveFeed credits={credits} />
        </section>
      </div>
    </main>
  )
}
