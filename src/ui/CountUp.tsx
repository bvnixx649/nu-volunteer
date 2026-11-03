import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'

/** Counts from 0 up to `value` once on mount. Short on purpose; it plays even with Reduce Motion on. */
export function CountUp({ value, delay = 0.2, duration = 0.8, className = '' }: { value: number; delay?: number; duration?: number; className?: string }) {
  const mv = useMotionValue(0)
  const whole = Number.isInteger(value)
  const text = useTransform(mv, (v) => (whole ? String(Math.round(v)) : v.toFixed(1)))
  useEffect(() => {
    const c = animate(mv, value, { duration, delay, ease: [0.23, 1, 0.32, 1] })
    return () => c.stop()
  }, [mv, value, delay, duration])
  return (
    <motion.span className={`num ${className}`} data-value={value}>
      {text}
    </motion.span>
  )
}
