import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { identify, useDevice } from '../../store'
import type { Student } from '../../data/types'
import { Button } from '../../ui/Button'
import { IdentityForm } from '../claim/IdentityForm'

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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[calc(2.5rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
      {confirm ? (
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl leading-tight font-bold tracking-tight">ใช่ {confirm.name} ไหม</h1>
          <p className="num text-muted">รหัส {confirm.id} ลงชื่อไว้ในระบบแล้ว</p>
          <Button size="lg" className="mt-4 w-full" onClick={() => enter(confirm.id)}>
            ใช่ เข้าใช้งาน
          </Button>
          <Button size="lg" variant="secondary" className="w-full" onClick={() => setConfirm(undefined)}>
            ไม่ใช่ แก้รหัส
          </Button>
        </div>
      ) : (
        <>
          <h1 className="text-3xl leading-tight font-bold tracking-tight">เก็บชั่วโมงจิตอาสา</h1>
          <p className="mt-3 mb-10 text-lg text-muted">กรอกรหัสนิสิตกับชื่อ ครั้งเดียวพอ เครื่องนี้จำไว้ให้</p>
          <IdentityForm onSubmit={submit} submitLabel="เริ่มใช้งาน" />
          {error && <p className="mt-4 text-bad">{error}</p>}
        </>
      )}
    </main>
  )
}
