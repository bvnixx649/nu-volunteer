import { useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ImageSquare, MapPin } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { HOUR_CHIPS } from '../../config'
import { categoryOf, CATEGORIES, CATEGORY_KEYS } from '../../data/categories'
import type { CategoryKey } from '../../data/types'
import { checkinSummary } from '../../lib/checkin'
import { toMs, ymd, posterChoices, type Draft } from '../../lib/draft'
import { thDate, thTime } from '../../lib/format'
import { getFix, type GeoError } from '../../lib/geo'
import { resizeToDataUrl } from '../../lib/image'
import { Button } from '../../ui/Button'
import { Chip } from '../../ui/Chip'
import { Field } from '../../ui/Field'
import { Switch } from '../../ui/Switch'
import { CheckinFields, type CheckinDraft } from './CheckinFields'

export type StepProps = { d: Draft; set: (p: Partial<Draft>) => void; errors: Record<string, string> }

export const TITLES = ['เลือกหมวด', 'ชื่อและรูป', 'วันเวลาและสถานที่', 'ชั่วโมงและการรับคน', 'การเช็คชื่อ', 'ติดต่อ', 'ตรวจทาน']

/** A rounded group that holds switches, like the sections of the check-in settings. */
function Group({ children }: { children: ReactNode }) {
  return <div className="rounded-[var(--radius-field)] bg-surface px-4 ring-1 ring-line">{children}</div>
}

/** Height-animated block for controls that only exist while a switch is on. */
function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="-m-1 overflow-hidden p-1"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const num = (s: string) => s.replace(/\D/g, '').slice(0, 4)

/* Step 1 ------------------------------------------------------------------------------------------ */

