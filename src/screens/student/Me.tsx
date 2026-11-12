import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, CaretRight, ShieldCheck, SignOut } from '@phosphor-icons/react'
import { useMine } from '../../data/mine'
import { CATEGORIES } from '../../data/categories'
import { MESSAGES_ON, STRIKE_LIMIT } from '../../config'
import { fmtHours, initial, thDate } from '../../lib/format'
import { useNow } from '../../lib/hooks'
import { creditsLeft, hoursByCategory, semesterEnd, strikesOf } from '../../lib/student'
import { useDevice } from '../../store'
import { Button } from '../../ui/Button'
import { CountUp } from '../../ui/CountUp'
import { InstallCard } from '../../ui/InstallCard'
import { Sheet } from '../../ui/Sheet'

const card = 'rounded-[var(--radius-card)] bg-surface p-5'

const TONES = {
  neutral: 'bg-surface-2 text-muted',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
}

/** Same shape as StatusTag, for states that are not activity stages. */
function Pill({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={`num inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-[12.5px] leading-none font-semibold whitespace-nowrap ${TONES[tone]}`}>
      {children}
    </span>
  )
}

function Menu({ icon, label, hint, onClick, danger }: { icon: ReactNode; label: string; hint?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className="pressable flex min-h-16 w-full items-center gap-4 px-5 text-left">
      <span className={danger ? 'text-bad' : 'text-muted'}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={`block font-medium ${danger ? 'text-bad' : ''}`}>{label}</span>
        {hint && <span className="block truncate text-[13.5px] text-muted">{hint}</span>}
      </span>
      {!danger && <CaretRight size={18} className="text-muted" />}
    </button>
  )
}

