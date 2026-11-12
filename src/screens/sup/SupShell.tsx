import { Navigate, Outlet } from 'react-router-dom'
import { CalendarBlank, House, ListBullets, Plus, UserCircle } from '@phosphor-icons/react'
import { useDevice } from '../../store'
import { TabBar, type TabAction, type TabItem } from '../../ui/TabBar'

/** Five places: home, the list of ended activities, the create action in the middle, the calendar and the account. Statistics open from the account. */
const TABS: TabItem[] = [
  { to: '/sup', label: 'กิจกรรม', Icon: House, end: true },
  { to: '/sup/list', label: 'รายการ', Icon: ListBullets },
  { to: '/sup/calendar', label: 'ปฏิทิน', Icon: CalendarBlank },
  { to: '/sup/me', label: 'บัญชี', Icon: UserCircle, also: ['/sup/stats'] },
]

/** Creating an activity sits raised in the middle of the bar. White: orange is kept for scanning. */
const CREATE: TabAction = { to: '/sup/new', label: 'สร้างกิจกรรม', Icon: Plus, tone: 'ink' }

/** The main supervisor pages share this bottom tab bar. Anyone not signed in as a supervisor is sent to the login page. */
export default function SupShell() {
  const sup = useDevice((s) => s.sup)
  if (!sup) return <Navigate to="/sup/login" replace />
  return (
    <>
      <div className="pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        <Outlet />
      </div>
      <TabBar tabs={TABS} action={CREATE} />
    </>
  )
}
