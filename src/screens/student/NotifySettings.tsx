import { useMine } from '../../data/mine'
import type { NotifyPrefs } from '../../data/types'
import { enablePush, prefsOf, saveNotify } from '../../lib/push'
import { isIOS } from '../../lib/install'
import { BackBar } from '../../ui/BackBar'
import { Switch } from '../../ui/Switch'

const ROWS: { key: Exclude<keyof NotifyPrefs, 'enabled'>; title: string; body: string }[] = [
  { key: 'openings', title: 'เปิดรับสมัคร', body: 'เมื่อกิจกรรมที่กดเตือนไว้เปิดให้ลงทะเบียน' },
  { key: 'announcements', title: 'ประกาศจากกิจกรรมที่ลงทะเบียน', body: 'เปลี่ยนเวลา ย้ายจุดนัดพบ หรือสิ่งที่ต้องเตรียม' },
  { key: 'messages', title: 'ข้อความจากผู้คุม', body: 'คำตอบของผู้คุมในแชทส่วนตัว' },
]

export default function NotifySettings() {
  const { student, patchStudent } = useMine()
  const prefs = prefsOf(student)
  const standalone = window.matchMedia('(display-mode: standalone)').matches

  return (
    <main className="mx-auto max-w-lg px-5 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] pb-12">
      <BackBar fallback="/inbox" />
      <h1 className="mt-2 text-3xl font-bold tracking-tight">การแจ้งเตือน</h1>

      <section className="mt-6 rounded-[var(--radius-card)] bg-surface px-5 py-3 shadow-soft">
        <Switch
          label="แจ้งเตือนบนเครื่อง"
          hint={prefs.enabled ? 'ปิดได้ทุกเมื่อด้วยปุ่มนี้ปุ่มเดียว' : 'ตอนนี้ปิดอยู่'}
          checked={prefs.enabled}
          onChange={(v) => student && (v ? enablePush(student, patchStudent) : saveNotify(student, { enabled: false }, patchStudent))}
        />
      </section>

      <section className={`mt-4 divide-y divide-line rounded-[var(--radius-card)] bg-surface px-5 py-1 shadow-soft transition-opacity duration-200 ${prefs.enabled ? '' : 'opacity-50'}`}>
        {ROWS.map((r) => (
          <div key={r.key} className="py-2">
            <Switch label={r.title} hint={r.body} checked={prefs[r.key]} onChange={(v) => student && saveNotify(student, { [r.key]: v }, patchStudent)} />
          </div>
        ))}
      </section>

      <p className="mt-5 text-sm text-muted">กล่องแจ้งเตือนในแอพทำงานเสมอ สวิตช์เหล่านี้ควบคุมเฉพาะการเด้งบนหน้าจอเครื่อง</p>
      {isIOS && !standalone && <p className="mt-3 text-sm text-muted">บน iPhone และ iPad ต้องเพิ่มแอพไปที่หน้าจอโฮมก่อน ถึงจะรับการแจ้งเตือนบนหน้าจอล็อกได้</p>}
    </main>
  )
}
