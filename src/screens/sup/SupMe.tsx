import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignOut } from '@phosphor-icons/react'
import { useDevice } from '../../store'
import { InstallCard } from '../../ui/InstallCard'

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties

/** Account tab: who is signed in, installing the app, and signing out. */
export default function SupMe() {
  const sup = useDevice((s) => s.sup)
  const clearSup = useDevice((s) => s.clearSup)
  const nav = useNavigate()
  if (!sup) return null

  return (
    <main className="mx-auto max-w-lg px-4 pt-[calc(1.625rem+env(safe-area-inset-top,0px))] pb-4">
      <h1 className="rise px-1 text-[26px] font-semibold">บัญชี</h1>

      <section className="rise mt-4 rounded-[30px] border border-white/[0.06] bg-white/[0.03] p-1.5" style={delay(40)}>
        <div
          className="rounded-3xl px-5 py-[22px] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
          style={{ backgroundImage: 'radial-gradient(120% 90% at 50% 0%, rgba(242,112,42,0.12), rgba(242,112,42,0) 60%), linear-gradient(180deg, #25231f, #1c1a18)' }}
        >
          <img
            src={`${import.meta.env.BASE_URL}nu-emblem.png`}
            alt="ตรามหาวิทยาลัยนเรศวร"
            width={72}
            height={72}
            className="mx-auto size-[72px] rounded-full bg-white p-1 shadow-[0_0_0_6px_rgba(255,255,255,0.04)]"
          />
          <h2 className="mt-3.5 text-xl leading-[1.35] font-semibold">{sup.orgName}</h2>
          <p className="mt-0.5 text-sm text-muted">ผู้ดูแล {sup.name}</p>
          {sup.admin && <span className="mt-3 inline-block rounded-full bg-accent/15 px-2.5 py-1 text-[12.5px] leading-none font-semibold text-[#f7a57a]">เห็นกิจกรรมทุกหน่วยงาน</span>}
        </div>
      </section>

      <div className="rise mt-4" style={delay(80)}>
        <InstallCard />
      </div>

      {/* The rise animation sits on a wrapper: an animated transform would hide the press feedback of the button itself. */}
      <div className="rise mt-4" style={delay(120)}>
        <button
          type="button"
          onClick={() => {
            clearSup()
            nav('/sup/login', { replace: true })
          }}
          className="pressable flex min-h-14 w-full items-center gap-3 rounded-[22px] border border-white/[0.06] bg-surface px-[18px] text-left text-base font-semibold text-bad"
        >
          <SignOut size={22} aria-hidden />
          ออกจากระบบ
        </button>
      </div>
    </main>
  )
}
