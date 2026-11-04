import { useId, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { create } from 'zustand'
import { CalendarBlank, CaretRight, CloudSlash, ListBullets, QrCode } from '@phosphor-icons/react'
import { now as serverNow } from '../data/api'
import { useMine } from '../data/mine'
import { CATEGORIES, CATEGORY_KEYS } from '../data/categories'
import type { CategoryKey } from '../data/types'
import { SOON_DAYS } from '../config'
import { buildFeed, hoursByCategory, liveForScan, type When } from '../lib/student'
import { busyDays, dayKey } from '../lib/home'
import { fmtHours, thDate, thTime } from '../lib/format'
import { sendPending, usePending } from '../lib/pending'
import { Button } from '../ui/Button'
import { CountUp } from '../ui/CountUp'
import { LinkButton } from '../ui/LinkButton'
import { MonthCalendar } from './sup/home/MonthCalendar'
import { ActivityCard } from './student/ActivityCard'

type UiState = { view: 'list' | 'cal'; category: CategoryKey | null; when: When }

/** Filters survive a trip to the detail page and back. */
const useUi = create<UiState & { set: (p: Partial<UiState>) => void }>((set) => ({
  view: 'list',
  category: null,
  when: 'all',
  set: (p) => set(p),
}))

/** The day filter of SPEC 5.3. The longer filters in lib/student stay available to other callers. */
const DAYS: { key: When; label: string }[] = [
  { key: 'all', label: 'ทุกวัน' },
  { key: 'today', label: 'วันนี้' },
  { key: 'tomorrow', label: 'พรุ่งนี้' },
  { key: 'week', label: '7 วัน' },
]

/** Segment colors of the hours bar, by category order. */
const SEGMENTS = ['var(--color-accent)', '#e9d8c6', '#6f6a63', '#a5a19a']

const ease = [0.23, 1, 0.32, 1] as const
const rise = (i: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease, delay: i * 0.06 },
})

function FilterChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`pressable h-10 shrink-0 rounded-full px-4 text-[14.5px] whitespace-nowrap transition-colors ${
        selected ? 'bg-ink font-semibold text-bg' : 'bg-surface font-medium text-ink/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]'
      }`}
    >
      {children}
    </button>
  )
}

