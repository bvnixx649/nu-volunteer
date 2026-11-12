import { useId, type InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }

export function Field({ label, error, hint, className = '', ...rest }: Props) {
  const id = useId()
  const note = error ?? hint
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-[15px] font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error || undefined}
        aria-describedby={note ? `${id}-note` : undefined}
        className="h-13 rounded-[var(--radius-field)] bg-surface-2 px-4 text-[17px] ring-1 ring-transparent transition-shadow duration-150 outline-none placeholder:text-faint focus:ring-2 focus:ring-ink aria-invalid:ring-2 aria-invalid:ring-bad"
        {...rest}
      />
      {note && (
        <p id={`${id}-note`} className={`text-sm ${error ? 'text-bad' : 'text-muted'}`}>
          {note}
        </p>
      )}
    </div>
  )
}
