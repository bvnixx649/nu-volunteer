import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, CaretRight, ShieldCheck, SignOut } from '@phosphor-icons/react'
import { useMine } from '../../data/mine'
import { CATEGORIES, CATEGORY_KEYS } from '../../data/categories'
import { STRIKE_LIMIT } from '../../config'
import { fmtHours, thDate } from '../../lib/format'
import { useNow } from '../../lib/hooks'
import { creditsLeft, semesterEnd, semesterNumber, strikesOf } from '../../lib/student'
import { useDevice } from '../../store'
import { Button } from '../../ui/Button'
import { CountUp } from '../../ui/CountUp'
import { InstallCard } from '../../ui/InstallCard'
import { Sheet } from '../../ui/Sheet'

const card = 'rounded-[var(--radius-card)] bg-surface p-5 shadow-soft'

function Chip({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`inline-flex h-6 items-center rounded-md px-2 text-xs font-medium whitespace-nowrap ${tone}`}>{children}</span>
}

function Menu({ icon, label, hint, onClick, danger }: { icon: ReactNode; label: string; hint?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className="pressable flex min-h-16 w-full items-center gap-4 px-5 text-left">
      <span className={danger ? 'text-bad' : 'text-muted'}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={`block font-medium ${danger ? 'text-bad' : ''}`}>{label}</span>
        {hint && <span className="block truncate text-sm text-muted">{hint}</span>}
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
  const perCategory = CATEGORY_KEYS.map((k) => ({ k, hours: credits.filter((c) => byId.get(c.activityId)?.categoryKey === k).reduce((s, c) => s + c.hours, 0) })).filter((x) => x.hours > 0)
  const strikes = useMemo(() => strikesOf(activities, regs, credits, t), [activities, regs, credits, t])
  const left = creditsLeft(strikes)

  return (
    <main className="mx-auto max-w-lg px-5 pt-[calc(1.5rem+env(safe-area-inset-top,0px))]">
      <div className="flex items-center gap-4">
        <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-ink text-2xl font-bold text-bg">
          {[...(student?.name ?? '')][0]}
        </span>
        <div className="min-w-0">
          <h1 className="line-clamp-2 text-[22px] leading-snug font-bold tracking-tight break-words">{student?.name}</h1>
          <p className="num text-sm text-muted">รหัสนิสิต {student?.id}</p>
        </div>
      </div>

      <section className={`${card} mt-6`} aria-label="บันทึกชั่วโมงจิตอาสา">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}nu-emblem.png`} alt="" width={40} height={40} className="size-10 shrink-0 object-contain" />
          <div className="min-w-0">
            <h2 className="font-semibold">บันทึกชั่วโมงจิตอาสา</h2>
            <p className="num text-sm text-muted">มหาวิทยาลัยนเรศวร ปีการศึกษา 2569</p>
          </div>
        </div>
        <p className="mt-5 flex items-baseline gap-2">
          <CountUp value={total} className="text-6xl leading-none font-bold tracking-tight" />
          <span className="font-semibold text-muted">ชั่วโมง</span>
        </p>
        <p className="num mt-2 text-muted">จาก {credits.length} กิจกรรม</p>
        {perCategory.length > 0 && (
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {perCategory.map(({ k, hours }) => (
              <li key={k} className="flex items-center justify-between py-3">
                <span>{CATEGORIES[k].label}</span>
                <span className="num font-semibold">{fmtHours(hours)} ชม.</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${card} mt-4`}>
        <h2 className="text-xl font-semibold">ประวัติเข้าร่วมกิจกรรม</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-muted">ยังไม่มีกิจกรรมที่ได้รับชั่วโมง</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {history.map((c) => {
              const a = byId.get(c.activityId)
              return (
                <li key={c.activityId}>
                  <Link to={`/a/${c.activityId}`} className="pressable flex items-start gap-3 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 leading-snug">{a?.title ?? 'กิจกรรมจิตอาสา'}</p>
                      <p className="num mt-1 text-sm text-muted">
                        {thDate(c.at)} {c.items !== undefined ? `แลกขวด ${c.items} ขวด` : c.method === 'manual' ? 'ยืนยันโดยผู้ดูแล' : 'สแกน QR'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <p className="num text-lg leading-none font-bold">+{fmtHours(c.hours)}</p>
                      {a?.recordedAt ? <Chip tone="bg-ok-soft text-ok">บันทึกลงระบบแล้ว</Chip> : a?.submittedAt ? <Chip tone="bg-warn-soft text-warn">รอศูนย์บันทึก</Chip> : <Chip tone="bg-surface-2 text-muted">รอส่งรายชื่อ</Chip>}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className={`${card} mt-4`}>
        <p className="num font-semibold">
          สิทธิ์ยกเลิกคงเหลือ <span className={left === 0 ? 'text-bad' : ''}>{left}</span> จาก {STRIKE_LIMIT}
        </p>
        <p className="num mt-1 text-sm text-muted">
          {left === 0 ? 'สิทธิ์หมดแล้ว ลงทะเบียนไม่ได้จนจบภาค' : 'ยกเลิกหลังกำหนดหรือไม่มา จะถูกหักสิทธิ์ 1 ครั้ง'} ภาคการศึกษาที่ {semesterNumber(t)} เริ่มใหม่ {thDate(semesterEnd(t))}
        </p>
        {strikes.length > 0 && (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {strikes.map((x) => (
              <li key={`${x.kind}-${x.a.id}`}>
                <Link to={`/a/${x.a.id}/dm`} className="pressable flex items-center gap-3 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{x.a.title}</p>
                    <p className="num text-sm text-muted">
                      {thDate(x.at)} {x.kind === 'late' ? 'ยกเลิกหลังกำหนด' : 'ลงทะเบียนแต่ไม่มา'}
                    </p>
                    {!x.waived && <p className="text-sm font-medium text-accent">แจ้งเหตุผลกับผู้ดูแล</p>}
                  </div>
                  {x.waived ? <Chip tone="bg-ok-soft text-ok">คืนสิทธิ์แล้ว</Chip> : <Chip tone="bg-bad-soft text-bad">-1</Chip>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-4">
        <InstallCard />
      </div>

      <div className="mt-4 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft">
        <Menu icon={<Bell size={24} />} label="การแจ้งเตือน" onClick={() => nav('/settings/notify')} />
        <Menu icon={<ShieldCheck size={24} />} label="สำหรับผู้ดูแลกิจกรรม" hint={sup ? sup.orgName : 'ใช้รหัสจากศูนย์จิตอาสา'} onClick={() => nav(sup ? '/sup' : '/sup/login')} />
        <Menu icon={<SignOut size={24} />} label="ออกจากระบบ" danger onClick={() => setConfirm(true)} />
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="ออกจากระบบ">
        <div className="flex flex-col gap-4">
          <p className="text-muted">ชั่วโมงสะสมยังอยู่ เข้าใหม่ได้ด้วยรหัสนิสิตและชื่อ</p>
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
