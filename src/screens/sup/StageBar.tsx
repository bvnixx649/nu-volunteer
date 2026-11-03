import { useState } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { CheckCircle, SealCheck } from '@phosphor-icons/react'
import { api } from '../../data/api'
import type { Activity, Credit, Registration } from '../../data/types'
import { AUTO_CLOSE_H } from '../../config'
import { thDate, thTime } from '../../lib/format'
import { daysToSubmit, stage, STAGE_LABEL, stepOf, STEPS, submitDeadline } from '../../lib/stage'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Sheet'

type Props = { activity: Activity; regs: Registration[]; credits: Credit[] }

const stamp = (ms: number) => `${thDate(ms)} ${thTime(ms)} น.`
const card = 'mt-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-soft'

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[var(--radius-field)] bg-surface-2 px-4 py-3.5">
      <p className="num text-4xl leading-none font-bold tracking-tight">{value}</p>
      <p className="mt-1.5 text-sm text-muted">{label}</p>
    </div>
  )
}

/** Where the activity is in the six steps, and the one thing the supervisor should do next. */
export function StageBar({ activity, regs, credits }: Props) {
  const s = stage(activity)
  const { index, done } = stepOf(s)
  const next = done ? undefined : STEPS[index + 1]
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
    <section className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-lg font-semibold">{STAGE_LABEL[s]}</p>
        {next && <p className="text-sm text-muted">ต่อไป {next}</p>}
      </div>
      <ol className="mt-2.5 flex gap-1">
        {STEPS.map((label, i) => {
          const filled = i < index || (i === index && done)
          const current = i === index && !done
          return (
            <li key={label} aria-current={current ? 'step' : undefined} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <span className="sr-only">{label}</span>
              {(filled || current) && (
                <motion.span
                  className="absolute inset-0 origin-left rounded-full bg-accent"
                  initial={{ scaleX: current ? 0 : 1 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
                />
              )}
            </li>
          )
        })}
      </ol>

      {s === 'closing' && (
        <div className={card}>
          <h2 className="text-xl font-bold tracking-tight">ตรวจรายชื่อแล้วปิด</h2>
          <p className="mt-1.5 text-muted">ให้ชั่วโมงคนที่มาแต่สแกนไม่ได้ก่อน คนที่ลงชื่อแต่ไม่ได้ชั่วโมงจะนับว่าไม่มา</p>
          <p className="num mt-3 text-sm text-muted">
            ถ้าไม่กด ระบบจะปิดให้ {AUTO_CLOSE_H} ชม. หลังจบงาน คือ {stamp(activity.end + AUTO_CLOSE_H * 3600_000)}
          </p>
          <Button size="lg" className="mt-5 w-full" onClick={() => setAsking('close')}>
            ปิดรายชื่อ
          </Button>
        </div>
      )}

      {s === 'submit' && (
        <div className={card}>
          {days > 0 ? (
            <p className="flex items-baseline gap-2">
              <span className="num text-5xl leading-none font-bold tracking-tight">{days}</span>
              <span className="text-lg font-semibold">วัน</span>
            </p>
          ) : (
            <p className="text-3xl font-bold tracking-tight text-bad">เลยกำหนดส่งแล้ว</p>
          )}
          <p className="num mt-2 text-muted">ส่งรายชื่อให้ศูนย์จิตอาสาภายใน {thDate(submitDeadline(activity))}</p>
          <Button size="lg" className="mt-5 w-full" onClick={() => setAsking('submit')}>
            ส่งรายชื่อให้ศูนย์
          </Button>
        </div>
      )}

      {s === 'waiting' && activity.submittedAt && (
        <div className={`${card} flex gap-3`}>
          <CheckCircle size={26} weight="fill" className="shrink-0 text-accent" />
          <div>
            <p className="font-semibold">ส่งรายชื่อให้ศูนย์แล้ว</p>
            <p className="num mt-0.5 text-sm text-muted">{stamp(activity.submittedAt)} รอศูนย์จิตอาสาบันทึกชั่วโมง</p>
          </div>
        </div>
      )}

      {s === 'done' && activity.recordedAt && (
        <div className={`${card} flex gap-3`}>
          <SealCheck size={26} weight="fill" className="shrink-0 text-ok" />
          <div>
            <p className="font-semibold">ศูนย์บันทึกชั่วโมงแล้ว</p>
            <p className="num mt-0.5 text-sm text-muted">{thDate(activity.recordedAt)}</p>
          </div>
        </div>
      )}

      <Sheet open={asking === 'close'} onClose={() => setAsking(undefined)} title="ปิดรายชื่อ">
        <div className="grid grid-cols-2 gap-3">
          <Stat value={got} label="ได้ชั่วโมง (คน)" />
          <Stat value={missed} label="ไม่มา (คน)" />
        </div>
        <p className="mt-4 text-muted">ปิดแล้วยังแก้ชั่วโมงและเพิ่มคนได้ จนกว่าจะส่งรายชื่อให้ศูนย์</p>
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
        <Button size="lg" className="mt-6 w-full" loading={busy} onClick={() => run((id) => api.submitRoster(id), 'ส่งรายชื่อให้ศูนย์แล้ว')}>
          ส่งรายชื่อ
        </Button>
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setAsking(undefined)}>
          ยังไม่ส่ง
        </Button>
      </Sheet>
    </section>
  )
}
