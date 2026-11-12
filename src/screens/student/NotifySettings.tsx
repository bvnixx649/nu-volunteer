import { useMine } from '../../data/mine'
import type { NotifyPrefs } from '../../data/types'
import { MESSAGES_ON } from '../../config'
import { enablePush, prefsOf, saveNotify } from '../../lib/push'
import { isIOS } from '../../lib/install'
import { BackBar } from '../../ui/BackBar'
import { Switch } from '../../ui/Switch'

const ALL_ROWS: { key: Exclude<keyof NotifyPrefs, 'enabled'>; title: string; body: string }[] = [
  { key: 'openings', title: 'เปิดรับสมัคร', body: 'เมื่อกิจกรรมที่กดเตือนไว้เปิดให้ลงทะเบียน' },
  { key: 'announcements', title: 'ประกาศจากกิจกรรมที่ลงทะเบียน', body: 'เปลี่ยนเวลา ย้ายจุดนัดพบ หรือสิ่งที่ต้องเตรียม' },
  { key: 'messages', title: 'ข้อความจากผู้ดูแล', body: 'คำตอบของผู้ดูแลในแชทส่วนตัว' },
]
/** The private-message switch has nothing to control while messages are off. */
const ROWS = ALL_ROWS.filter((r) => MESSAGES_ON || r.key !== 'messages')

export default function NotifySettings() {
  const { student, patchStudent } = useMine()
  const prefs = prefsOf(student)
  const standalone = window.matchMedia('(display-mode: standalone)').matches

  return (
    <main className="mx-auto max-w-lg px-5 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] pb-12">
      <BackBar fallback="/inbox" />
      <h1 className="mt-2 text-[28px] leading-tight font-bold tracking-tight">การแจ้งเตือน</h1>

      <section className="mt-6 rounded-[var(--radius-card)] bg-surface px-5 py-2">
        <Switch
          label="แจ้งเตือนบนเครื่อง"
          hint={prefs.enabled ? 'เปิดอยู่' : 'ปิดอยู่'}
          checked={prefs.enabled}
          onChange={(v) => student && (v ? enablePush(student, patchStudent) : saveNotify(student, { enabled: false }, patchStudent))}
        />
      </section>

      <section className={`mt-3 divide-y divide-line rounded-[var(--radius-card)] bg-surface px-5 transition-opacity duration-200 ${prefs.enabled ? '' : 'opacity-50'}`}>
        {ROWS.map((r) => (
          <div key={r.key} className="py-2">
            <Switch label={r.title} hint={r.body} checked={prefs[r.key]} onChange={(v) => student && saveNotify(student, { [r.key]: v }, patchStudent)} />
          </div>
        ))}
      </section>

      <p className="mt-5 px-1 text-[13.5px] leading-relaxed text-muted">กล่องแจ้งเตือนในแอปเปิดเสมอ สวิตช์นี้ควบคุมเฉพาะการแจ้งบนหน้าจอเครื่อง</p>
      {isIOS && !standalone && <p className="mt-3 px-1 text-[13.5px] leading-relaxed text-muted">บน iPhone และ iPad ต้องเพิ่มแอปไปที่หน้าจอโฮมก่อน จึงรับแจ้งเตือนบนหน้าจอล็อกได้</p>}
    </main>
  )
}
