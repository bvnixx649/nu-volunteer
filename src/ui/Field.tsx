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
        className="h-13 rounded-[var(--radius-field)] bg-surface px-4 text-[17px] ring-1 ring-line transition-shadow duration-150 outline-none placeholder:text-muted focus:ring-2 focus:ring-accent aria-invalid:ring-2 aria-invalid:ring-bad"
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
