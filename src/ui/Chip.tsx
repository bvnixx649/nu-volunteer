import type { ReactNode } from 'react'

export function Chip({ selected, onClick, children }: { selected?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`pressable min-h-10 shrink-0 rounded-full px-4 text-[15px] font-medium ring-1 transition-colors ${
        selected ? 'bg-ink text-bg ring-ink' : 'bg-surface text-ink ring-line'
      }`}
    >
      {children}
    </button>
  )
}
