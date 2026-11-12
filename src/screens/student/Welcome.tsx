import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { identify, useDevice } from '../../store'
import type { Student } from '../../data/types'
import { Button } from '../../ui/Button'
import { IdentityForm } from '../claim/IdentityForm'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

/** Three activity photos fanned like prints on a table. Order is back to front. */
const FAN = [
  { src: './posters/river.jpg', to: 'translate(-58px, 18px) rotate(-9deg)' },
  { src: './posters/grad.jpg', to: 'translate(58px, 6px) rotate(7deg)' },
  { src: './posters/teach.jpg', to: 'translate(0px, -10px) rotate(-2deg)' },
]

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="./nu-emblem.png" width={38} height={38} alt="ตรามหาวิทยาลัยนเรศวร" className="size-[38px]" />
      <div className="leading-tight">
        <p className="text-[15px] font-semibold">จิตอาสา มน.</p>
        <p className="text-[13px] text-muted">มหาวิทยาลัยนเรศวร</p>
      </div>
    </div>
  )
}

/** First visit: student id and name, nothing else. A known id asks "is this you" before using that account. */
export default function Welcome() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { studentId, setStudent } = useDevice()
  const [confirm, setConfirm] = useState<Student>()
  const [error, setError] = useState<string>()
  const next = params.get('next') || '/'

  if (studentId) return <Navigate to={next} replace />

  const enter = (id: string) => {
    setStudent(id)
    nav(next, { replace: true })
  }
  const submit = async (id: string, name: string) => {
    setError(undefined)
    try {
      const r = await identify(id, name)
      if (r.kind === 'existing') return setConfirm(r.student)
      enter(r.student.id)
    } catch {
      setError('เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง')
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[calc(0.875rem+env(safe-area-inset-top,0px))] pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
      <Brand />
      {confirm ? (
        <div className="mt-12 flex flex-col gap-4">
          <h1 className="text-[28px] leading-tight font-bold tracking-tight">ใช่ {confirm.name} ไหม</h1>
          <p className="num text-muted">พบรหัส {confirm.id} ในระบบ</p>
          <Button size="lg" className="mt-4 w-full" onClick={() => enter(confirm.id)}>
            ใช่ เข้าใช้งาน
          </Button>
          <Button size="lg" variant="secondary" className="w-full" onClick={() => setConfirm(undefined)}>
            ไม่ใช่ แก้รหัส
          </Button>
        </div>
      ) : (
        <>
          <div aria-hidden className="relative mt-3 h-[min(30dvh,236px)] shrink-0">
            {FAN.map((p, i) => (
              <motion.div
                key={p.src}
                className="absolute top-1/2 left-1/2 -mt-[calc(min(27dvh,212px)/2)] -ml-[calc(min(27dvh,212px)*0.375)] aspect-[3/4] h-[min(27dvh,212px)] overflow-hidden rounded-[20px] bg-surface-2 shadow-lift ring-4 ring-surface"
                initial={{ opacity: 0, transform: 'translate(0px, 48px) rotate(0deg) scale(0.92)' }}
                animate={{ opacity: 1, transform: `${p.to} scale(1)` }}
                transition={{ type: 'spring', duration: 0.9, bounce: 0.2, delay: 0.06 + i * 0.09 }}
              >
                <img src={p.src} alt="" className="size-full object-cover" />
              </motion.div>
            ))}
          </div>

          <motion.h1
            className="mt-6 text-[28px] leading-[1.2] font-bold tracking-tight"
            initial={{ opacity: 0, transform: 'translateY(12px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.3 }}
          >
            ไม่พลาดกิจกรรมจิตอาสา
            <br />
            <span className="text-accent">รับชั่วโมงในสแกนเดียว</span>
          </motion.h1>

          <motion.div
            className="mt-6"
            initial={{ opacity: 0, transform: 'translateY(12px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.4 }}
          >
            <IdentityForm onSubmit={submit} submitLabel="เริ่มใช้งาน" variant="primary" />
            {error && <p className="mt-4 text-bad">{error}</p>}
          </motion.div>

          <div className="grow" />
          <Link to="/sup/login" className="pressable mt-4 grid min-h-11 place-items-center text-[15px] font-medium text-muted">
            สำหรับผู้ดูแลกิจกรรม
          </Link>
        </>
      )}
    </main>
  )
}
