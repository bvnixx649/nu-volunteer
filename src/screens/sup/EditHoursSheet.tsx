import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../data/api'
import { categoryOf, COMMON_REASONS } from '../../data/categories'
import type { Activity } from '../../data/types'
import { HOUR_CHIPS } from '../../config'
import { validHours, type RosterRow } from '../../lib/roster'
import { Sheet } from '../../ui/Sheet'
import { Field } from '../../ui/Field'
import { Chip } from '../../ui/Chip'
import { Button } from '../../ui/Button'

const OTHER = 'อื่น ๆ'

type Props = { row: RosterRow | null; activity: Activity; by: string; onClose: () => void }

/**
 * Change one person's hours (0 to full) with a reason, or give hours to someone who has not scanned.
 * A reason is only asked for when the hours are below full.
 */
export function EditHoursSheet({ row, activity, by, onClose }: Props) {
  const full = activity.hours
  const credit = row?.credit
  const [input, setInput] = useState('')
  const [reason, setReason] = useState('')
  const [other, setOther] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [confirmDrop, setConfirmDrop] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!row) return
    setInput(String(row.credit?.hours ?? full))
    const r = row.credit?.reason ?? ''
    const known = [...COMMON_REASONS, ...categoryOf(activity.categoryKey).reasons].includes(r)
    setReason(r && !known ? OTHER : r)
    setOther(r && !known ? r : '')
    setConfirmRemove(false)
    setConfirmDrop(false)
  }, [row, full, activity.categoryKey])

  const hours = validHours(input, full)
  const finalReason = reason === OTHER ? other.trim() : reason
  const needsReason = hours !== null && hours < full
  const canSave = hours !== null && (!needsReason || !!finalReason) && !busy
  const chips = [...new Set([0, ...HOUR_CHIPS.filter((h) => h < full), full])]
  const reasons = [...COMMON_REASONS, ...categoryOf(activity.categoryKey).reasons, OTHER]

  // Every change confirms with a toast: the sheet closes and the row may be off screen in a long roster.
  const act = async (fn: () => Promise<string | void>) => {
    setBusy(true)
    try {
      const done = await fn()
      if (done) toast.success(done)
      onClose()
    } catch {
      toast.error('บันทึกไม่ได้ ลองอีกครั้ง')
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    act(async () => {
      if (!row || hours === null) return
      if (credit) await api.setHours(activity.id, row.studentId, hours, needsReason ? finalReason : '', by)
      else {
        const r = await api.claim({ activityId: activity.id, student: { id: row.studentId, name: row.name }, hours, method: 'manual', flags: [], by })
        if (!r.ok && r.reason === 'offline') throw new Error('offline')
        if (needsReason) await api.setHours(activity.id, row.studentId, hours, finalReason, by)
      }
      return `${row.name} ได้ ${hours} ชั่วโมง`
    })

  const remove = () => {
    if (!row) return
    if (!confirmRemove) return setConfirmRemove(true)
    act(async () => {
      await api.removeCredit(activity.id, row.studentId)
      return `ยกเลิกชั่วโมงของ ${row.name} แล้ว`
    })
  }

  const drop = () => {
    if (!row) return
    if (!confirmDrop) return setConfirmDrop(true)
    act(async () => {
      await api.removeRegistration(activity.id, row.studentId)
      return `ลบ ${row.name} ออกจากรายชื่อแล้ว`
    })
  }

  return (
    <Sheet open={!!row} onClose={onClose} title={credit ? 'แก้ชั่วโมง' : 'ให้ชั่วโมง'}>
      {row && (
        <div className="flex flex-col gap-6">
          <div className="rounded-[var(--radius-field)] bg-surface-2 px-4 py-3">
            <p className="text-lg leading-snug font-semibold break-words">{row.name}</p>
            <p className="num text-muted">{row.studentId}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Field
              label="ชั่วโมงที่ได้"
              inputMode="numeric"
              value={input}
              onChange={(e) => setInput(e.target.value.trim())}
              error={input && hours === null ? `ใส่จำนวนเต็ม 0 ถึง ${full}` : undefined}
              hint={`สูงสุด ${full} ชั่วโมง`}
            />
            <div className="flex flex-wrap gap-2">
              {chips.map((h) => (
                <Chip key={h} selected={hours === h} onClick={() => setInput(String(h))}>
                  {h} ชม.
                </Chip>
              ))}
            </div>
          </div>

          {needsReason && (
            <div className="flex flex-col gap-3">
              <p className="text-[15px] font-medium">เหตุผล</p>
              <div className="flex flex-wrap gap-2">
                {reasons.map((r) => (
                  <Chip key={r} selected={reason === r} onClick={() => setReason(r)}>
                    {r}
                  </Chip>
                ))}
              </div>
              {reason === OTHER && <Field label="พิมพ์เหตุผล" value={other} onChange={(e) => setOther(e.target.value)} />}
            </div>
          )}

          <Button size="lg" className="w-full" disabled={!canSave} loading={busy} onClick={save}>
            {credit ? 'บันทึก' : hours !== null ? `ให้ ${hours} ชั่วโมง` : 'ให้ชั่วโมง'}
          </Button>

          {/* Destructive actions sit apart from the save button so a hurried tap cannot land on them. */}
          <div className="mt-2 flex flex-col gap-3 border-t border-line pt-6">
            {credit && (
              <Button variant="danger" className="w-full" disabled={busy} onClick={remove}>
                {confirmRemove ? 'กดอีกครั้งเพื่อยกเลิกชั่วโมง' : 'ยกเลิกชั่วโมง'}
              </Button>
            )}
            <Button variant="danger" className="w-full" disabled={busy} onClick={drop}>
              {confirmDrop ? 'กดอีกครั้งเพื่อลบรายชื่อ' : 'ลบออกจากรายชื่อ'}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
