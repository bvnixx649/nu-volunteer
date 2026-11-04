import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { create } from 'zustand'
import { CalendarBlank, CaretRight, CloudSlash, ListBullets, QrCode } from '@phosphor-icons/react'
import { now as serverNow } from '../data/api'
import { useMine } from '../data/mine'
import { CATEGORIES, CATEGORY_KEYS } from '../data/categories'
import type { CategoryKey } from '../data/types'
import { buildFeed, liveForScan } from '../lib/student'
import { busyDays, dayKey } from '../lib/home'
import { fmtHours, thDate, thTime } from '../lib/format'
import { sendPending, usePending } from '../lib/pending'
import { Button } from '../ui/Button'
import { CountUp } from '../ui/CountUp'
import { LinkButton } from '../ui/LinkButton'
import { MonthCalendar } from './sup/home/MonthCalendar'
import { ActivityCard } from './student/ActivityCard'

/** Filters survive a trip to the detail page and back. */
const useUi = create<{ view: 'list' | 'cal'; category: CategoryKey | null; set: (p: Partial<{ view: 'list' | 'cal'; category: CategoryKey | null }>) => void }>((set) => ({
  view: 'list',
  category: null,
  set: (p) => set(p),
}))

const WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const startOfDay = (t: number) => new Date(t).setHours(0, 0, 0, 0)

/** "วันนี้", "พรุ่งนี้", else "ศุกร์ 6 พ.ย.". */
function dayHeading(ms: number, now: number) {
  const diff = Math.round((startOfDay(ms) - startOfDay(now)) / 86_400_000)
  if (diff === 0) return 'วันนี้'
  if (diff === 1) return 'พรุ่งนี้'
  const d = new Date(ms)
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function FilterChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`pressable min-h-10 shrink-0 rounded-full px-4 text-[15px] font-medium transition-colors ${selected ? 'bg-ink text-bg' : 'bg-surface-2 text-ink'}`}
    >
      {children}
    </button>
  )
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="aspect-video animate-pulse rounded-[var(--radius-card)] bg-surface" />
      ))}
    </div>
  )
}

