import { NavLink } from 'react-router-dom'
import type { Icon } from '@phosphor-icons/react'

export interface TabItem {
  to: string
  label: string
  Icon: Icon
  /** Match the path exactly, for a tab whose path is a prefix of the others. */
  end?: boolean
  /** Unread count shown on the icon, hidden at 0. */
  badge?: number
}

/** Bottom tab bar shared by the student and supervisor main pages: blur bar, pill behind the active icon, safe-area padding. */
export function TabBar({ tabs }: { tabs: TabItem[] }) {
  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-[rgba(20,19,18,0.84)] pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-[20px] backdrop-saturate-[1.4]"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4 px-2 pt-2">
        {tabs.map(({ to, label, Icon, end, badge = 0 }) => (
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
                      {badge > 0 && (
                        <span className="num absolute -top-1.5 -right-[9px] grid h-[17px] min-w-[17px] place-items-center rounded-full bg-accent-strong px-1 text-[11px] leading-none font-semibold text-on-accent ring-2 ring-bg">
                          {badge > 9 ? '9+' : badge}
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
  )
}
