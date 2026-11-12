import { Link, NavLink } from 'react-router-dom'
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

/** The one thing people open the app to do. Sits raised in the middle of the bar, between the second and third tab. */
export interface TabAction {
  to: string
  label: string
  Icon: Icon
  /** Orange for scanning hours (default), white for a plain main action such as creating an activity. */
  tone?: 'accent' | 'ink'
}

function Tab({ to, label, Icon, end, badge = 0 }: TabItem) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `pressable flex min-h-16 flex-col items-center justify-center gap-[3px] text-[11px] font-semibold transition-colors duration-150 ${isActive ? 'text-ink' : 'text-muted'}`
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative">
            <Icon size={24} weight={isActive ? 'fill' : 'regular'} />
            {badge > 0 && (
              <span className="num absolute -top-1.5 -right-2.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent-strong px-1 text-[11px] leading-none font-semibold text-on-accent ring-2 ring-surface">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </span>
          {label}
        </>
      )}
    </NavLink>
  )
}

/** Bottom tab bar shared by the student and supervisor main pages: blurred bar, filled icon for the current tab, safe-area padding. */
export function TabBar({ tabs, action }: { tabs: TabItem[]; action?: TabAction }) {
  const half = Math.ceil(tabs.length / 2)
  const left = action ? tabs.slice(0, half) : tabs
  const right = action ? tabs.slice(half) : []
  return (
    <nav aria-label="เมนูหลัก" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-[rgb(23_23_26/0.8)] pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-[20px] backdrop-saturate-[1.8]">
      <ul className={`mx-auto grid max-w-lg px-1 ${action ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {left.map((t) => (
          <li key={t.to}>
            <Tab {...t} />
          </li>
        ))}
        {action && (
          <li className="grid place-items-center">
            <Link
              to={action.to}
              aria-label={action.label}
              className={`grid size-14 -translate-y-2.5 place-items-center rounded-full transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.92] ${
                action.tone === 'ink' ? 'bg-ink text-bg shadow-[0_8px_20px_-8px_rgb(0_0_0/0.9)]' : 'bg-accent-strong text-on-accent shadow-[0_8px_20px_-6px_rgb(255_129_38/0.7)]'
              }`}
            >
              <action.Icon size={26} weight="bold" />
            </Link>
          </li>
        )}
        {right.map((t) => (
          <li key={t.to}>
            <Tab {...t} />
          </li>
        ))}
      </ul>
    </nav>
  )
}
