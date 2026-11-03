import { AnimatePresence, motion } from 'motion/react'
import type { Credit } from '../../data/types'
import { thTime } from '../../lib/format'

/** The five latest scans. A new name slides in from the top and pushes the rest down. */
export function LiveFeed({ credits }: { credits: Credit[] }) {
  const latest = credits.slice(0, 5)
  return (
    <ul data-feed className="flex flex-col gap-2">
      <AnimatePresence initial={false} mode="popLayout">
        {latest.map((c) => (
          <motion.li
            key={c.studentId}
            layout
            initial={{ opacity: 0, y: -24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
            className="flex items-center justify-between gap-4 rounded-2xl bg-[#f4f2ef] px-5 py-4"
          >
            <span className="truncate text-xl font-semibold">{c.name}</span>
            <span className="num shrink-0 text-lg text-[#6b6862]">{thTime(c.at)} น.</span>
          </motion.li>
        ))}
      </AnimatePresence>
      {!latest.length && <li className="rounded-2xl bg-[#f4f2ef] px-5 py-6 text-lg text-[#6b6862]">ชื่อคนที่สแกนจะขึ้นที่นี่</li>}
    </ul>
  )
}
