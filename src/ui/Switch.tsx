import { useId } from 'react'
import { motion } from 'motion/react'

export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  const id = useId()
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex-1">
        <label htmlFor={id} className="text-[16px] leading-snug font-medium">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-[13.5px] text-muted">{hint}</p>}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-13 shrink-0 rounded-full p-1 transition-colors duration-200 before:absolute before:-inset-x-1 before:-inset-y-1.5 ${checked ? 'bg-ink' : 'bg-surface-3'}`}
      >
        <motion.span
          className={`block size-6 rounded-full transition-colors duration-200 ${checked ? 'bg-bg' : 'bg-ink'}`}
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
        />
      </button>
    </div>
  )
}
