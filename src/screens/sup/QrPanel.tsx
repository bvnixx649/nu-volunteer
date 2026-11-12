import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowsOut } from '@phosphor-icons/react'
import { now } from '../../data/api'
import type { Activity } from '../../data/types'
import { qrWindowMs } from '../../config'
import { fmtHours } from '../../lib/format'
import { qrClosed } from '../../lib/stage'
import { keepAwake } from '../../lib/wake'
import { QrCode } from './QrCode'
import { useQrFeed } from './useQrFeed'

const RING = 56.5 // circumference of the 9 px ring

/**
 * The QR that sits behind the page on the Manage screen. It is only mounted while the reveal is visible, so the GPS
 * watch, the token window timer, the countdown tick and the wake lock below all stop the moment it is hidden.
 */
export function QrPanel({ activity }: { activity: Activity }) {
  const { url, token, interval, dynamic, window: w } = useQrFeed(activity)
  const win = qrWindowMs(interval)
  const [left, setLeft] = useState(() => win - (now() % win))
  useEffect(() => keepAwake(), [])
  useEffect(() => {
    if (!dynamic) return
    const t = setInterval(() => setLeft(win - (now() % win)), 250)
    return () => clearInterval(t)
  }, [dynamic, win, w])

  if (qrClosed(activity)) return <p className="px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] text-center text-xl font-semibold text-ink">ส่งรายชื่อแล้ว ปิดรับชั่วโมง</p>

  return (
    <div className="flex w-full flex-col items-center px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))]">
      <p className="line-clamp-1 max-w-full text-[15px] text-muted">{activity.title}</p>
      <p className="mt-0.5 text-xl font-semibold text-ink">สแกนเพื่อรับ {fmtHours(activity.hours)} ชั่วโมง</p>
      <div className="mt-3 rounded-[26px] bg-white p-3.5">
        <QrCode value={url} token={token} className="size-[236px]" />
      </div>
      {dynamic ? (
        <p className="mt-3 flex items-center gap-2.5 text-sm text-muted">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
            <circle cx="11" cy="11" r="9" fill="none" stroke="var(--color-surface-3)" strokeWidth="3" />
            <circle
              cx="11"
              cy="11"
              r="9"
              fill="none"
              stroke="var(--color-ok)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={RING}
              strokeDashoffset={RING * (1 - left / win)}
              transform="rotate(-90 11 11)"
              style={{ transition: 'stroke-dashoffset 250ms linear' }}
            />
          </svg>
          <span>
            QR ใหม่ใน <b className="num font-semibold text-ink">{Math.max(1, Math.ceil(left / 1000))}</b> วินาที
          </span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">QR นี้ใช้ได้ตลอดช่วงกิจกรรม</p>
      )}
      <Link
        to={`/sup/a/${activity.id}/qr`}
        className="pressable mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-5 text-[15px] font-medium text-ink"
      >
        <ArrowsOut size={18} aria-hidden />
        เปิดเต็มจอสำหรับหน้างาน
      </Link>
    </div>
  )
}
