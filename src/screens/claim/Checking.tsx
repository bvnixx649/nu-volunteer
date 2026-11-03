import { motion } from 'motion/react'
import { MapPin, CloudArrowUp } from '@phosphor-icons/react'

export type Stage = 'locating' | 'saving'

const copy: Record<Stage, string> = { locating: 'กำลังหาตำแหน่ง', saving: 'กำลังบันทึก' }

export function Checking({ stage }: { stage: Stage }) {
  const Icon = stage === 'locating' ? MapPin : CloudArrowUp
  return (
    <div className="flex flex-col items-center gap-6 py-16" role="status" aria-live="polite">
      <div className="relative grid size-28 place-items-center">
        {[0, 1].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full bg-accent/15"
            initial={{ scale: 0.6, opacity: 0.9 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
          />
        ))}
        <motion.span
          key={stage}
          className="relative grid size-16 place-items-center rounded-full bg-accent-strong text-on-accent shadow-soft"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.25 }}
        >
          <Icon size={30} weight="fill" />
        </motion.span>
      </div>
      <motion.p key={stage} className="text-lg font-medium" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        {copy[stage]}
      </motion.p>
    </div>
  )
}
