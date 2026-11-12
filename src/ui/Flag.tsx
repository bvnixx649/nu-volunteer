import type { ReactNode } from 'react'

const tones = {
  walkIn: 'bg-surface-2 text-ink',
  noShow: 'bg-surface-2 text-muted',
  location: 'bg-warn-soft text-warn',
  device: 'bg-bad-soft text-bad',
  offline: 'bg-warn-soft text-warn',
  edited: 'bg-accent-soft text-accent-ink',
}

export function Flag({ kind, children }: { kind: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[13px] font-medium whitespace-nowrap ${tones[kind]}`}>{children}</span>
}