/** Transcript, history, credits and settings. */
export default function Me() {
  const nav = useNavigate()
  const { student, activities, regs, credits } = useMine()
  const sup = useDevice((s) => s.sup)
  const signOut = useDevice((s) => s.signOut)
  const [confirm, setConfirm] = useState(false)
  const t = useNow()
  const byId = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities])

  const history = useMemo(() => [...credits].sort((a, b) => b.at - a.at), [credits])
  const total = credits.reduce((s, c) => s + c.hours, 0)
  const perCategory = hoursByCategory(credits, activities)
  const strikes = useMemo(() => strikesOf(activities, regs, credits, t), [activities, regs, credits, t])
  const left = creditsLeft(strikes)

  return (
    <main className="mx-auto max-w-lg px-5 pt-[calc(1.5rem+env(safe-area-inset-top,0px))]">
      <div className="flex items-center gap-4">
        <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-surface-2 text-2xl font-semibold">
          {initial(student?.name ?? '')}
        </span>
        <div className="min-w-0">
          <h1 className="line-clamp-2 text-[22px] leading-snug font-bold tracking-tight break-words">{student?.name}</h1>
          <p className="num text-[13.5px] text-muted">รหัสนิสิต {student?.id}</p>
        </div>
      </div>

      <section className={`${card} mt-6`} aria-label="บันทึกชั่วโมงจิตอาสา">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}nu-emblem.png`} alt="" width={40} height={40} className="size-10 shrink-0 object-contain" />
          <div className="min-w-0">
            <h2 className="leading-snug font-semibold">บันทึกชั่วโมงจิตอาสา</h2>
            <p className="num text-[13.5px] text-muted">มหาวิทยาลัยนเรศวร ปีการศึกษา 2569</p>
          </div>
        </div>
        <p className="mt-6 flex items-baseline gap-2.5">
          <CountUp value={total} className="text-[64px] leading-none font-semibold tracking-tight" />
          <span className="text-[17px] text-muted">ชั่วโมง</span>
        </p>
        <p className="num mt-2 text-[13.5px] text-muted">จาก {credits.length} กิจกรรม</p>
        {perCategory.length > 0 && (
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {perCategory.map(({ k, hours }) => (
              <li key={k} className="flex items-center justify-between gap-3 py-3 last:pb-0">
                <span>{CATEGORIES[k].label}</span>
                <span className="num font-semibold">{fmtHours(hours)} ชม.</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${card} mt-3`}>
        <h2 className="text-xl font-semibold">ประวัติเข้าร่วมกิจกรรม</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-muted">ยังไม่มีกิจกรรมที่ได้รับชั่วโมง</p>
        ) : (
          <ul className="mt-1 divide-y divide-line">
            {history.map((c) => {
              const a = byId.get(c.activityId)
              return (
                <li key={c.activityId}>
                  <Link to={`/a/${c.activityId}`} className="pressable flex items-start gap-3 py-4 [li:last-child>&]:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 leading-snug font-medium">{a?.title ?? 'กิจกรรมจิตอาสา'}</p>
                      <p className="num mt-1 text-[13.5px] text-muted">
                        {thDate(c.at)} {c.items !== undefined ? `แลกขวด ${c.items} ขวด` : c.method === 'manual' ? 'ยืนยันโดยผู้ดูแล' : 'สแกน QR'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <p className="num text-lg leading-none font-semibold">+{fmtHours(c.hours)}</p>
                      {a?.recordedAt ? <Pill tone="ok">บันทึกแล้ว</Pill> : a?.submittedAt ? <Pill tone="warn">รอบันทึกชั่วโมง</Pill> : <Pill tone="neutral">รอผู้จัดยืนยัน</Pill>}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className={`${card} mt-3`}>
        <p className="num font-semibold">
          สิทธิ์ยกเลิกคงเหลือ <span className={left === 0 ? 'text-bad' : ''}>{left}</span> จาก {STRIKE_LIMIT}
        </p>
        <p className="num mt-1 text-[13.5px] leading-relaxed text-muted">
          {left === 0 ? 'สิทธิ์หมดแล้ว ลงทะเบียนไม่ได้จนจบภาค' : 'ยกเลิกหลังกำหนดหรือไม่มา จะถูกหักสิทธิ์ 1 ครั้ง'} สิทธิ์กลับมาครบ {STRIKE_LIMIT} ครั้ง วันที่ {thDate(semesterEnd(t))}
        </p>
        {strikes.length > 0 && (
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {strikes.map((x) => (
              <li key={`${x.kind}-${x.a.id}`}>
                {/* With messages off the row opens the activity, where the supervisor's phone number is. */}
                <Link to={MESSAGES_ON ? `/a/${x.a.id}/dm` : `/a/${x.a.id}`} className="pressable flex items-center gap-3 py-3.5 [li:last-child>&]:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 leading-snug font-medium">{x.a.title}</p>
                    <p className="num mt-0.5 text-[13.5px] text-muted">
                      {thDate(x.at)} {x.kind === 'late' ? 'ยกเลิกหลังกำหนด' : 'ลงทะเบียนแต่ไม่มา'}
                    </p>
                    {MESSAGES_ON && !x.waived && <p className="mt-0.5 text-[13.5px] font-medium text-accent">แจ้งเหตุผลกับผู้ดูแล</p>}
                  </div>
                  {x.waived ? <Pill tone="ok">คืนสิทธิ์แล้ว</Pill> : <Pill tone="bad">-1</Pill>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-3">
        <InstallCard />
      </div>

      <div className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
        <Menu icon={<Bell size={24} />} label="การแจ้งเตือน" onClick={() => nav('/settings/notify')} />
        <Menu icon={<ShieldCheck size={24} />} label="สำหรับผู้ดูแลกิจกรรม" hint={sup ? sup.orgName : 'ใช้รหัสจากศูนย์จิตอาสา'} onClick={() => nav(sup ? '/sup' : '/sup/login')} />
        <Menu icon={<SignOut size={24} />} label="ออกจากระบบ" danger onClick={() => setConfirm(true)} />
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="ออกจากระบบ">
        <div className="flex flex-col gap-3">
          <p className="mb-2 text-muted">ชั่วโมงสะสมยังอยู่ เข้าใหม่ได้ด้วยรหัสนิสิตและชื่อ</p>
          <Button
            size="lg"
            variant="danger"
            className="w-full"
            onClick={() => {
              signOut()
              nav('/welcome', { replace: true })
            }}
          >
            ออกจากระบบ
          </Button>
          <Button size="lg" variant="ghost" className="w-full" onClick={() => setConfirm(false)}>
            ยกเลิก
          </Button>
        </div>
      </Sheet>
    </main>
  )
}
