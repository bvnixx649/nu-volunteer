import { useId } from 'react'
import { motion } from 'motion/react'

type Props<T extends string | number> = {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}

/** Equal-width segments with a thumb that slides to the chosen one. Bigger targets than chips for a single choice. */
export function Segmented<T extends string | number>({ options, value, onChange, label }: Props<T>) {
  const id = useId()
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-surface-2 p-1">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`num relative min-h-11 flex-1 rounded-full text-[15px] font-semibold transition-colors duration-200 ${on ? 'text-ink' : 'text-muted'}`}
          >
            {on && (
              <motion.span
                layoutId={id}
                className="absolute inset-0 rounded-full bg-surface shadow-soft"
                transition={{ type: 'spring', duration: 0.35, bounce: 0.12 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
