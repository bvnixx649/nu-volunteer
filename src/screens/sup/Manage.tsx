import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CaretLeft, CaretRight, FileXls, GearSix, ListChecks, PencilSimple, QrCode, Recycle, UserPlus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { api, now } from '../../data/api'
import type { Activity, Credit, Registration } from '../../data/types'
import { thDate, thTime } from '../../lib/format'
import { downloadAdminXlsx, downloadSupXlsx } from '../../lib/excel'
import { isBottle } from '../../lib/bottle'
import { creditWhen, rosterRows, type RosterFilter, type RosterRow } from '../../lib/roster'
import { checkinParts } from '../../lib/checkin'
import { canEdit, canEditRoster, closedAt, ownsActivity, qrClosed, stage } from '../../lib/stage'
import { useDevice } from '../../store'
import { Button } from '../../ui/Button'
import { NotYours } from './NotYours'
import { Roster, Flags } from './Roster'
import { EditHoursSheet } from './EditHoursSheet'
import { AddPersonSheet } from './AddPersonSheet'
import { BottleSheet } from './BottleSheet'
import { CheckinSettingsSheet } from './CheckinSettingsSheet'
import { ManageSummary } from './ManageSummary'
import { PullToQr } from './PullToQr'
import { QrPanel } from './QrPanel'
import { ScanFeed } from './ScanFeed'
import { StageActions } from './StageActions'
import { StatusTag } from '../../ui/StatusTag'

/** A tappable row inside the settings group: icon, title with a detail line, chevron. */
function Row({ icon, title, detail, onClick, disabled }: { icon: ReactNode; title: string; detail: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="pressable flex min-h-[4.5rem] w-full items-center gap-3.5 px-4 py-3.5 text-left disabled:opacity-45">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold">{title}</span>
        <span className="num mt-0.5 block text-[13.5px] text-muted">{detail}</span>
      </span>
      <CaretRight size={18} className="shrink-0 text-faint" aria-hidden />
    </button>
  )
}

