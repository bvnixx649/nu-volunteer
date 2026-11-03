import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Bell, CalendarCheck, House, UserCircle } from '@phosphor-icons/react'
import { useMine, useMineSync } from '../../data/mine'
import { useDevice } from '../../store'

/** Student pages need to know who this phone is. Anyone else is sent to /welcome and brought back after. */
export function RequireStudent() {
  const studentId = useDevice((s) => s.studentId)
  const { pathname } = useLocation()
  useMineSync()
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
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {TABS.map(({ to, label, Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={({ isActive }) => `pressable flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${isActive ? 'text-accent-strong' : 'text-muted'}`}>
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      <Icon size={26} weight={isActive ? 'fill' : 'regular'} />
                      {to === '/inbox' && unread > 0 && (
                        <span className="num absolute -top-1.5 -right-2.5 grid min-w-[18px] place-items-center rounded-full bg-accent-strong px-1 text-[11px] leading-[18px] font-bold text-on-accent">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
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
