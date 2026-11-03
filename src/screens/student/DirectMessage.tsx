import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api, now } from '../../data/api'
import { useMine } from '../../data/mine'
import type { Activity, DirectMsg } from '../../data/types'
import { DM_HIDE_DAYS } from '../../config'
import { usePoll } from '../../lib/hooks'
import { BackBar } from '../../ui/BackBar'
import { Thread, type Bubble } from './Thread'

const POLL_MS = 4000

const QUICK = [
  { label: 'ไม่สบาย', text: 'ขอแจ้งว่าไม่สามารถมาร่วมกิจกรรมได้ เนื่องจากไม่สบาย ' },
  { label: 'ติดเรียนหรือสอบ', text: 'ขอแจ้งว่าไม่สามารถมาร่วมกิจกรรมได้ เนื่องจากติดเรียนหรือสอบ ' },
  { label: 'เหตุฉุกเฉินทางบ้าน', text: 'ขอแจ้งว่าไม่สามารถมาร่วมกิจกรรมได้ เนื่องจากมีเหตุฉุกเฉินทางบ้าน ' },
  { label: 'ถามรายละเอียด', text: 'สอบถามรายละเอียดกิจกรรมครับ/ค่ะ ' },
]

/** One private thread between the student and the supervisors of an activity. Hidden a few days after the activity ends (SPEC 14). */
export default function DirectMessage() {
  const { id = '' } = useParams()
  const { student, activities } = useMine()
  const [fresh, setFresh] = useState<Activity | null>()
  const [msgs, setMsgs] = useState<DirectMsg[]>([])
  const sid = student?.id

  usePoll(() => {
    if (!sid) return
    api.getActivity(id).then(setFresh, () => {})
    api.listDms(id, sid).then((list) => {
      setMsgs(list)
      if (list.some((m) => m.fromSup && !m.read)) api.markDmsRead(id, sid, false).catch(() => {})
    }, () => {})
  }, POLL_MS)

  const a = fresh ?? activities.find((x) => x.id === id)
  const bubbles: Bubble[] = useMemo(() => msgs.map((m) => ({ id: m.id, mine: !m.fromSup, text: m.text, at: m.at, sup: m.fromSup, readMark: !m.fromSup && m.read })), [msgs])

  if (a && now() > a.end + DM_HIDE_DAYS * 24 * 3600_000) {
    return (
      <main className="mx-auto max-w-lg px-5 pt-[calc(0.5rem+env(safe-area-inset-top,0px))]">
        <BackBar fallback={`/a/${id}`} />
        <h1 className="mt-6 text-2xl font-bold">ข้อความส่วนตัวหมดอายุแล้ว</h1>
        <p className="mt-2 text-muted">ข้อความถูกซ่อนหลังกิจกรรมจบ {DM_HIDE_DAYS} วัน ติดต่อผู้ดูแลตามเบอร์โทรในหน้ากิจกรรม</p>
      </main>
    )
  }

  return (
    <Thread
      fallback={`/a/${id}`}
      title={`ผู้ดูแล ${a?.supervisor.name ?? ''}`}
      subtitle={a?.title}
      intro="ข้อความส่วนตัวถึงผู้ดูแล ผู้เข้าร่วมคนอื่นไม่เห็น"
      messages={bubbles}
      quick={QUICK}
      placeholder="พิมพ์ข้อความถึงผู้ดูแล"
      onSend={async (text) => {
        if (!student) return
        try {
          await api.sendDm({ activityId: id, studentId: student.id, fromSup: false, authorName: student.name, text })
          setMsgs(await api.listDms(id, student.id))
        } catch {
          toast.error('ส่งข้อความไม่ได้ ลองอีกครั้ง')
          throw new Error('send failed')
        }
      }}
    />
  )
}