const useWide = () => {
  const q = '(min-width: 900px)'
  const [wide, setWide] = useState(() => matchMedia(q).matches)
  useEffect(() => {
    const m = matchMedia(q)
    const on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return wide
}

/** The QR works while the activity runs, or any time on its day. */
const isLive = (a: Activity) => {
  const t = now()
  return (t >= a.start && t <= a.end) || new Date(t).toDateString() === new Date(a.start).toDateString()
}

export default function Manage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const sup = useDevice((s) => s.sup)
  const wide = useWide()
  const [activity, setActivity] = useState<Activity | null | undefined>(undefined)
  const [regs, setRegs] = useState<Registration[]>([])
  const [credits, setCredits] = useState<Credit[]>([])
  const [creditsReady, setCreditsReady] = useState(false)
  const [selectedId, setSelectedId] = useState<string>()
  const [editing, setEditing] = useState<string>()
  const [adding, setAdding] = useState(false)
  const [bottles, setBottles] = useState(false)
  const [settings, setSettings] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [filter, setFilter] = useState<RosterFilter>('all')
  const [params, setParams] = useSearchParams()

  useEffect(() => api.watchActivity(id, setActivity), [id])
  useEffect(() => api.watchRegistrations(id, setRegs), [id])
  useEffect(
    () =>
      api.watchCredits(id, (c) => {
        setCredits(c)
        setCreditsReady(true)
      }),
    [id],
  )

  const rows = useMemo(() => rosterRows(regs, credits, 'all', ''), [regs, credits])
  const find = (sid?: string): RosterRow | null => (sid ? (rows.find((r) => r.studentId === sid) ?? null) : null)
  const openFullScreenQr = useCallback(() => nav(`/sup/a/${id}/qr`), [nav, id])
  const counts = useMemo(
    () => ({
      notYet: rosterRows(regs, credits, 'notScanned', '').length,
      walkIn: rosterRows(regs, credits, 'walkIn', '').length,
      flagged: rosterRows(regs, credits, 'flagged', '').length,
    }),
    [regs, credits],
  )

  // `?qr=1` (from the live card on the home page) opens the QR as soon as the page has loaded.
  const wantsQr = params.get('qr') === '1'
  const canQr = !!activity && isLive(activity) && !isBottle(activity) && !qrClosed(activity)
  useEffect(() => {
    if (!wantsQr || !activity) return
    if (canQr) setQrOpen(true)
    setParams({}, { replace: true })
  }, [wantsQr, activity, canQr, setParams])

  if (!sup) return <Navigate to="/sup/login" replace />
  if (activity === undefined) return null
  if (!activity) return <p className="p-6 text-muted">ไม่พบกิจกรรมนี้</p>
  if (!ownsActivity(activity, sup)) return <NotYours />

  const selected = find(selectedId)
  /** Details and check-in settings lock once the roster is sent; the roster itself stays open to the centre admin until it records it (SPEC 14.1). */
  const editable = canEdit(activity)
  const rosterOpen = canEditRoster(activity, sup.admin)
  const closed = !!closedAt(activity, now())
  const bottle = isBottle(activity)
  const st = stage(activity)
  const started = st !== 'scheduled' && st !== 'open'
  /** After the end, closing and sending the roster take over as the main action. */
  const ended = started && st !== 'live'
  /** The QR button is the one orange button only while the activity runs (or on its day). */
  const running = !ended && isLive(activity)
  /** The pull-down reveal, and the button that does the same, work while the activity runs or on its day. */
  const qrUsable = isLive(activity) && !bottle && !qrClosed(activity)
  const showQr = () => (qrUsable ? setQrOpen(true) : openFullScreenQr())
  const pick = (r: RosterRow) => {
    setSelectedId(r.studentId)
    if (!wide && rosterOpen) setEditing(r.studentId)
  }
  const toRoster = (f: RosterFilter) => {
    setQrOpen(false)
    setFilter(f)
    requestAnimationFrame(() => document.getElementById('roster')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  const exportXlsx = async () => {
    try {
      if (sup.admin) {
        const out = await downloadAdminXlsx(activity, credits)
        toast.success('ดาวน์โหลดไฟล์ Excel แล้ว', { description: `${out.length} คนได้รับชั่วโมง` })
        return
      }
      const out = await downloadSupXlsx(activity, regs, credits)
      toast.success('ดาวน์โหลดไฟล์ Excel แล้ว', { description: `${out.length} รายชื่อ ได้รับชั่วโมง ${out.filter((r) => r['สถานะ'] !== 'ไม่มา').length} คน` })
    } catch {
      toast.error('สร้างไฟล์ Excel ไม่ได้')
    }
  }

  return (
    <PullToQr enabled={qrUsable} open={qrOpen} onOpenChange={setQrOpen} layer={<QrPanel activity={activity} />}>
      <main className="mx-auto max-w-6xl px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
        <Link to="/sup" className="pressable -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-muted">
          <CaretLeft size={20} /> กิจกรรมทั้งหมด
        </Link>
        <div className="mt-2">
          {st === 'live' ? (
            <p className="num flex items-center gap-2 text-[13.5px] font-medium text-ok">
              <span className="live-dot-ok size-2 shrink-0" aria-hidden />
              กำลังดำเนินการ ถึง {thTime(activity.end)} น.
            </p>
          ) : (
            <StatusTag stage={st} />
          )}
        </div>
        <h1 className="mt-2 text-[26px] leading-[1.25] font-bold tracking-tight text-balance">{activity.title}</h1>
        <p className="num mt-1.5 text-[15px] text-muted">
          {thDate(activity.start)} {thTime(activity.start)} ถึง {thTime(activity.end)} น. {activity.place}
        </p>

        <div className="mt-5 min-[900px]:grid min-[900px]:grid-cols-2 min-[900px]:items-start min-[900px]:gap-x-6">
          <div>
            <ManageSummary activity={activity} counts={counts} bottle={bottle} onFilter={toRoster} />

            {bottle ? (
              <div className="mt-3">
                <Button size="lg" variant={ended ? 'secondary' : 'accent'} className="w-full" disabled={!rosterOpen} onClick={() => setBottles(true)}>
                  <Recycle size={22} weight="bold" /> บันทึกขวด
                </Button>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                {!qrClosed(activity) && (
                  <Button size="lg" variant={running ? 'accent' : 'secondary'} onClick={showQr}>
                    <QrCode size={22} weight="bold" /> แสดง QR
                  </Button>
                )}
                <Button size="lg" variant="secondary" className="px-5" disabled={!rosterOpen} onClick={() => setAdding(true)}>
                  <UserPlus size={22} /> เพิ่มรายชื่อ
                </Button>
              </div>
            )}
            {!rosterOpen && <p className="mt-3 px-1 text-sm text-muted">{sup.admin ? 'บันทึกลงระบบแล้ว แก้ไม่ได้' : 'ส่งรายชื่อแล้ว แก้ไม่ได้'}</p>}

            <div className="mt-4 flex flex-col gap-4 empty:hidden">
              <StageActions activity={activity} regs={regs} credits={credits} admin={sup.admin} />
            </div>
          </div>

          <div>
            {st === 'live' && <ScanFeed credits={credits} ready={creditsReady} />}

            <h2 className="px-1 pt-8 pb-3 text-xl font-semibold">การตั้งค่าและเอกสาร</h2>
            <section className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
              {!bottle && <Row icon={<GearSix size={22} />} disabled={!editable} onClick={() => setSettings(true)} title="การเช็คชื่อ" detail={
                    <span className="flex flex-wrap gap-x-3">
                      {checkinParts(activity).map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </span>
                  }
                />}
              {editable && <Row icon={<PencilSimple size={22} />} onClick={() => nav(`/sup/edit/${id}`)} title="แก้ไขรายละเอียดกิจกรรม" detail="ชื่อ รูปปก วันเวลา และสถานที่" />}
              <Row icon={<ListChecks size={22} />} onClick={() => nav(`/sup/a/${id}/roster`)} title="ตรวจสอบรายชื่อ" detail={sup.admin ? 'ตารางรายชื่อพร้อมเวลายืนยัน' : 'ตารางเดียวกับไฟล์ Excel'} />
              {started && <Row icon={<FileXls size={22} />} onClick={exportXlsx} title="ดาวน์โหลดไฟล์ Excel" detail={sup.admin ? 'ผู้ได้รับชั่วโมงพร้อมหน่วยงานและหมวด' : 'รายชื่อพร้อมชั่วโมงของแต่ละคน'} />}
            </section>
          </div>
        </div>

        <div className="mt-9 grid gap-6 min-[900px]:grid-cols-[1fr_360px]">
          <Roster regs={regs} credits={credits} selected={wide ? selectedId : undefined} closed={closed} onSelect={pick} filter={filter} onFilter={setFilter} />
          {wide && (
            <aside className="sticky top-4 self-start rounded-[var(--radius-card)] bg-surface p-5">
              {selected ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xl font-semibold">{selected.name}</p>
                  <p className="num text-muted">{selected.studentId}</p>
                  <p className="num text-4xl font-semibold tracking-tight">{selected.credit ? `${selected.credit.hours} ชม.` : 'ยังไม่ได้รับชั่วโมง'}</p>
                  {selected.credit && (
                    <p className="num text-sm text-muted">
                      {creditWhen(selected.credit)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 empty:hidden">
                    <Flags row={selected} closed={closed} />
                  </div>
                  {rosterOpen ? (
                    <Button className="mt-2" onClick={() => setEditing(selected.studentId)}>
                      {selected.credit ? 'แก้ชั่วโมง' : 'ให้ชั่วโมง'}
                    </Button>
                  ) : (
                    <p className="text-sm text-muted">{sup.admin ? 'บันทึกลงระบบแล้ว แก้ไม่ได้' : 'ส่งรายชื่อแล้ว แก้ไม่ได้'}</p>
                  )}
                </div>
              ) : (
                <p className="text-muted">เลือกรายชื่อทางซ้าย</p>
              )}
            </aside>
          )}
        </div>
      </main>

      <EditHoursSheet row={find(editing)} activity={activity} by={sup.name} onClose={() => setEditing(undefined)} />
      <CheckinSettingsSheet open={settings} activity={activity} onClose={() => setSettings(false)} />
      <BottleSheet open={bottles} activity={activity} by={sup.name} onClose={() => setBottles(false)} />
      <AddPersonSheet open={adding} activity={activity} by={sup.name} onClose={() => setAdding(false)} />
    </PullToQr>
  )
}
