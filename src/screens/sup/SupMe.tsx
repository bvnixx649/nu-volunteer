import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignOut } from '@phosphor-icons/react'
import { useDevice } from '../../store'
import { Button } from '../../ui/Button'
import { InstallCard } from '../../ui/InstallCard'
import { Sheet } from '../../ui/Sheet'

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

/** Account tab: who is signed in, installing the app, and signing out. */
export default function SupMe() {
  const sup = useDevice((s) => s.sup)
  const clearSup = useDevice((s) => s.clearSup)
  const nav = useNavigate()
  const [confirm, setConfirm] = useState(false)
  if (!sup) return null

  return (
    <main className="mx-auto max-w-lg px-4 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-4">
      <h1 className="rise px-1 text-[28px] leading-tight font-bold tracking-tight">บัญชี</h1>

      <section className="rise mt-4 rounded-[var(--radius-card)] bg-surface px-5 py-7 text-center" style={delay(40)}>
        <img src={`${import.meta.env.BASE_URL}nu-emblem.png`} alt="ตรามหาวิทยาลัยนเรศวร" width={72} height={72} className="mx-auto size-[72px] rounded-full bg-ink p-1" />
        <h2 className="mt-4 text-xl leading-[1.35] font-semibold text-balance">{sup.orgName}</h2>
        <p className="mt-1 text-[15px] text-muted">ผู้ดูแล {sup.name}</p>
        {sup.admin && <span className="mt-3.5 inline-block rounded-full bg-surface-2 px-3 py-1.5 text-[13px] leading-none font-medium text-ink">เห็นกิจกรรมทุกหน่วยงาน</span>}
      </section>

      <div className="rise mt-4" style={delay(80)}>
        <InstallCard />
      </div>

      {/* The rise animation sits on a wrapper: an animated transform would hide the press feedback of the button itself. */}
      <div className="rise mt-4" style={delay(120)}>
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="pressable flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-card)] bg-surface px-5 text-left text-base font-semibold text-bad"
        >
          <SignOut size={22} aria-hidden />
          ออกจากระบบ
        </button>
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="ออกจากระบบ">
        <div className="flex flex-col gap-4">
          <p className="text-muted">กิจกรรมและรายชื่อยังอยู่ เข้าใหม่ได้ด้วยรหัสผู้ดูแล</p>
          <Button
            size="lg"
            variant="danger"
            className="w-full"
            onClick={() => {
              clearSup()
              nav('/sup/login', { replace: true })
            }}
          >
            ออกจากระบบ
          </Button>
          <Button size="lg" variant="ghost" className="w-full" onClick={() => setConfirm(false)}>
            ยกเลิก
          </Button>
        </div>
      </Sheet>
    </main>
  )
}
