import { useEffect, useState } from 'react'

const pad = (n: number) => String(n).padStart(2, '0')

/** Live clock so a supervisor can tell a real success screen from a screenshot. */
export function Clock({ className = '' }: { className?: string }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <time className={`num font-semibold tracking-tight ${className}`} dateTime={now.toISOString()}>
      {pad(now.getHours())}:{pad(now.getMinutes())}
      <span className="text-accent">:{pad(now.getSeconds())}</span>
    </time>
  )
}
