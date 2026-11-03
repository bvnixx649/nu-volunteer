import { motion } from 'motion/react'
import { WarningCircle, CheckCircle } from '@phosphor-icons/react'
import { Button } from '../../ui/Button'
import { CLAIM_COPY, type FailReason } from '../../lib/claim'

type Props = {
  reason: FailReason | 'offline'
  onRetry: () => void
  onShowTicket?: () => void
}

/** Says what went wrong in plain words and what to do next. */
export function Failure({ reason, onRetry, onShowTicket }: Props) {
  const copy = CLAIM_COPY[reason]
  const already = reason === 'already'
  const Icon = already ? CheckCircle : WarningCircle
  return (
    <motion.div
      className="flex flex-col items-start gap-4 py-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      role="alert"
    >
      <span className={`grid size-14 place-items-center rounded-full ${already ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'}`}>
        <Icon size={30} weight="fill" />
      </span>
      <h2 className="text-2xl leading-snug font-bold">{copy.title}</h2>
      {copy.action && <p className="text-lg text-muted">{copy.action}</p>}
      <div className="mt-4 w-full">
        {already ? (
          <Button size="lg" className="w-full" onClick={onShowTicket}>
            ดูบัตร
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={onRetry}>
            ลองอีกครั้ง
          </Button>
        )}
      </div>
    </motion.div>
  )
}
