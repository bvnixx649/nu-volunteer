import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown } from '@phosphor-icons/react'
import { haptic } from '../../lib/device'

/** Where the page rests while the QR is shown, in px from the top. */
export const QR_OPEN = 440
/** Sheet travel past which letting go opens (or keeps open) the QR. */
const THRESHOLD = 110
const EASE = 'cubic-bezier(0.32,0.72,0,1)'

/**
 * Wallet-style reveal. The page is a sheet lying over a dark layer that holds the QR. Pulling the page down from
 * the top slides the sheet and brings the layer up behind it; letting go past 110 px parks the sheet at 440 px with
 * page scrolling locked. The handle, a drag upward or Escape puts it back. `open` is controlled, so a button or a
 * link (`?qr=1`) can open it too. Only transform and opacity are animated, with plain CSS transitions so it plays
 * with Reduce Motion on. The layer's children mount only while the layer is visible, so the QR's GPS watch and
 * token timers never run in the background.
 */
export function PullToQr({
  enabled,
  open,
  onOpenChange,
  layer,
  children,
}: {
  enabled: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  layer: ReactNode
  children: ReactNode
}) {
  const sheet = useRef<HTMLDivElement>(null)
  const dark = useRef<HTMLDivElement>(null)
  const hint = useRef<HTMLDivElement>(null)
  const [layerOn, setLayerOn] = useState(false)
  const [armed, setArmed] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const painted = useRef({ y: 0, dragging: false })
  const openRef = useRef(open)
  const changeRef = useRef(onOpenChange)
  useEffect(() => {
    openRef.current = open
    changeRef.current = onOpenChange
  })

  const showLayer = useCallback(() => {
    clearTimeout(hideTimer.current)
    setLayerOn(true)
  }, [])
  /** Unmount the QR once the sheet has covered it again. */
  const hideLayerSoon = useCallback(() => {
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setLayerOn(false), 520)
  }, [])
  useEffect(() => () => clearTimeout(hideTimer.current), [])

  /** Moves the sheet to `y` and brings the layer and hint along. Direct style writes: this runs on every touch move. */
  const paint = useCallback((y: number, dragging: boolean) => {
    painted.current = { y, dragging }
    const s = sheet.current
    if (!s) return
    const prog = Math.min(1, y / QR_OPEN)
    s.style.transition = dragging ? 'none' : `transform 460ms ${EASE}, border-radius 300ms ease, box-shadow 300ms ease`
    s.style.transform = y > 0 ? `translate3d(0,${y}px,0)` : ''
    s.style.borderRadius = y > 2 ? '28px 28px 0 0' : '0'
    s.style.boxShadow = y > 2 ? '0 -18px 40px -10px rgba(0,0,0,0.75)' : 'none'
    const d = dark.current
    if (d) {
      d.style.transition = dragging ? 'none' : `opacity 300ms ease, transform 460ms ${EASE}`
      d.style.opacity = String(0.15 + prog * 0.85)
      d.style.transform = `scale(${0.92 + prog * 0.08})`
    }
    if (hint.current) hint.current.style.opacity = String(dragging ? Math.min(1, 0.55 + y / THRESHOLD) : 0.55)
  }, [])

  // Follow the controlled `open`: park the sheet at 440 px or put it back.
  useEffect(() => {
    if (!enabled) return
    if (open) {
      window.scrollTo(0, 0)
      showLayer()
      document.documentElement.style.overflow = 'hidden'
      const raf = requestAnimationFrame(() => paint(QR_OPEN, false))
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && changeRef.current(false)
      window.addEventListener('keydown', onKey)
      return () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('keydown', onKey)
        document.documentElement.style.overflow = ''
        paint(0, false)
        setArmed(false)
        hideLayerSoon()
      }
    }
    paint(0, false)
  }, [open, enabled, paint, showLayer, hideLayerSoon])

  // The layer's content is not in the DOM until needed: once it mounts, bring it to where the sheet already is.
  useEffect(() => {
    if (layerOn) paint(painted.current.y, painted.current.dragging)
  }, [layerOn, paint])

  useEffect(() => {
    const el = sheet.current
    if (!enabled || !el) return
    const g = { active: false, dragging: false, armed: false, startY: 0, base: 0, y: 0, mouse: false, swallow: false }

    const begin = (clientY: number, mouse: boolean) => {
      const isOpen = openRef.current
      if (!isOpen && window.scrollY > 0) return false
      Object.assign(g, { active: true, dragging: false, armed: isOpen, startY: clientY, base: isOpen ? QR_OPEN : 0, y: isOpen ? QR_OPEN : 0, mouse })
      return true
    }
    const move = (clientY: number, e: Event) => {
      if (!g.active) return
      const isOpen = openRef.current
      if (!isOpen && window.scrollY > 0) {
        g.active = false
        return
      }
      const dy = clientY - g.startY
      if (!g.dragging) {
        if (Math.abs(dy) < 6) return
        // Closed and moving up is an ordinary scroll, not ours.
        if (!isOpen && dy < 0) {
          g.active = false
          return
        }
        g.dragging = true
        showLayer()
        el.style.userSelect = 'none'
        el.style.webkitUserSelect = 'none'
        if (g.mouse) document.body.style.userSelect = 'none'
      }
      // From closed the sheet follows the finger at 0.75, then at 0.2 once it is past 440 px. From open it follows 1:1 going up.
      let v: number
      if (g.base) {
        const raw = g.base + dy
        v = raw <= QR_OPEN ? Math.max(0, raw) : QR_OPEN + (raw - QR_OPEN) * 0.2
      } else {
        const raw = Math.max(0, dy)
        v = raw * 0.75 <= QR_OPEN ? raw * 0.75 : QR_OPEN + (raw - QR_OPEN / 0.75) * 0.2
      }
      g.y = v
      const past = isOpen ? v > QR_OPEN - THRESHOLD : v >= THRESHOLD
      if (past !== g.armed) {
        g.armed = past
        if (!isOpen) {
          setArmed(past)
          if (past) haptic.tap()
        }
      }
      if (e.cancelable) e.preventDefault()
      paint(v, true)
    }
    const end = () => {
      if (!g.active) return
      g.active = false
      if (!g.dragging) return
      g.dragging = false
      el.style.userSelect = ''
      el.style.webkitUserSelect = ''
      document.body.style.userSelect = ''
      if (g.mouse) g.swallow = true
      const isOpen = openRef.current
      const next = isOpen ? g.y > QR_OPEN - THRESHOLD : g.y >= THRESHOLD
      paint(next ? QR_OPEN : 0, false)
      setArmed(false)
      if (!next) hideLayerSoon()
      if (next !== isOpen) changeRef.current(next)
    }

    const ts = (e: TouchEvent) => {
      if (e.touches.length === 1) begin(e.touches[0].clientY, false)
      else g.active = false
    }
    const tm = (e: TouchEvent) => move(e.touches[0].clientY, e)
    const mm = (e: MouseEvent) => move(e.clientY, e)
    const mu = () => {
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('mouseup', mu)
      end()
    }
    const md = (e: MouseEvent) => {
      if (e.button !== 0 || (e.target as HTMLElement).closest('input,textarea,select')) return
      if (!begin(e.clientY, true)) return
      window.addEventListener('mousemove', mm)
      window.addEventListener('mouseup', mu)
    }
    // A mouse drag that ends over a button must not also click it.
    const click = (e: MouseEvent) => {
      if (!g.swallow) return
      g.swallow = false
      e.preventDefault()
      e.stopPropagation()
    }
    el.addEventListener('touchstart', ts, { passive: true })
    el.addEventListener('touchmove', tm, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', end)
    el.addEventListener('mousedown', md)
    el.addEventListener('click', click, true)
    return () => {
      el.removeEventListener('touchstart', ts)
      el.removeEventListener('touchmove', tm)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', end)
      el.removeEventListener('mousedown', md)
      el.removeEventListener('click', click, true)
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('mouseup', mu)
      document.body.style.userSelect = ''
    }
  }, [enabled, paint, showLayer, hideLayerSoon])

  return (
    <div className="relative">
      {enabled && layerOn && (
        <div className="fixed inset-0 z-0 bg-[#0c0b0a]" inert={!open} data-qr-layer>
          <div ref={dark} className="flex h-[470px] origin-top flex-col items-center" style={{ opacity: 0.15, transform: 'scale(0.92)' }}>
            {layer}
          </div>
        </div>
      )}
      <div ref={sheet} className="relative z-10 min-h-dvh bg-bg" data-qr-sheet>
        {enabled &&
          (open ? (
            <button type="button" onClick={() => onOpenChange(false)} aria-label="ซ่อน QR" className="pressable grid h-[34px] w-full place-items-center">
              <span className="block h-[5px] w-10 rounded-full bg-white/25" />
            </button>
          ) : (
            <div
              ref={hint}
              className="flex h-[34px] items-center justify-center gap-1.5 text-[12.5px] text-muted"
              style={{ opacity: 0.55, boxSizing: 'content-box', paddingTop: 'env(safe-area-inset-top,0px)' }}
            >
              <ArrowDown size={14} weight="bold" aria-hidden style={{ transform: armed ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }} />
              {armed ? 'ปล่อยเพื่อแสดง QR' : 'ดึงลงเพื่อแสดง QR'}
            </div>
          ))}
        {children}
      </div>
    </div>
  )
}