/** Four-way day filter: pill track, raised thumb that slides to the chosen day. */
function DayFilter({ value, onChange }: { value: When; onChange: (v: When) => void }) {
  const id = useId()
  return (
    <div role="radiogroup" aria-label="กรองตามวัน" className="grid grid-cols-4 gap-1 rounded-full border border-white/5 bg-surface p-1">
      {DAYS.map((d) => {
        const on = d.key === value
        return (
          <button
            key={d.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(d.key)}
            className={`pressable relative h-9 rounded-full text-sm transition-colors duration-200 ${on ? 'font-semibold text-ink' : 'text-muted'}`}
          >
            {on && (
              <motion.span
                layoutId={id}
                className="absolute inset-0 rounded-full bg-[#34312d] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_6px_rgba(0,0,0,0.35)]"
                transition={{ type: 'spring', duration: 0.35, bounce: 0.12 }}
              />
            )}
            <span className="relative">{d.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[196px] animate-pulse rounded-[22px] bg-surface" />
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
  const perCategory = useMemo(() => hoursByCategory(credits, activities), [credits, activities])
  const inList = ui.view === 'list'
  const feed = useMemo(
    () => buildFeed({ activities, regs, credits, now, when: inList ? ui.when : 'all', seatsOnly: false, category: ui.category }),
    [activities, regs, credits, now, ui.category, ui.when, inList],
  )
  const live = useMemo(() => liveForScan(activities, regs, credits, now), [activities, regs, credits, now])
  const dayItems = day ? feed.items.filter((f) => dayKey(f.a.start) === day) : []
  const firstName = student?.name.split(' ')[0] ?? ''
  const filtered = ui.category !== null || (inList && ui.when !== 'all')

  // A live activity already has its own scan card above; listing it again would show it twice.
  const liveIds = new Set(live.map((a) => a.id))
  const notLive = (list: typeof feed.soon) => list.filter((f) => !liveIds.has(f.a.id))
  const sections = [
    { key: 'soon', title: 'ใกล้ถึงวัน', note: `เริ่มภายใน ${SOON_DAYS} วัน`, items: notLive(feed.soon) },
    { key: 'open', title: 'เปิดรับสมัคร', note: '', items: notLive(feed.open) },
    { key: 'notYet', title: 'ยังไม่เปิดรับ', note: '', items: notLive(feed.notYet) },
  ].filter((s) => s.items.length > 0)

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        <div className="absolute -top-40 -right-[120px] size-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(242,112,42,0.16),rgba(242,112,42,0))]" />
      </div>

      <main className="relative mx-auto max-w-lg px-5 pt-[calc(1.375rem+env(safe-area-inset-top,0px))]">
        <motion.header {...rise(0)} className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}nu-emblem.png`}
            alt="ตรามหาวิทยาลัยนเรศวร"
            className="size-10 shrink-0 rounded-full bg-white p-[3px] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl leading-tight font-semibold">{firstName ? `สวัสดี ${firstName}` : 'จิตอาสา มน.'}</h1>
            {student && <p className="num truncate text-[13px] text-muted">{student.id}</p>}
          </div>
          <button
            type="button"
            aria-label={ui.view === 'cal' ? 'ดูเป็นรายการ' : 'ดูเป็นปฏิทิน'}
            aria-pressed={ui.view === 'cal'}
            onClick={() => ui.set({ view: ui.view === 'cal' ? 'list' : 'cal' })}
            className="pressable grid size-11 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
          >
            {ui.view === 'cal' ? <ListBullets size={22} /> : <CalendarBlank size={22} />}
          </button>
        </motion.header>

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

        <motion.section {...rise(1)} className="-mx-1 mt-5 rounded-[30px] border border-white/[0.06] bg-white/[0.03] p-1.5" aria-label="ชั่วโมงจิตอาสาสะสม">
          <div
            className="relative overflow-hidden rounded-3xl px-5 pt-5 pb-[18px] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_24px_48px_-20px_rgba(0,0,0,0.7)]"
            style={{ backgroundImage: 'radial-gradient(120% 90% at 100% 0%, rgba(242,112,42,0.20), rgba(242,112,42,0) 55%), linear-gradient(180deg, #27241f, #1c1a18)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-normal text-ink/80">ชั่วโมงจิตอาสาสะสม</h2>
              <Link to="/me" className="pressable -my-3 inline-flex min-h-11 items-center gap-0.5 pl-3 text-sm">
                ดูประวัติ <CaretRight size={16} />
              </Link>
            </div>
            <p className="mt-1 flex items-baseline gap-2.5">
              <CountUp value={total} className="text-[76px] leading-none font-semibold tracking-[-0.045em]" />
              <span className="text-[17px] text-ink/80">ชั่วโมง</span>
            </p>
            <p className="num mt-1.5 text-[13px] text-muted">{total > 0 ? `จาก ${credits.length} กิจกรรม` : 'เข้าร่วมกิจกรรมแล้วสแกน QR เพื่อรับชั่วโมง'}</p>
            {total > 0 && perCategory.length > 0 && (
              <>
                <div className="mt-[18px] flex h-2 gap-[3px]" aria-hidden>
                  {perCategory.map(({ k, hours }, i) => (
                    <motion.div
                      key={k}
                      initial={{ transform: 'scaleX(0)' }}
                      animate={{ transform: 'scaleX(1)' }}
                      transition={{ duration: 0.7, ease, delay: 0.3 + i * 0.08 }}
                      className={`origin-left ${
                        perCategory.length === 1 ? 'rounded-full' : i === 0 ? 'rounded-[99px_3px_3px_99px]' : i === perCategory.length - 1 ? 'rounded-[3px_99px_99px_3px]' : 'rounded-[3px]'
                      }`}
                      style={{ flex: `${hours} 1 0`, backgroundColor: SEGMENTS[i % SEGMENTS.length] }}
                    />
                  ))}
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink/80">
                  {perCategory.map(({ k, hours }, i) => (
                    <li key={k} className="flex items-center gap-1.5">
                      <i aria-hidden className="size-2 rounded-full" style={{ backgroundColor: SEGMENTS[i % SEGMENTS.length] }} />
                      {CATEGORIES[k].label} <b className="num font-semibold text-ink">{fmtHours(hours)}</b>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </motion.section>

        {live.map((a, i) => (
          <motion.section
            key={a.id}
            {...rise(2 + i)}
            className="-mx-1 mt-3 rounded-[26px] border border-[rgba(242,112,42,0.28)] bg-gradient-to-b from-[#2a1d15] to-[#1f1915] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_40px_-24px_rgba(242,112,42,0.45)]"
            aria-label="กิจกรรมที่กำลังดำเนินอยู่"
          >
            <div className="flex items-center gap-3.5">
              <img src={a.poster} alt="" className="size-16 shrink-0 rounded-2xl bg-surface-2 object-cover" />
              <div className="min-w-0">
                <p className="num flex items-center gap-2 text-[13px] text-[#f7a57a]">
                  <span aria-hidden className="live-dot size-2 shrink-0" />
                  กำลังดำเนินอยู่ ถึง {thTime(a.end)} น.
                </p>
                <Link to={`/a/${a.id}`} className="mt-[3px] line-clamp-2 block text-[17px] leading-[1.35] font-semibold">
                  {a.title}
                </Link>
                <p className="num mt-px flex gap-1 text-[13px] text-muted">
                  {a.place && <span className="min-w-0 truncate">{a.place}</span>}
                  <span className="shrink-0">รับ {fmtHours(a.hours)} ชั่วโมง</span>
                </p>
              </div>
            </div>
            <LinkButton to="/scan" variant="primary" className="mt-4 w-full">
              <QrCode size={22} /> สแกนรับชั่วโมง
            </LinkButton>
          </motion.section>
        ))}

        <motion.h2 {...rise(3 + live.length)} className="pt-8 text-[22px] font-semibold">
          กิจกรรมจิตอาสา
        </motion.h2>

        <motion.div {...rise(4 + live.length)} className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pt-3.5" role="group" aria-label="กรองตามหมวด">
          <FilterChip selected={ui.category === null} onClick={() => ui.set({ category: null })}>
            ทุกหมวด
          </FilterChip>
          {CATEGORY_KEYS.filter((k) => k !== 'other' || ui.category === 'other' || activities.some((a) => a.categoryKey === 'other')).map((k) => (
            <FilterChip key={k} selected={ui.category === k} onClick={() => ui.set({ category: k })}>
              {CATEGORIES[k].label}
            </FilterChip>
          ))}
        </motion.div>

        {inList && (
          <motion.div {...rise(5 + live.length)} className="mt-3">
            <DayFilter value={ui.when} onChange={(when) => ui.set({ when })} />
          </motion.div>
        )}

        {filtered && inList && (
          <p className="num mt-3 text-sm text-muted">
            พบ {feed.items.length} กิจกรรม{' '}
            <button className="font-semibold text-ink underline underline-offset-2" onClick={() => ui.set({ category: null, when: 'all' })}>
              ล้างตัวกรอง
            </button>
          </p>
        )}

        {!loaded ? (
          <div className="-mx-1 mt-6">
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
        ) : sections.length === 0 ? (
          <div className="-mx-1 mt-6 rounded-[22px] bg-surface px-6 py-12 text-center">
            <p className="text-lg font-semibold">{filtered ? 'ไม่พบกิจกรรมตามตัวกรอง' : 'ยังไม่มีกิจกรรมเปิดรับ'}</p>
            <p className="mt-2 text-muted">{filtered ? 'ลองเปลี่ยนตัวกรอง หรือล้างตัวกรอง' : 'กิจกรรมใหม่จะแสดงที่นี่'}</p>
          </div>
        ) : (
          sections.map((s) => (
            <section key={s.key} aria-label={s.title}>
              <div className="flex items-baseline justify-between pt-[26px] pb-3">
                <h2 className="text-[17px] font-semibold">
                  {s.title} <span className="num font-medium text-muted">{s.items.length}</span>
                </h2>
                {s.note && <p className="text-[13px] text-muted">{s.note}</p>}
              </div>
              <div className="-mx-1 flex flex-col gap-[22px]">
                {s.items.map((f, i) => (
                  <ActivityCard key={f.a.id} {...f} now={now} index={i} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  )
}
