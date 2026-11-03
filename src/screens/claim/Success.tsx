import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircle } from '@phosphor-icons/react'
import { api } from '../../data/api'
import type { Credit } from '../../data/types'
import { thTime } from '../../lib/format'
import { CountUp } from '../../ui/CountUp'
import { LinkButton } from '../../ui/LinkButton'

const rise = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: 0.08 * i, ease: [0.23, 1, 0.32, 1] as const },
})

/** The two people before you and you, with your place in the order. Own row comes from the credit just written. */
export function neighbours(list: Credit[], own: Credit) {
  const sorted = list.some((c) => c.studentId === own.studentId) ? list : [...list, own]
  const i = sorted.findIndex((c) => c.studentId === own.studentId)
  return { before: sorted.slice(Math.max(0, i - 2), i).map((c, k, a) => ({ c, n: i - a.length + k + 1 })), n: i + 1, total: sorted.length }
}

function RosterRow({ n, c, own }: { n: number; c: Credit; own?: boolean }) {
  return (
    <li
      data-own={own || undefined}
      className={`grid grid-cols-[1.75rem_5.25rem_minmax(0,1fr)_auto] items-center gap-x-2 px-4 py-3.5 text-[15px] ${
        own ? 'bg-accent-soft font-bold shadow-[inset_3px_0_0_var(--color-accent)]' : 'text-muted'
      }`}
    >
      <span className="num">{n}</span>
      <span className="num">{c.studentId}</span>
      <span className="truncate">{c.name}</span>
      <span className={`num ${own ? 'text-accent-strong' : ''}`}>{thTime(c.at)}</span>
    </li>
  )
}

/** Hours first, then who you are, then your place in the roster. Reads the list once; the claim page never subscribes (SPEC 2.84). */
export function Success({ credit, title, activityId }: { credit: Credit; title: string; activityId: string }) {
  const [list, setList] = useState<Credit[]>([])
  useEffect(() => {
    api.listCredits(activityId).then(setList, () => setList([]))
  }, [activityId])
  const { before, n, total } = neighbours(list, credit)

  return (
    <div className="flex flex-col">
      <motion.div {...rise(0)} className="flex items-center gap-2 text-ok">
        <CheckCircle size={24} weight="fill" />
        <span className="font-semibold">รับชั่วโมงแล้ว</span>
      </motion.div>

      <motion.div {...rise(1)} className="mt-3 flex items-baseline gap-3">
        <CountUp value={credit.hours} className="text-[128px] leading-[0.9] font-bold tracking-tighter" />
        <span className="text-2xl font-bold text-accent">ชั่วโมง</span>
      </motion.div>
      {title && (
        <motion.p {...rise(2)} className="mt-2 line-clamp-2 text-muted">
          {title}
        </motion.p>
      )}

      <motion.div {...rise(3)} className="mt-8">
        <h1 className="text-3xl leading-tight font-bold break-words">{credit.name}</h1>
        <p className="num mt-1 text-muted">{credit.studentId}</p>
      </motion.div>

      <motion.section {...rise(4)} className="mt-8" aria-label="รายชื่อในงาน">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">รายชื่อในงาน</h2>
          <p className="num text-muted">{total} คน</p>
        </div>
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-soft">
          {before.map(({ c, n }) => (
            <RosterRow key={c.studentId} n={n} c={c} />
          ))}
          <RosterRow n={n} c={credit} own />
        </ul>
      </motion.section>

      <motion.div {...rise(5)} className="mt-8 flex flex-col gap-3">
        <LinkButton to={`/a/${activityId}/roster`} variant="primary">
          ดูรายชื่อทั้งหมด
        </LinkButton>
        <LinkButton to="/">ไปหน้าแรก</LinkButton>
      </motion.div>
    </div>
  )
}
