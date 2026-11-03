import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
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
    if (!org) return setError('ไม่พบรหัสหน่วยงานนี้')
    setSup({ name: name.trim(), orgCode: org.code, orgName: org.name, admin: org.admin })
    nav('/sup', { replace: true })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[calc(2.5rem+env(safe-area-inset-top,0px))] pb-8">
      <p className="font-semibold text-accent-strong">จิตอาสา มน.</p>
      <h1 className="mt-3 mb-10 text-3xl font-bold tracking-tight">เข้าโหมดผู้คุม</h1>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field label="ชื่อผู้คุม" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field
          label="รหัสหน่วยงาน"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            setError(undefined)
          }}
          error={error}
          hint="รับรหัสได้จากศูนย์จิตอาสา กองกิจการนิสิต"
        />
        <Button size="lg" type="submit" loading={busy} disabled={!name.trim() || !code.trim()} className="mt-2 w-full">
          เข้าใช้งาน
        </Button>
      </form>
    </main>
  )
}
