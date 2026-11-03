import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'

/** Counts up to `value` instead of jumping, so a new scan reads as an event. */
export function Counter({ value, className = '' }: { value: number; className?: string }) {
  const mv = useMotionValue(value)
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString('th-TH'))
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.6, ease: [0.23, 1, 0.32, 1] })
    return () => c.stop()
  }, [mv, value])
  return (
    <motion.span className={`num ${className}`} data-value={value}>
      {text}
    </motion.span>
  )
}
