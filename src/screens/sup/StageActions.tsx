import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle, SealCheck } from '@phosphor-icons/react'
import { api } from '../../data/api'
import type { Activity, Credit, Registration } from '../../data/types'
import { AUTO_CLOSE_H } from '../../config'
import { thDate, thTime } from '../../lib/format'
import { daysToSubmit, stage, submitDeadline } from '../../lib/stage'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Sheet'

type Props = { activity: Activity; regs: Registration[]; credits: Credit[] }

const stamp = (ms: number) => `${thDate(ms)} ${thTime(ms)} น.`
const card = 'rounded-[var(--radius-card)] bg-surface p-5 shadow-soft'

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[var(--radius-field)] bg-surface-2 px-4 py-3.5">
      <p className="num text-4xl leading-none font-bold tracking-tight">{value}</p>
      <p className="mt-1.5 text-sm text-muted">{label}</p>
    </div>
  )
}

/** The step after the activity ends: close the roster, send it to the centre, or a note that it is sent. */
export function StageActions({ activity, regs, credits }: Props) {
  const s = stage(activity)
  const [asking, setAsking] = useState<'close' | 'submit'>()
  const [busy, setBusy] = useState(false)

  const got = credits.length
  const missed = regs.filter((r) => !r.cancelledAt && !credits.some((c) => c.studentId === r.studentId)).length
  const total = credits.reduce((sum, c) => sum + c.hours, 0)
  const days = daysToSubmit(activity)

  const run = async (fn: (id: string) => Promise<void>, ok: string) => {
    setBusy(true)
    try {
      await fn(activity.id)
      setAsking(undefined)
      toast.success(ok)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {s === 'closing' && (
        <section className={card}>
          <p className="text-muted">เพิ่มชั่วโมงผู้ที่มาแต่สแกนไม่ได้ก่อน ผู้ลงทะเบียนที่ไม่ได้ชั่วโมงจะนับว่าไม่มา</p>
          <p className="num mt-2 text-sm text-muted">ระบบปิดให้อัตโนมัติ {stamp(activity.end + AUTO_CLOSE_H * 3600_000)}</p>
          <Button size="lg" className="mt-4 w-full" onClick={() => setAsking('close')}>
            ปิดรายชื่อ
          </Button>
        </section>
      )}

      {s === 'submit' && (
        <section className={card}>
          <p className={`num font-semibold ${days > 0 ? '' : 'text-bad'}`}>{days > 0 ? `เหลือ ${days} วัน` : 'เลยกำหนดส่งแล้ว'}</p>
          <p className="num mt-1 text-muted">ส่งรายชื่อให้ศูนย์จิตอาสาภายใน {thDate(submitDeadline(activity))} ส่งแล้วแก้ไม่ได้</p>
          <Button size="lg" className="mt-4 w-full" onClick={() => setAsking('submit')}>
            ส่งรายชื่อให้ศูนย์
          </Button>
        </section>
      )}

      {s === 'waiting' && activity.submittedAt && (
        <section className={`${card} flex gap-3`}>
          <CheckCircle size={26} weight="fill" className="shrink-0 text-ok" />
          <div>
            <p className="font-semibold">ส่งรายชื่อให้ศูนย์แล้ว</p>
            <p className="num mt-0.5 text-sm text-muted">{stamp(activity.submittedAt)} รอศูนย์จิตอาสาบันทึกชั่วโมง</p>
          </div>
        </section>
      )}

      {s === 'done' && activity.recordedAt && (
        <section className={`${card} flex gap-3`}>
          <SealCheck size={26} weight="fill" className="shrink-0 text-ok" />
          <div>
            <p className="font-semibold">ศูนย์บันทึกชั่วโมงแล้ว</p>
            <p className="num mt-0.5 text-sm text-muted">{thDate(activity.recordedAt)}</p>
          </div>
        </section>
      )}

      <Sheet open={asking === 'close'} onClose={() => setAsking(undefined)} title="ปิดรายชื่อ">
        <div className="grid grid-cols-2 gap-3">
          <Stat value={got} label="ได้ชั่วโมง (คน)" />
          <Stat value={missed} label="ไม่มา (คน)" />
        </div>
        <p className="mt-4 text-muted">ปิดแล้วยังแก้ไขได้จนกว่าจะส่งรายชื่อ</p>
        <Button size="lg" className="mt-6 w-full" loading={busy} onClick={() => run((id) => api.closeRoster(id), 'ปิดรายชื่อแล้ว')}>
          ปิดรายชื่อ
        </Button>
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setAsking(undefined)}>
          ยังไม่ปิด
        </Button>
      </Sheet>

      <Sheet open={asking === 'submit'} onClose={() => setAsking(undefined)} title="ส่งรายชื่อให้ศูนย์">
        <div className="grid grid-cols-2 gap-3">
          <Stat value={got} label="ได้ชั่วโมง (คน)" />
          <Stat value={total} label="ชั่วโมงรวม" />
        </div>
        <p className="mt-4 font-medium text-bad">ส่งแล้วแก้รายชื่อและชั่วโมงไม่ได้อีก</p>
        <p className="mt-2 text-muted">ศูนย์จิตอาสาจะได้รับแจ้งให้บันทึกชั่วโมง</p>
        <Button size="lg" className="mt-6 w-full" loading={busy} onClick={() => run((id) => api.submitRoster(id), 'ส่งรายชื่อให้ศูนย์แล้ว')}>
          ส่งรายชื่อ
        </Button>
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setAsking(undefined)}>
          ยังไม่ส่ง
        </Button>
      </Sheet>
    </>
  )
}
