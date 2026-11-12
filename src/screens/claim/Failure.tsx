import { motion } from 'motion/react'
import { WarningCircle, CheckCircle, QrCode } from '@phosphor-icons/react'
import { Button } from '../../ui/Button'
import { LinkButton } from '../../ui/LinkButton'
import { CLAIM_COPY, type FailReason } from '../../lib/claim'
import { useDevice } from '../../store'

type Props = {
  reason: FailReason | 'offline'
  /** Who the phone tried to claim for, so the student can read the id out to the supervisor. */
  student?: { id: string; name: string } | null
  onRetry: () => void
  onShowTicket?: () => void
}

/** The same QR fails the same way again: these need a fresh scan, not a retry. */
const RESCAN = new Set<Props['reason']>(['invalid', 'expired'])
/** Nothing the student can do here changes the outcome; the way out is the home page. */
const NO_RETRY = new Set<Props['reason']>(['late'])

/** Says what went wrong in plain words and what to do next. */
export function Failure({ reason, student, onRetry, onShowTicket }: Props) {
  const copy = CLAIM_COPY[reason]
  // A phone that has never signed in would land on the supervisors' login at "/", so it goes to welcome instead.
  const home = useDevice((s) => (s.studentId ? '/' : '/welcome'))
  const known = useDevice((s) => !!s.studentId)
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
      <h2 className="text-[26px] leading-snug font-bold tracking-tight text-balance">{copy.title}</h2>
      {copy.action && <p className="text-[17px] text-muted">{copy.action}</p>}
      {reason === 'expired' && known && <p className="text-[17px] text-muted">เครื่องจำข้อมูลแล้ว สแกนอีกครั้งเพื่อรับชั่วโมงได้ทันที</p>}
      {student && !already && (
        <p className="num w-full rounded-[var(--radius-card)] bg-surface px-4 py-3.5">
          <span className="block font-semibold break-words">{student.name}</span>
          <span className="text-[15px] text-muted">รหัสนิสิต {student.id}</span>
        </p>
      )}
      <div className="mt-4 flex w-full flex-col gap-3">
        {already ? (
          <Button size="lg" className="w-full" onClick={onShowTicket}>
            ดูชั่วโมงที่ได้รับ
          </Button>
        ) : RESCAN.has(reason) ? (
          <LinkButton to="/scan" variant="accent">
            <QrCode size={22} weight="bold" /> สแกน QR ใหม่
          </LinkButton>
        ) : (
          !NO_RETRY.has(reason) && (
            <Button size="lg" className="w-full" onClick={onRetry}>
              ลองอีกครั้ง
            </Button>
          )
        )}
        <LinkButton to={home} variant={NO_RETRY.has(reason) ? 'primary' : undefined}>
          ไปหน้าแรก
        </LinkButton>
      </div>
    </motion.div>
  )
}