export function StepCategory({ d, onPick }: { d: Draft; onPick: (k: CategoryKey) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {CATEGORY_KEYS.map((k) => {
        const c = CATEGORIES[k]
        const on = d.categoryKey === k
        return (
          <button
            key={k}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(k)}
            className={`pressable overflow-hidden rounded-[var(--radius-card)] bg-surface text-left shadow-soft ring-1 transition-shadow duration-200 ${on ? 'ring-2 ring-accent' : 'ring-line'}`}
          >
            <img src={posterChoices(k)[0]} alt="" className="aspect-[4/3] w-full object-cover" />
            <span className="block px-3.5 py-3">
              <span className="block font-semibold">{c.label}</span>
              <span className="num block text-sm text-muted">{c.hours} ชม.</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* Step 2 ------------------------------------------------------------------------------------------ */

const areaClass =
  'min-h-44 w-full resize-none rounded-[var(--radius-field)] bg-surface px-4 py-3 text-[17px] leading-relaxed ring-1 ring-line transition-shadow duration-150 outline-none placeholder:text-muted focus:ring-2 focus:ring-accent'

function PosterTile({ src, selected, label, onClick }: { src: string; selected: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onClick}
      className={`pressable relative aspect-[4/3] w-36 shrink-0 snap-start overflow-hidden rounded-[var(--radius-field)] ring-1 ${selected ? 'ring-2 ring-accent' : 'ring-line'}`}
    >
      <img src={src} alt="" className="size-full object-cover" />
      {selected && (
        <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-accent-strong text-on-accent">
          <Check size={14} weight="bold" />
        </span>
      )}
    </button>
  )
}

export function StepTitle({ d, set, errors }: StepProps) {
  const file = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const choices = d.categoryKey ? posterChoices(d.categoryKey) : []
  const own = d.poster && !choices.includes(d.poster)

  const upload = async (f?: File) => {
    if (!f) return
    setBusy(true)
    try {
      set({ poster: await resizeToDataUrl(f) })
    } catch {
      toast.error('ใช้รูปนี้ไม่ได้ ลองรูปอื่น')
    } finally {
      setBusy(false)
      if (file.current) file.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <Field label="ชื่อกิจกรรม" value={d.title} onChange={(e) => set({ title: e.target.value })} error={errors.title} autoComplete="off" />

      <div className="flex flex-col gap-2">
        <span id="poster-label" className="text-[15px] font-medium">
          รูปปก
        </span>
        <div role="radiogroup" aria-labelledby="poster-label" className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto px-5 py-1">
          {own && <PosterTile src={d.poster} selected label="รูปของคุณ" onClick={() => {}} />}
          {choices.map((p, i) => (
            <PosterTile key={p} src={p} selected={d.poster === p} label={`รูปเทมเพลต ${i + 1}`} onClick={() => set({ poster: p })} />
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={() => file.current?.click()}
            className="pressable flex aspect-[4/3] w-36 shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-[var(--radius-field)] bg-surface font-medium text-muted border-2 border-dashed border-line disabled:opacity-45"
          >
            <ImageSquare size={26} />
            {busy ? 'กำลังย่อรูป' : 'อัปโหลดรูป'}
          </button>
        </div>
        <input ref={file} type="file" accept="image/*" hidden data-testid="poster-file" onChange={(e) => upload(e.target.files?.[0])} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="desc" className="text-[15px] font-medium">
          คำอธิบาย
        </label>
        <textarea id="desc" rows={7} className={areaClass} value={d.description} onChange={(e) => set({ description: e.target.value })} />
      </div>
    </div>
  )
}

/* Step 3 ------------------------------------------------------------------------------------------ */

const GEO_MSG: Record<GeoError, string> = {
  denied: 'ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง เปิดสิทธิ์ในตั้งค่าเบราว์เซอร์แล้วลองอีกครั้ง',
  timeout: 'หาตำแหน่งไม่ทัน ลองอีกครั้งในที่โล่ง',
  unavailable: 'หาตำแหน่งไม่ได้ ลองอีกครั้งในที่โล่ง',
  unsupported: 'เครื่องนี้ไม่รองรับการหาตำแหน่ง',
}

export function StepWhen({ d, set, errors }: StepProps) {
  const [busy, setBusy] = useState(false)
  const [geoError, setGeoError] = useState<string>()
  const locate = async () => {
    setBusy(true)
    setGeoError(undefined)
    try {
      const f = await getFix()
      set({ lat: f.lat, lng: f.lng, accuracy: Math.round(f.acc) })
    } catch (e) {
      setGeoError(GEO_MSG[e as GeoError] ?? GEO_MSG.unavailable)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-col gap-5">
      <Field label="วันที่จัดกิจกรรม" type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} />
      <div className="grid grid-cols-2 items-start gap-3">
        <Field label="เวลาเริ่ม" type="time" className="min-w-0" value={d.startT} onChange={(e) => set({ startT: e.target.value })} />
        <Field label="เวลาจบ" type="time" className="min-w-0" value={d.endT} onChange={(e) => set({ endT: e.target.value })} error={errors.endT} />
      </div>
      <Field label="สถานที่" value={d.place} onChange={(e) => set({ place: e.target.value })} autoComplete="off" />
      <div className="flex flex-col gap-2.5">
        <Button type="button" variant="secondary" loading={busy} onClick={locate} className="w-full">
          <MapPin size={20} weight="bold" /> ใช้ตำแหน่งที่ฉันอยู่ตอนนี้
        </Button>
        {geoError && <p className="text-sm text-bad">{geoError}</p>}
        {d.lat !== undefined && d.lng !== undefined && !geoError && (
          <p className="num text-sm text-muted" data-testid="pin">
            บันทึกตำแหน่ง {d.lat.toFixed(5)}, {d.lng.toFixed(5)}
            {d.accuracy !== undefined && ` คลาดเคลื่อนราว ${d.accuracy} ม.`}
          </p>
        )}
      </div>
    </div>
  )
}

/* Step 4 ------------------------------------------------------------------------------------------ */

export function StepPeople({ d, set, errors }: StepProps) {
  const toggleScheduled = (on: boolean) => {
    if (!on) return set({ scheduled: false, hideUntilOpen: false })
    const before = d.date ? ymd(toMs(d.date, '00:00') - 86_400_000) : ''
    set({ scheduled: true, openDate: d.openDate || before, openT: d.openT || '08:00' })
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Field
          label="ชั่วโมงที่ได้ต่อคน"
          type="number"
          inputMode="numeric"
          min={1}
          max={99}
          value={d.hours}
          onChange={(e) => set({ hours: num(e.target.value) })}
          error={errors.hours}
        />
        <div className="flex flex-wrap gap-2">
          {HOUR_CHIPS.map((n) => (
            <Chip key={n} selected={d.hours === String(n)} onClick={() => set({ hours: String(n) })}>
              {n} ชม.
            </Chip>
          ))}
        </div>
      </div>

      <Group>
        <Switch checked={d.capLimit} onChange={(v) => set({ capLimit: v })} label="จำกัดจำนวน" />
        <Reveal show={d.capLimit}>
          <div className="pb-4">
            <Field label="รับได้กี่คน" type="number" inputMode="numeric" min={1} value={d.capacity} onChange={(e) => set({ capacity: num(e.target.value) })} error={errors.capacity} />
          </div>
        </Reveal>
      </Group>

      <Group>
        <Switch
          checked={d.walkIn}
          onChange={(v) => set({ walkIn: v })}
          label="รับ walk-in"
          hint={d.walkIn ? 'สแกนรับชั่วโมงได้เลย ขึ้นป้าย มาเพิ่ม ในรายชื่อ' : 'สแกนได้เฉพาะคนที่ลงชื่อไว้'}
        />
      </Group>

      <Group>
        <Switch checked={d.scheduled} onChange={toggleScheduled} label="ตั้งเวลาเปิดรับสมัคร" hint={d.scheduled ? undefined : 'ไม่ตั้ง นิสิตสมัครได้ทันทีที่เผยแพร่'} />
        <Reveal show={d.scheduled}>
          <div className="flex flex-col gap-4 pb-3">
            <div className="grid grid-cols-2 items-start gap-3">
              <Field label="วันที่เปิดรับ" type="date" className="min-w-0" value={d.openDate} onChange={(e) => set({ openDate: e.target.value })} error={errors.openDate} />
              <Field label="เวลาเปิดรับ" type="time" className="min-w-0" value={d.openT} onChange={(e) => set({ openT: e.target.value })} />
            </div>
            <Switch
              checked={d.hideUntilOpen}
              onChange={(v) => set({ hideUntilOpen: v })}
              label="ซ่อนจนถึงเวลาเปิดรับ"
              hint={d.hideUntilOpen ? 'นิสิตไม่เห็นกิจกรรมจนถึงเวลาเปิด' : 'นิสิตเห็นล่วงหน้าแต่ยังสมัครไม่ได้'}
            />
          </div>
        </Reveal>
      </Group>

      <Field
        label="ยกเลิกฟรีได้กี่วันก่อนงาน"
        type="number"
        inputMode="numeric"
        min={0}
        max={14}
        value={d.cancelDays}
        onChange={(e) => set({ cancelDays: num(e.target.value) })}
        error={errors.cancelDays}
        hint="0 คือยกเลิกได้ถึงวันงาน"
      />
    </div>
  )
}

/* Step 5 ------------------------------------------------------------------------------------------ */

export function StepCheckin({ d, set }: StepProps) {
  const value: CheckinDraft = { qrMode: d.qrMode, qrInterval: d.qrInterval, locMode: d.locMode, radius: d.radius, walkIn: d.walkIn }
  const onChange = (v: CheckinDraft) => {
    const changed: Partial<Draft> = {}
    for (const k of ['qrMode', 'qrInterval', 'locMode', 'radius'] as const) if (v[k] !== d[k]) Object.assign(changed, { [k]: v[k] })
    set(changed)
  }
  return <CheckinFields value={value} onChange={onChange} hideWalkIn />
}

/* Step 6 ------------------------------------------------------------------------------------------ */

export function StepContact({ d, set, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <Field label="ชื่อผู้คุม" value={d.supName} onChange={(e) => set({ supName: e.target.value })} autoComplete="name" />
      <Field label="เบอร์ติดต่อ" type="tel" inputMode="tel" autoComplete="tel" value={d.phone} onChange={(e) => set({ phone: e.target.value })} />
      <Group>
        <Switch checked={d.chatEnabled} onChange={(v) => set({ chatEnabled: v })} label="เปิดห้องแชท" hint="นิสิตที่ลงชื่อคุยกับผู้คุมในแอพได้" />
        <Reveal show={d.chatEnabled}>
          <div className="pb-4">
            <Field
              label="ลิงก์ OpenChat"
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="https://line.me/ti/g2/"
              value={d.openChatUrl}
              onChange={(e) => set({ openChatUrl: e.target.value })}
              error={errors.openChatUrl}
            />
          </div>
        </Reveal>
      </Group>
    </div>
  )
}

/* Step 7 ------------------------------------------------------------------------------------------ */

function SummaryRow({ label, onEdit, children }: { label: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <p className="w-24 shrink-0 pt-px text-[15px] text-muted">{label}</p>
      <div className="num min-w-0 flex-1 text-[15px] leading-relaxed break-words">{children}</div>
      <button type="button" onClick={onEdit} aria-label={`แก้${label}`} className="pressable -my-1.5 -mr-2 min-h-11 shrink-0 rounded-full px-3 font-semibold text-accent-strong">
        แก้
      </button>
    </div>
  )
}

export function StepReview({ d, onJump }: { d: Draft; onJump: (step: number) => void }) {
  const start = toMs(d.date, d.startT)
  const end = toMs(d.date, d.endT)
  const open = d.scheduled ? toMs(d.openDate, d.openT) : NaN
  const valid = !Number.isNaN(start) && !Number.isNaN(end)
  const when = valid ? `${thDate(start)} ${thTime(start)} ถึง ${thTime(end)} น.` : ''
  const cancel = Number(d.cancelDays) === 0 ? 'ยกเลิกฟรีถึงวันงาน' : `ยกเลิกฟรีถึง ${d.cancelDays} วันก่อนงาน`
  const contact = [d.supName, d.phone].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-6">
      <article className="overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-lift" data-testid="preview">
        <div className="relative">
          {d.poster && <img src={d.poster} alt="" className="aspect-[16/9] w-full object-cover" />}
          <span className="num absolute top-3 right-3 rounded-full bg-surface px-3 py-1 text-[15px] font-semibold shadow-soft">{d.hours} ชม.</span>
        </div>
        <div className="px-5 py-4">
          <h2 className="line-clamp-2 text-xl leading-snug font-bold">{d.title}</h2>
          <p className="num mt-1.5 text-muted">{when}</p>
          <p className="mt-0.5 text-muted">{d.place}</p>
        </div>
      </article>

      <div className="divide-y divide-line">
        <SummaryRow label="หมวด" onEdit={() => onJump(1)}>
          {d.categoryKey ? categoryOf(d.categoryKey).label : ''}
        </SummaryRow>
        <SummaryRow label="ชื่อและรูป" onEdit={() => onJump(2)}>
          <span className="line-clamp-2">{d.title}</span>
        </SummaryRow>
        <SummaryRow label="วันเวลาและสถานที่" onEdit={() => onJump(3)}>
          {when}
          <br />
          {d.place}
          {d.lat !== undefined && (
            <>
              <br />
              ปักหมุดแล้ว
            </>
          )}
        </SummaryRow>
        <SummaryRow label="ชั่วโมงและการรับคน" onEdit={() => onJump(4)}>
          {d.hours} ชม. ต่อคน
          <br />
          {d.capLimit ? `จำกัด ${d.capacity} คน` : 'ไม่จำกัดจำนวน'}
          <br />
          {d.walkIn ? 'รับ walk-in' : 'ไม่รับ walk-in'}
          {d.scheduled && !Number.isNaN(open) && (
            <>
              <br />
              เปิดรับ {thDate(open)} {thTime(open)} น.{d.hideUntilOpen && ' ซ่อนจนถึงเวลาเปิด'}
            </>
          )}
          <br />
          {cancel}
        </SummaryRow>
        <SummaryRow label="การเช็คชื่อ" onEdit={() => onJump(5)}>
          {checkinSummary(d)}
        </SummaryRow>
        <SummaryRow label="ติดต่อ" onEdit={() => onJump(6)}>
          {contact}
          {d.chatEnabled && (
            <>
              <br />
              เปิดห้องแชท{d.openChatUrl.trim() && ' มีลิงก์ OpenChat'}
            </>
          )}
        </SummaryRow>
      </div>
    </div>
  )
}
