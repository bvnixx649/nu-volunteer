import { useState, type FormEvent } from 'react'
import { Button } from '../../ui/Button'
import { Field } from '../../ui/Field'
import { cleanName, isStudentId } from '../../lib/format'

type Props = {
  onSubmit: (id: string, name: string) => Promise<void> | void
  initialId?: string
  submitLabel?: string
  /** Orange when the button receives hours, white when it only signs in. */
  variant?: 'accent' | 'primary'
}

export function IdentityForm({ onSubmit, initialId = '', submitLabel = 'รับชั่วโมง', variant = 'accent' }: Props) {
  const [id, setId] = useState(initialId)
  const [name, setName] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)

  const idError = tried && !isStudentId(id) ? 'รหัสนิสิตเป็นตัวเลข 8 หลัก' : undefined
  const nameError = tried && !cleanName(name) ? 'กรอกชื่อ-นามสกุล' : undefined

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (!isStudentId(id) || !cleanName(name)) return
    setBusy(true)
    try {
      await onSubmit(id, name)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Field
        label="รหัสนิสิต"
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="next"
        maxLength={8}
        placeholder="8 หลัก"
        value={id}
        onChange={(e) => setId(e.target.value.replace(/\D/g, ''))}
        error={idError}
      />
      <Field
        label="ชื่อ-นามสกุล"
        autoComplete="name"
        enterKeyHint="done"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={nameError}
      />
      <p className="text-sm text-muted">เครื่องนี้จะจำข้อมูลไว้</p>
      <Button size="lg" type="submit" variant={variant} loading={busy} className="mt-2 w-full">
        {submitLabel}
      </Button>
    </form>
  )
}
