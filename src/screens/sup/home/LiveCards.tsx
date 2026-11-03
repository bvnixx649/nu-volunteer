import { Link } from 'react-router-dom'
import { QrCode } from '@phosphor-icons/react'
import type { Activity } from '../../../data/types'
import { thTime } from '../../../lib/format'
import { Counter } from '../../../ui/Counter'

/** One prominent card per activity that is running now: people credited so far and a big QR button. */
export function LiveCards({ list, showOrg }: { list: Activity[]; showOrg: boolean }) {
  if (!list.length) return null
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">กำลังจัดตอนนี้</h2>
      <ul className="flex flex-col gap-4">
        {list.map((a) => (
          <li key={a.id} className="rounded-[var(--radius-card)] bg-surface p-5 shadow-lift">
            <Link to={`/sup/a/${a.id}`} className="pressable flex items-center gap-4">
              <img src={a.poster} alt="" className="size-20 shrink-0 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-lg leading-snug font-bold tracking-tight">{a.title}</p>
                <p className="num mt-1 text-sm text-muted">
                  {thTime(a.start)} ถึง {thTime(a.end)} น.
                </p>
                {showOrg && <p className="mt-0.5 truncate text-sm text-muted">{a.org}</p>}
              </div>
            </Link>
            <p className="mt-5 flex items-baseline gap-2">
              <Counter value={a.creditCount} className="text-5xl leading-none font-bold tracking-tight" />
              <span className="text-muted">คนได้ชั่วโมงแล้ว</span>
            </p>
            <Link
              to={`/sup/a/${a.id}/qr`}
              className="pressable mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-accent-strong px-7 text-[17px] font-semibold text-on-accent shadow-soft"
            >
              <QrCode size={22} weight="bold" />
              เปิด QR
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
