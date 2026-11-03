import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { QrCode } from '@phosphor-icons/react'
import { useMine } from '../../data/mine'
import type { Activity, MyCredit } from '../../data/types'
import { fmtHours, relDay, thDate, thTime } from '../../lib/format'
import { useNow } from '../../lib/hooks'
import { phase } from '../../lib/student'
import { LinkButton } from '../../ui/LinkButton'
import { Segmented } from '../../ui/Segmented'

function Row({ a, i, to, children }: { a: Activity; i: number; to?: string; children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: Math.min(i, 8) * 0.04 }}>
      <Link to={to ?? `/a/${a.id}`} className="pressable flex gap-4 rounded-[var(--radius-card)] bg-surface p-3 shadow-soft">
        <img src={a.poster} alt="" loading="lazy" className="size-20 shrink-0 rounded-2xl bg-surface-2 object-cover" />
        <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">{children}</div>
      </Link>
    </motion.div>
  )
}

/** The student's own list: what is coming, and what is done. */
export default function Mine() {
  const { activities, regs, credits, loaded } = useMine()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const t = useNow()

  const { upcoming, past } = useMemo(() => {
    const ids = new Set(regs.filter((r) => !r.cancelledAt).map((r) => r.activityId))
    const got = new Map<string, MyCredit>(credits.map((c) => [c.activityId, c]))
    const mine = activities.filter((a) => ids.has(a.id) || got.has(a.id))
    return {
      upcoming: mine.filter((a) => a.end > t && !got.has(a.id)).sort((a, b) => a.start - b.start),
      past: mine
        .filter((a) => a.end <= t || got.has(a.id))
        .sort((a, b) => b.start - a.start)
        .map((a) => ({ a, credit: got.get(a.id) })),
    }
  }, [activities, regs, credits, t])

  return (
    <main className="mx-auto max-w-lg px-5 pt-[calc(1.5rem+env(safe-area-inset-top,0px))]">
      <h1 className="text-3xl font-bold tracking-tight">กิจกรรมของฉัน</h1>
      <div className="mt-5">
        <Segmented
          label="เลือกช่วงเวลา"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'upcoming', label: `กำลังจะถึง${upcoming.length ? ` ${upcoming.length}` : ''}` },
            { value: 'past', label: 'ที่ผ่านมา' },
          ]}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {!loaded && <div className="h-28 animate-pulse rounded-[var(--radius-card)] bg-surface" aria-hidden />}
        {loaded &&
          tab === 'upcoming' &&
          (upcoming.length ? (
            upcoming.map((a, i) => {
              const live = phase(a, t) === 'live'
              return (
                <Row key={a.id} a={a} i={i} to={live ? '/scan' : undefined}>
                  <p className="num text-sm font-semibold text-accent">{live ? 'กำลังดำเนินอยู่' : `${relDay(a.start, t)} ${thTime(a.start)} น.`}</p>
                  <p className="line-clamp-2 leading-snug font-semibold">{a.title}</p>
                  {live ? (
                    <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                      <QrCode size={18} weight="bold" /> แตะเพื่อสแกนรับชั่วโมง
                    </span>
                  ) : (
                    <p className="truncate text-sm text-muted">{a.place || thDate(a.start)}</p>
                  )}
                </Row>
              )
            })
          ) : (
            <div className="rounded-[var(--radius-card)] bg-surface px-6 py-10 text-center shadow-soft">
              <p className="text-lg font-semibold">ยังไม่มีกิจกรรมที่ลงทะเบียน</p>
              <LinkButton to="/" className="mt-6">
                ดูกิจกรรมที่เปิดรับ
              </LinkButton>
            </div>
          ))}
        {loaded &&
          tab === 'past' &&
          (past.length ? (
            past.map(({ a, credit }, i) => (
              <Row key={a.id} a={a} i={i}>
                <p className="text-sm text-muted">{thDate(a.start)}</p>
                <p className="line-clamp-2 leading-snug font-semibold">{a.title}</p>
                {credit ? <p className="num text-sm font-semibold text-ok">+{fmtHours(credit.hours)} ชั่วโมง{credit.items !== undefined && ` จากแลกขวด ${credit.items} ขวด`}</p> : <p className="text-sm text-muted">ไม่ได้รับชั่วโมง</p>}
              </Row>
            ))
          ) : (
            <p className="rounded-[var(--radius-card)] bg-surface px-6 py-10 text-center text-muted shadow-soft">ยังไม่มีกิจกรรมที่ผ่านมา</p>
          ))}
      </div>
    </main>
  )
}
