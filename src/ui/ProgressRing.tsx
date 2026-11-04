import { useEffect, useState, type ReactNode } from 'react'

/**
 * A green ring that fills to `percent` (0 to 100) with a short ease, the label centred inside it.
 * It starts empty and fills a beat after mounting, so it reads as arriving. Plain CSS transition, so it plays with Reduce Motion on.
 */
export function ProgressRing({ percent, size, stroke = 10, children, label }: { percent: number; size: number; stroke?: number; children?: ReactNode; label?: string }) {
  const r = size / 2 - stroke / 2 - 3
  const c = 2 * Math.PI * r
  const [p, setP] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setP(Math.max(0, Math.min(100, percent))), 120)
    return () => clearTimeout(t)
  }, [percent])
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role={label ? 'img' : undefined} aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(92,196,141,0.12)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-ok)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.23,1,0.32,1)' }}
        />
      </svg>
      <div className="num absolute inset-0 flex items-center justify-center font-semibold" aria-hidden={!!label}>
        {children}
      </div>
    </div>
  )
}
