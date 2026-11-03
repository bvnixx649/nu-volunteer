import { useState } from 'react'
import { motion } from 'motion/react'
import { CloudSlash } from '@phosphor-icons/react'
import { thTime } from '../../lib/format'
import { keyOf, sendPending, usePending, type Pending } from '../../lib/pending'
import { Button } from '../../ui/Button'
import { LinkButton } from '../../ui/LinkButton'

/**
 * The scan is saved on the phone but the hours are not recorded yet. Deliberately not the success look:
 * warn colours, no hours number, and the first line says the credit is still missing.
 */
export function Waiting({ entry }: { entry: Pending }) {
  const queue = usePending()
  const [busy, setBusy] = useState(false)
  const [failedOnce, setFailedOnce] = useState(false)
  const stillWaiting = queue.some((p) => keyOf(p) === keyOf(entry))

  async function retry() {
    setBusy(true)
    await sendPending(true)
    setBusy(false)
    setFailedOnce(true)
  }

  return (
    <motion.div
      className="flex flex-col items-start gap-4 py-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      role="status"
      aria-live="polite"
    >
      <span className="grid size-14 place-items-center rounded-full bg-warn-soft text-warn">
        <CloudSlash size={30} weight="fill" />
      </span>
      <h2 className="text-2xl leading-snug font-bold">บันทึกการสแกนไว้ในเครื่องแล้ว</h2>
      {entry.title && <p className="line-clamp-2 font-semibold">{entry.title}</p>}
      <p className="text-lg text-muted">ระบบจะส่งให้อัตโนมัติเมื่อมีอินเทอร์เน็ต ชั่วโมงยังไม่ถูกบันทึก</p>
      <p className="num rounded-full bg-warn-soft px-3.5 py-1.5 text-[15px] font-semibold text-warn">สแกนเมื่อ {thTime(entry.scannedAt)} น.</p>
      {failedOnce && stillWaiting && !busy && <p className="text-warn">ยังส่งไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่</p>}
      <div className="mt-4 flex w-full flex-col gap-3">
        <Button size="lg" className="w-full" loading={busy} onClick={retry}>
          ส่งอีกครั้ง
        </Button>
        <LinkButton to="/" className="w-full">
          ไปหน้าแรก
        </LinkButton>
      </div>
    </motion.div>
  )
}
