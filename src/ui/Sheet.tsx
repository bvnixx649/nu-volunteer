import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react'

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode }

/** Bottom sheet. Drag the handle down, flick it, tap the backdrop or press Escape to close. */
export function Sheet({ open, onClose, title, children }: Props) {
  const drag = useDragControls()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 500) onClose()
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[var(--radius-sheet)] bg-surface"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', duration: 0.42, bounce: 0.08 }}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <div
              className="flex cursor-grab touch-none justify-center pt-2.5 pb-3"
              onPointerDown={(e) => drag.start(e)}
            >
              <span className="h-[5px] w-10 rounded-full bg-surface-3" />
            </div>
            <h2 className="px-5 pb-4 text-xl leading-snug font-semibold text-balance">{title}</h2>
            <div className="overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">{children}</div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
