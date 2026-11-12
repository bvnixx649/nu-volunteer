import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api } from '../../data/api'
import { useDevice } from '../../store'
import { Button } from '../../ui/Button'
import { Field } from '../../ui/Field'

export default function Login() {
  const nav = useNavigate()
  const { sup, setSup } = useDevice()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  /** Pressed once: from then on an empty field says so, like the student form. */
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)

  if (sup) return <Navigate to="/sup" replace />

  const nameError = tried && !name.trim() ? 'กรอกชื่อผู้ดูแล' : undefined
  const codeError = error ?? (tried && !code.trim() ? 'กรอกรหัส' : undefined)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (!name.trim() || !code.trim()) return setError(undefined)
    setBusy(true)
    const org = await api.getOrg(code.trim().toUpperCase()).catch(() => null)
    setBusy(false)
    if (!org) return setError('รหัสหน่วยงานไม่ถูกต้อง')
    setSup({ name: name.trim(), orgCode: org.code, orgName: org.name, admin: org.admin })
    nav('/sup', { replace: true })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[calc(3rem+env(safe-area-inset-top,0px))] pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
      <h1 className="text-[28px] leading-tight font-bold tracking-tight">เข้าสู่ระบบ</h1>
      <p className="mt-2 mb-9 text-muted">สำหรับผู้ดูแลกิจกรรม</p>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field label="ชื่อผู้ดูแล" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={nameError} />
        <Field
          label="รหัส"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            setError(undefined)
          }}
          error={codeError}
          hint="รับรหัสจากศูนย์จิตอาสา"
        />
        <Button size="lg" type="submit" loading={busy} className="mt-2 w-full">
          เข้าใช้งาน
        </Button>
      </form>
      <div className="grow" />
      <Link to="/welcome" className="pressable mt-4 grid min-h-11 place-items-center text-[15px] font-medium text-muted">
        สำหรับนิสิต
      </Link>
    </main>
  )
}