export default function Home() {
  const { student, activities, regs, credits, loaded, failed } = useMine()
  const ui = useUi()
  const pending = usePending()
  const [sending, setSending] = useState(false)
  const now = serverNow()
  const [cal, setCal] = useState(() => {
    const d = new Date(now)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [day, setDay] = useState<string>()

  const total = useMemo(() => credits.reduce((t, c) => t + c.hours, 0), [credits])
  const feed = useMemo(() => buildFeed({ activities, regs, credits, now, when: 'all', seatsOnly: false, category: ui.category }), [activities, regs, credits, now, ui.category])
  const live = useMemo(() => liveForScan(activities, regs, credits, now), [activities, regs, credits, now])
  const dayItems = day ? feed.items.filter((f) => dayKey(f.a.start) === day) : []
  const firstName = student?.name.split(' ')[0] ?? ''
  const initial = [...(student?.name ?? '')][0] ?? ''

  const groups = useMemo(() => {
    const out: { key: string; ms: number; list: typeof feed.items }[] = []
    for (const f of feed.items) {
      const key = dayKey(f.a.start)
      const last = out[out.length - 1]
      if (last && last.key === key) last.list.push(f)
      else out.push({ key, ms: f.a.start, list: [f] })
    }
    return out
  }, [feed])

  return (
    <main className="mx-auto max-w-lg px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))]">
      <header className="flex items-center gap-3">
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight">{firstName ? `สวัสดี ${firstName}` : 'จิตอาสา มน.'}</h1>
        <button
          type="button"
          aria-label={ui.view === 'cal' ? 'ดูเป็นรายการ' : 'ดูเป็นปฏิทิน'}
          aria-pressed={ui.view === 'cal'}
          onClick={() => ui.set({ view: ui.view === 'cal' ? 'list' : 'cal' })}
          className="pressable grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-ink"
        >
          {ui.view === 'cal' ? <ListBullets size={22} weight="bold" /> : <CalendarBlank size={22} weight="bold" />}
        </button>
        <Link to="/me" aria-label="โปรไฟล์ของฉัน" className="pressable grid size-11 shrink-0 place-items-center rounded-full bg-ink text-lg font-bold text-bg">
          {initial}
        </Link>
      </header>

      {pending.length > 0 && (
        <section className="mt-5 flex items-center gap-3 rounded-[var(--radius-card)] bg-warn-soft p-4" aria-label="การสแกนรอส่ง">
          <CloudSlash size={26} weight="fill" className="shrink-0 text-warn" />
          <p className="num min-w-0 flex-1 font-semibold text-warn">มีการสแกนรอส่ง {pending.length} รายการ</p>
          <Button
            variant="secondary"
            loading={sending}
            onClick={async () => {
              setSending(true)
              await sendPending(true)
              setSending(false)
            }}
          >
            ส่งตอนนี้
          </Button>
        </section>
      )}

      <div className="mt-6 flex items-end justify-between gap-3">
        <p className="flex min-w-0 items-baseline gap-2">
          <CountUp value={total} className="text-6xl leading-none font-bold tracking-tight" />
          <span className="font-semibold text-muted">ชั่วโมงจิตอาสา</span>
        </p>
        <Link to="/me" className="pressable inline-flex min-h-11 shrink-0 items-center gap-0.5 pl-2 text-sm text-muted">
          ดูประวัติ <CaretRight size={14} weight="bold" />
        </Link>
      </div>

      {live.map((a, i) => (
        <motion.section
          key={a.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1], delay: 0.1 + i * 0.05 }}
          className="mt-6 rounded-[var(--radius-card)] bg-ink p-5 text-bg"
          aria-label="กิจกรรมที่กำลังดำเนินอยู่"
        >
          <span className="num inline-flex h-7 items-center gap-2 rounded-md bg-bg/10 px-2.5 text-[13px] font-medium">
            <span className="size-2 animate-pulse rounded-full bg-accent-strong" /> กำลังดำเนินการ ถึง {thTime(a.end)} น.
          </span>
          <Link to={`/a/${a.id}`} className="mt-3 line-clamp-2 block text-lg leading-snug font-semibold">
            {a.title}
          </Link>
          <p className="num mt-1 text-sm opacity-70">จบแล้วสแกน QR ที่โต๊ะผู้ดูแลเพื่อรับ {fmtHours(a.hours)} ชม.</p>
          <LinkButton to="/scan" variant="primary" className="mt-4 w-full">
            <QrCode size={22} weight="bold" /> สแกนรับชั่วโมง
          </LinkButton>
        </motion.section>
      ))}

      <div className="no-scrollbar -mx-5 mt-6 flex gap-2 overflow-x-auto px-5" role="group" aria-label="กรองตามหมวด">
        <FilterChip selected={ui.category === null} onClick={() => ui.set({ category: null })}>
          ทั้งหมด
        </FilterChip>
        {CATEGORY_KEYS.filter((k) => k !== 'other' || ui.category === 'other' || activities.some((a) => a.categoryKey === 'other')).map((k) => (
          <FilterChip key={k} selected={ui.category === k} onClick={() => ui.set({ category: k })}>
            {CATEGORIES[k].label}
          </FilterChip>
        ))}
      </div>
      {ui.category !== null && ui.view === 'list' && (
        <p className="num mt-3 text-sm text-muted">
          พบ {feed.items.length} กิจกรรม{' '}
          <button className="font-semibold text-ink underline underline-offset-2" onClick={() => ui.set({ category: null })}>
            ล้างตัวกรอง
          </button>
        </p>
      )}

      {!loaded ? (
        <div className="mt-6">
          <Skeleton />
        </div>
      ) : failed ? (
        <p className="mt-6 rounded-[var(--radius-card)] bg-bad-soft px-5 py-4 text-bad">โหลดกิจกรรมไม่ได้ ตรวจอินเทอร์เน็ตแล้วเปิดแอปใหม่</p>
      ) : ui.view === 'cal' ? (
        <div className="mt-6 flex flex-col gap-5">
          <MonthCalendar
            year={cal.year}
            month={cal.month}
            onMonth={(year, month) => setCal({ year, month })}
            busy={busyDays(feed.items.map((f) => f.a))}
            selected={day}
            onSelect={setDay}
            now={now}
          />
          {day ? (
            <>
              <p className="num font-semibold">กิจกรรมวันที่ {thDate(new Date(`${day}T00:00:00`).getTime())}</p>
              {dayItems.map((f, i) => (
                <ActivityCard key={f.a.id} {...f} now={now} index={i} />
              ))}
              {!dayItems.length && <p className="text-muted">ไม่มีกิจกรรมในวันนี้</p>}
            </>
          ) : (
            <p className="text-muted">แตะวันที่ที่มีจุดเพื่อดูกิจกรรม</p>
          )}
        </div>
      ) : feed.items.length === 0 ? (
        <div className="mt-6 rounded-[var(--radius-card)] bg-surface px-6 py-12 text-center">
          <p className="text-lg font-semibold">{ui.category !== null ? 'ไม่พบกิจกรรมตามตัวกรอง' : 'ยังไม่มีกิจกรรมเปิดรับ'}</p>
          <p className="mt-2 text-muted">{ui.category !== null ? 'ลองเปลี่ยนหมวด หรือล้างตัวกรอง' : 'กิจกรรมใหม่จะแสดงที่นี่'}</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="mt-7">
            <h2 className="num mb-3 text-sm font-medium text-muted">{dayHeading(g.ms, now)}</h2>
            <div className="flex flex-col gap-6">
              {g.list.map((f, i) => (
                <ActivityCard key={f.a.id} {...f} now={now} index={i} />
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  )
}
