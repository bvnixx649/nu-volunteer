import { useEffect, useRef, type ReactNode } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { QrCode } from '@phosphor-icons/react'
import { haptic } from '../../lib/device'

/** Finger travel, in px, that opens the QR screen on release. */
const THRESHOLD = 96
const DAMP = 0.6

/**
 * Pull down from the top of the page to open the QR screen. The QR mark grows with the finger;
 * letting go past the threshold opens it. Pulls are damped so the page feels attached, not loose.
 */
export function PullToQr({ enabled, onOpen, children }: { enabled: boolean; onOpen: () => void; children: ReactNode }) {
  const y = useMotionValue(0)
  const progress = useTransform(y, [0, THRESHOLD * DAMP], [0, 1])
  const markScale = useTransform(progress, [0, 1], [0.6, 1])
  const markOpacity = useTransform(progress, [0, 0.3, 1], [0, 0.5, 1])
  const start = useRef<number | null>(null)
  const armed = useRef(false)

  useEffect(() => {
    if (!enabled) return
    const down = (e: TouchEvent) => {
      start.current = window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null
      armed.current = false
    }
    const move = (e: TouchEvent) => {
      if (start.current === null) return
      const dy = Math.max(0, e.touches[0].clientY - start.current)
      // Rubber band: the page follows at 60% up to the threshold, then at 20%.
      y.set(dy < THRESHOLD ? dy * DAMP : THRESHOLD * DAMP + (dy - THRESHOLD) * 0.2)
      const past = dy >= THRESHOLD
      if (past !== armed.current) {
        armed.current = past
        if (past) haptic.tap()
      }
    }
    const up = () => {
      if (start.current === null) return
      start.current = null
      if (armed.current) onOpen()
      animate(y, 0, { type: 'spring', duration: 0.4, bounce: 0 })
    }
    window.addEventListener('touchstart', down, { passive: true })
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', up)
    window.addEventListener('touchcancel', up)
    return () => {
      window.removeEventListener('touchstart', down)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
      window.removeEventListener('touchcancel', up)
    }
  }, [enabled, onOpen, y])

  return (
    <div className="relative">
      {enabled && (
        <>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-3"
            style={{ opacity: markOpacity, scale: markScale }}
          >
            <span className="grid size-16 place-items-center rounded-2xl bg-accent-strong text-on-accent shadow-lift">
              <QrCode size={38} weight="bold" />
            </span>
          </motion.div>
          <p className="pt-[calc(0.5rem+env(safe-area-inset-top,0px))] text-center text-xs text-muted">ดึงลงเพื่อเปิด QR</p>
        </>
      )}
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  )
}
