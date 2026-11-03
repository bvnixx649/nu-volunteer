import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../../data/api'
import { useMine } from '../../data/mine'
import type { Activity, ChatMsg } from '../../data/types'
import { usePoll } from '../../lib/hooks'
import { Thread, type Bubble } from './Thread'

const POLL_MS = 4000

/** Group chat of an activity. Polled every few seconds; the free plan has too few realtime connections for a 300-person room. */
export default function Chat() {
  const { id = '' } = useParams()
  const { student, regs, credits, activities } = useMine()
  const [fresh, setFresh] = useState<Activity | null>()
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  usePoll(() => {
    api.getActivity(id).then(setFresh, () => {})
    api.listMessages(id).then(setMsgs, () => {})
  }, POLL_MS)

  const a = fresh ?? activities.find((x) => x.id === id)
  const bubbles: Bubble[] = useMemo(
    () =>
      msgs.map((m, i) => ({
        id: m.id,
        mine: m.authorId === student?.id,
        text: m.text,
        at: m.at,
        sup: m.sup,
        name: m.authorId !== student?.id && msgs[i - 1]?.authorId !== m.authorId ? m.authorName : undefined,
      })),
    [msgs, student],
  )

  const allowed = regs.some((r) => r.activityId === id && !r.cancelledAt) || credits.some((c) => c.activityId === id)
  if (student && a && (!a.chatEnabled || !allowed)) return <Navigate to={`/a/${id}`} replace />

  return (
    <Thread
      fallback={`/a/${id}`}
      title={a?.title ?? 'ห้องแชท'}
      subtitle={a ? `ลงชื่อแล้ว ${a.regCount} คน` : undefined}
      empty="เริ่มทักทายผู้เข้าร่วมกิจกรรมได้เลย"
      messages={bubbles}
      placeholder="พิมพ์ข้อความ"
      onSend={async (text) => {
        if (!student) return
        try {
          await api.sendMessage({ activityId: id, authorId: student.id, authorName: student.name, text, sup: false })
          setMsgs(await api.listMessages(id))
        } catch {
          toast.error('ส่งข้อความไม่ได้ ลองอีกครั้ง')
          throw new Error('send failed')
        }
      }}
    />
  )
}
