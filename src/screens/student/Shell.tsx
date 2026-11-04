import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Bell, CalendarCheck, House, UserCircle } from '@phosphor-icons/react'
import { useMine, useMineSync } from '../../data/mine'
import { useDevice } from '../../store'

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

const TABS = [
  { to: '/', label: 'หน้าแรก', Icon: House, end: true },
  { to: '/mine', label: 'กิจกรรมของฉัน', Icon: CalendarCheck, end: false },
  { to: '/inbox', label: 'แจ้งเตือน', Icon: Bell, end: false },
  { to: '/me', label: 'โปรไฟล์', Icon: UserCircle, end: false },
]

/** Bottom tab bar for the four main student pages. The claim page and sub-pages do not use it (SPEC 5.2). */
export function Tabs() {
  const unread = useMine((s) => s.notices.filter((n) => !n.read).length)
  return (
    <>
      <div className="pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        <Outlet />
      </div>
      <nav
        aria-label="เมนูหลัก"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-[rgba(20,19,18,0.84)] pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-[20px] backdrop-saturate-[1.4]"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-4 px-2 pt-2">
          {TABS.map(({ to, label, Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) => `pressable flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${isActive ? 'font-semibold text-accent' : 'font-normal text-muted'}`}
              >
                {({ isActive }) => (
                  <>
                    <span className={`grid h-[30px] w-14 place-items-center rounded-full transition-colors duration-200 ${isActive ? 'bg-[rgba(242,112,42,0.14)]' : ''}`}>
                      <span className="relative">
                        <Icon size={22} weight={isActive ? 'fill' : 'regular'} />
                        {to === '/inbox' && unread > 0 && (
                          <span className="num absolute -top-1.5 -right-[9px] grid h-[17px] min-w-[17px] place-items-center rounded-full bg-accent-strong px-1 text-[11px] leading-none font-semibold text-on-accent ring-2 ring-bg">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </span>
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
