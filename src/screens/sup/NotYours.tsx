import { LinkButton } from '../../ui/LinkButton'

/** Shown instead of a manage, roster, QR or edit page when the activity belongs to another organisation. */
export function NotYours() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-5 py-10">
      <h1 className="text-[26px] leading-snug font-bold tracking-tight text-balance">กิจกรรมนี้ไม่ใช่ของหน่วยงานคุณ</h1>
      <LinkButton to="/sup" replace variant="primary" className="w-full">
        กลับหน้าแรก
      </LinkButton>
    </main>
  )
}
