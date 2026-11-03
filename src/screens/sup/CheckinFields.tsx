import type { ReactNode } from 'react'
import { ArrowsClockwise, Printer, Warning } from '@phosphor-icons/react'
import { QR_INTERVALS, RADIUS_OPTIONS } from '../../config'
import type { Activity } from '../../data/types'
import { Segmented } from '../../ui/Segmented'
import { Switch } from '../../ui/Switch'

/** The check-in settings an activity carries, plus whether it takes people who did not sign up. */
export type CheckinDraft = Pick<Activity, 'qrMode' | 'qrInterval' | 'locMode' | 'radius' | 'walkIn'>

type Props = { value: CheckinDraft; onChange: (v: CheckinDraft) => void; /** The create flow shows walk-in on its own. */ hideWalkIn?: boolean }

type OptionProps = { selected: boolean; icon: ReactNode; title: string; hint: string; onClick: () => void; children?: ReactNode }

/** A choice card. Extra controls for the chosen card sit inside it, under the text. */
function Option({ selected, icon, title, hint, onClick, children }: OptionProps) {
  return (
    <div className={`rounded-[var(--radius-field)] ring-1 transition-colors duration-200 ${selected ? 'bg-accent-soft/50 ring-2 ring-accent' : 'bg-surface ring-line'}`}>
      <button type="button" role="radio" aria-checked={selected} onClick={onClick} className="pressable flex w-full gap-3 px-4 py-3.5 text-left">
        <span className={`mt-0.5 shrink-0 ${selected ? 'text-accent' : 'text-muted'}`}>{icon}</span>
        <span>
          <span className="block text-[16px] font-semibold">{title}</span>
          <span className="mt-0.5 block text-sm text-muted">{hint}</span>
        </span>
      </button>
      {selected && children && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

/** QR, location and walk-in settings. Shared by the settings sheet and the create-activity flow. */
export function CheckinFields({ value, onChange, hideWalkIn }: Props) {
  const set = (patch: Partial<CheckinDraft>) => onChange({ ...value, ...patch })
  const dynamic = value.qrMode === 'dynamic'
  const locOn = value.locMode === 'on'
  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-col gap-3" role="radiogroup" aria-label="QR">
        <h3 className="font-semibold">QR</h3>
        <Option
          selected={dynamic}
          icon={<ArrowsClockwise size={22} weight="bold" />}
          title="QR เปลี่ยนอัตโนมัติ"
          hint="ต้องเปิดจอให้สแกนที่งาน"
          onClick={() => set({ qrMode: 'dynamic' })}
        >
          <Segmented
            label="เปลี่ยนทุก"
            value={value.qrInterval}
            onChange={(n) => set({ qrInterval: n })}
            options={QR_INTERVALS.map((n) => ({ value: n, label: `ทุก ${n} วิ` }))}
          />
        </Option>
        <Option
          selected={!dynamic}
          icon={<Printer size={22} weight="bold" />}
          title="QR แบบพิมพ์"
          hint="ใช้ภาพเดิมตลอดกิจกรรม"
          onClick={() => set({ qrMode: 'static' })}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-semibold">ตำแหน่ง</h3>
        <div className="rounded-[var(--radius-field)] bg-surface px-4 ring-1 ring-line">
          <Switch
            checked={locOn}
            onChange={(v) => set({ locMode: v ? 'on' : 'off' })}
            label="ตรวจสอบตำแหน่ง"
            hint={locOn ? 'นอกระยะยังได้ชั่วโมง แต่ทำเครื่องหมายไว้' : 'สแกนได้จากทุกที่'}
          />
          {locOn && (
            <div className="pb-4">
              <Segmented
                label="ระยะ"
                value={value.radius}
                onChange={(n) => set({ radius: n })}
                options={RADIUS_OPTIONS.map((n) => ({ value: n, label: `${n} ม.` }))}
              />
            </div>
          )}
        </div>
      </section>

      {!hideWalkIn && (
        <section className="flex flex-col gap-3">
          <h3 className="font-semibold">ผู้ไม่ได้ลงทะเบียน</h3>
          <div className="rounded-[var(--radius-field)] bg-surface px-4 ring-1 ring-line">
            <Switch
              checked={value.walkIn}
              onChange={(v) => set({ walkIn: v })}
              label="รับผู้ไม่ได้ลงทะเบียน"
              hint={value.walkIn ? undefined : 'สแกนได้เฉพาะผู้ลงทะเบียน'}
            />
          </div>
        </section>
      )}

      {!dynamic && !locOn && (
        <p className="flex gap-2.5 rounded-[var(--radius-field)] bg-bad-soft px-4 py-3 text-sm font-medium text-bad">
          <Warning size={20} weight="bold" className="shrink-0" />
          ภาพ QR ส่งต่อกันได้ ผู้ที่ไม่ได้อยู่ที่งานอาจสแกนได้
        </p>
      )}
    </div>
  )
}
