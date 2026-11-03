import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { QrCode } from '@phosphor-icons/react'
import { api } from '../data/api'
import { useDevice } from '../store'

/** Placeholder home until the full student pages (P2). Tells students how to get hours today. */
export default function Home() {
  const studentId = useDevice((s) => s.studentId)
  const [name, setName] = useState<string | null>(null)
  useEffect(() => {
    if (studentId) api.getStudent(studentId).then((s) => setName(s?.name ?? null))
  }, [studentId])

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[calc(2.5rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
      <p className="font-semibold text-accent-strong">จิตอาสา มน.</p>
      <h1 className="mt-3 text-3xl leading-tight font-bold tracking-tight">{name ? `สวัสดี ${name}` : 'เก็บชั่วโมงจิตอาสา'}</h1>
      <div className="mt-10 flex items-start gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-soft">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-strong">
          <QrCode size={26} weight="bold" />
        </span>
        <p className="text-lg leading-relaxed">สแกน QR จากจอผู้คุมเพื่อรับชั่วโมง ใช้กล้องมือถือได้เลย</p>
      </div>
      <Link to="/sup/login" className="mt-auto pt-10 text-center font-medium text-muted underline underline-offset-4">
        เข้าโหมดผู้คุม
      </Link>
    </main>
  )
}
