import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Bell, CalendarCheck, House, QrCode, UserCircle } from '@phosphor-icons/react'
import { useMine, useMineSync } from '../../data/mine'
import { useDevice } from '../../store'
import { TabBar, type TabAction, type TabItem } from '../../ui/TabBar'

/** Student pages need to know who this phone is. Anyone else is sent to /welcome and brought back after. */
export function RequireStudent() {
  const studentId = useDevice((s) => s.studentId)
  const { pathname } = useLocation()
  const sup = useDevice((s) => s.sup)
  useMineSync()
  // The bare site address is the supervisors' way in; students arrive through a QR link or /welcome.
  if (!studentId && pathname === '/') return <Navigate to={sup ? '/sup' : '/sup/login'} replace />
  if (!studentId) return <Navigate to={`/welcome?next=${encodeURIComponent(pathname)}`} replace />
  return <Outlet />
}

const TABS: TabItem[] = [
  { to: '/', label: 'หน้าแรก', Icon: House, end: true },
  { to: '/mine', label: 'ของฉัน', Icon: CalendarCheck },
  { to: '/inbox', label: 'แจ้งเตือน', Icon: Bell },
  { to: '/me', label: 'โปรไฟล์', Icon: UserCircle },
]

/** Scanning is why a student opens the app on the day, so it is one tap from every main page. */
const SCAN: TabAction = { to: '/scan', label: 'สแกนรับชั่วโมง', Icon: QrCode }

/** Bottom tab bar for the four main student pages. The claim page and sub-pages do not use it (SPEC 5.2). */
export function Tabs() {
  const unread = useMine((s) => s.notices.filter((n) => !n.read).length)
  return (
    <>
      <div className="pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        <Outlet />
      </div>
      <TabBar tabs={TABS.map((t) => (t.to === '/inbox' ? { ...t, badge: unread } : t))} action={SCAN} />
    </>
  )
}
