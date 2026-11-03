import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { CheckCircle } from '@phosphor-icons/react'
import type { Credit } from '../../data/types'
import { Clock } from '../../ui/Clock'
import { Ticket } from '../../ui/Ticket'

const rise = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: 0.08 * i, ease: [0.23, 1, 0.32, 1] as const },
})

/** Big name and a running clock: a supervisor can tell at a glance this is live, not a screenshot. */
export function Success({ credit, title }: { credit: Credit; title: string }) {
  return (
    <div className="flex flex-col gap-6">
      <motion.div {...rise(0)} className="flex items-center gap-2 text-ok">
        <CheckCircle size={24} weight="fill" />
        <span className="font-semibold">รับชั่วโมงแล้ว</span>
      </motion.div>
      <motion.h1 {...rise(1)} className="text-4xl leading-tight font-bold tracking-tight break-words">
        {credit.name}
      </motion.h1>
      <motion.div {...rise(2)}>
        <Clock className="text-6xl" />
      </motion.div>
      <motion.div {...rise(3)}>
        <Ticket
          hours={credit.hours}
          name={credit.name}
          studentId={credit.studentId}
          at={credit.at}
          distance={credit.distance}
          ref={credit.ref ?? '-'}
          title={title}
        />
      </motion.div>
      <motion.div {...rise(4)}>
        <Link to="/" className="pressable flex min-h-14 items-center justify-center rounded-full bg-surface font-semibold ring-1 ring-line">
          ไปหน้าแรก
        </Link>
      </motion.div>
    </div>
  )
}
