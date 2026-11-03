import { useId } from 'react'
import { motion } from 'motion/react'

export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  const id = useId()
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex-1">
        <label htmlFor={id} className="text-[16px] font-medium">
          {label}
        </label>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-13 shrink-0 rounded-full p-1 transition-colors duration-200 ${checked ? 'bg-accent-strong' : 'bg-line'}`}
      >
        <motion.span
          className="block size-6 rounded-full bg-white shadow-soft"
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
        />
      </button>
    </div>
  )
}
