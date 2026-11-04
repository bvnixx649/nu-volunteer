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
  const [busy, setBusy] = useState(false)

  if (sup) return <Navigate to="/sup" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError(undefined)
    setBusy(true)
    const org = await api.getOrg(code.trim().toUpperCase()).catch(() => null)
    setBusy(false)
    if (!org) return setError('รหัสหน่วยงานไม่ถูกต้อง')
    setSup({ name: name.trim(), orgCode: org.code, orgName: org.name, admin: org.admin })
    nav('/sup', { replace: true })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[calc(2.5rem+env(safe-area-inset-top,0px))] pb-8">
      <h1 className="mt-3 text-3xl font-bold tracking-tight">เข้าสู่ระบบ</h1>
      <p className="mt-2 mb-10 text-muted">สำหรับผู้ดูแลกิจกรรม</p>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field label="ชื่อผู้ดูแล" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
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
          error={error}
          hint="รับรหัสจากศูนย์จิตอาสา"
        />
        <Button size="lg" type="submit" loading={busy} disabled={!name.trim() || !code.trim()} className="mt-2 w-full">
          เข้าใช้งาน
        </Button>
      </form>
      <Link to="/welcome" className="mt-auto pt-10 text-center font-medium text-muted underline underline-offset-4">
        สำหรับนิสิต
      </Link>
    </main>
  )
}
