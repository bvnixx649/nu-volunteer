import { Navigate, Outlet } from 'react-router-dom'
import { CalendarBlank, ChartBar, House, UserCircle } from '@phosphor-icons/react'
import { useDevice } from '../../store'
import { TabBar, type TabItem } from '../../ui/TabBar'

const TABS: TabItem[] = [
  { to: '/sup', label: 'กิจกรรม', Icon: House, end: true },
  { to: '/sup/calendar', label: 'ปฏิทิน', Icon: CalendarBlank },
  { to: '/sup/stats', label: 'สถิติ', Icon: ChartBar },
  { to: '/sup/me', label: 'บัญชี', Icon: UserCircle },
]

/** The four main supervisor pages share this bottom tab bar. Anyone not signed in as a supervisor is sent to the login page. */
export default function SupShell() {
  const sup = useDevice((s) => s.sup)
  if (!sup) return <Navigate to="/sup/login" replace />
  return (
    <>
      <div className="pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        <Outlet />
      </div>
      <TabBar tabs={TABS} />
    </>
  )
}
