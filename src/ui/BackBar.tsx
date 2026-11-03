import { useNavigate } from 'react-router-dom'
import { CaretLeft } from '@phosphor-icons/react'

/** Back to the page before, or to `fallback` when this page was opened directly from a link. */
export function useBack(fallback: string) {
  const nav = useNavigate()
  return () => (window.history.state?.idx > 0 ? nav(-1) : nav(fallback, { replace: true }))
}

export function BackBar({ fallback, label = 'กลับ' }: { fallback: string; label?: string }) {
  const back = useBack(fallback)
  return (
    <button onClick={back} className="pressable -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-muted">
      <CaretLeft size={20} /> {label}
    </button>
  )
}
