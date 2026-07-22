import { useState, type ReactNode } from 'react'
import {
  BoardIcon,
  ArchiveIcon,
  ListIcon,
  LogoutIcon,
  LoginIcon,
  UserIcon,
  UserPlusIcon,
  CoffeeIcon,
  BellIcon,
} from './icons'
import { LogoMark } from './Logo'
import { DONATION_URL } from '../lib/constants'

interface SidebarProps {
  view: 'board' | 'archive' | 'table' | 'privacy'
  onNavigate: (view: 'board' | 'archive' | 'table') => void
  archivedCount: number
  isSignedIn: boolean
  displayName: string
  onOpenAccount: () => void
  onSignOut: () => void
  onSignUp: () => void
  onLogIn: () => void
  remindersEnabled: boolean
  remindersBlocked: boolean
  onToggleReminders: () => void
}

interface NavItemProps {
  icon: ReactNode
  label: string
  badge?: number
  active?: boolean
  onClick: () => void
  expanded: boolean
}

function NavItem({ icon, label, badge, active, onClick, expanded }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm rounded-md transition-colors ${
        active ? 'text-ink-900 bg-ink-100 font-medium' : 'text-ink-600 hover:bg-ink-100'
      }`}
    >
      <span className="shrink-0 w-5 h-5">{icon}</span>
      <span
        className={`opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap flex items-center gap-1.5 overflow-hidden ${
          expanded ? '!opacity-100' : ''
        }`}
      >
        {label}
        {badge !== undefined && badge > 0 && (
          <span className="text-xs text-ink-400 font-normal">{badge}</span>
        )}
      </span>
    </button>
  )
}

export function Sidebar({
  view,
  onNavigate,
  archivedCount,
  isSignedIn,
  displayName,
  onOpenAccount,
  onSignOut,
  onSignUp,
  onLogIn,
  remindersEnabled,
  remindersBlocked,
  onToggleReminders,
}: SidebarProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <nav
      className={`group h-screen sticky top-0 shrink-0 hover:w-56 transition-[width] duration-150 bg-white border-r border-ink-200 flex flex-col overflow-hidden py-3 gap-1 ${
        expanded ? 'w-56' : 'w-14'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-expanded={expanded}
        className="flex items-center gap-3 w-full px-4 py-2 mb-1 rounded-md"
      >
        <span className="shrink-0 w-5 h-5 rounded-[5px] overflow-hidden">
          <LogoMark className="w-full h-full" />
        </span>
        <span
          className={`text-sm font-semibold text-ink-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ${
            expanded ? '!opacity-100' : ''
          }`}
        >
          JobTracker
        </span>
      </button>
      <NavItem
        icon={<BoardIcon />}
        label="Job Tracker"
        active={view === 'board'}
        onClick={() => onNavigate('board')}
        expanded={expanded}
      />
      <NavItem
        icon={<ListIcon />}
        label="Table"
        active={view === 'table'}
        onClick={() => onNavigate('table')}
        expanded={expanded}
      />
      <NavItem
        icon={<ArchiveIcon />}
        label="Archived"
        badge={archivedCount}
        active={view === 'archive'}
        onClick={() => onNavigate('archive')}
        expanded={expanded}
      />

      <div className="flex-1" />

      <div className="border-t border-ink-200 my-2" />

      <NavItem
        icon={<CoffeeIcon />}
        label="Support this project"
        onClick={() => window.open(DONATION_URL, '_blank', 'noopener,noreferrer')}
        expanded={expanded}
      />

      <button
        type="button"
        onClick={onToggleReminders}
        aria-pressed={remindersEnabled}
        title={remindersBlocked ? 'Notifications are blocked in your browser settings' : undefined}
        className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm rounded-md transition-colors ${
          remindersEnabled ? 'text-ink-900 bg-ink-100 font-medium' : 'text-ink-600 hover:bg-ink-100'
        }`}
      >
        <span className="shrink-0 w-5 h-5">
          <BellIcon />
        </span>
        <span
          className={`opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap flex items-center gap-1.5 overflow-hidden ${
            expanded ? '!opacity-100' : ''
          }`}
        >
          {remindersBlocked ? 'Reminders blocked' : remindersEnabled ? 'Reminders on' : 'Reminders off'}
        </span>
      </button>

      <div className="border-t border-ink-200 my-2" />

      <div className="px-4 py-2 mb-1">
        <span
          className={`text-ink-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ${
            expanded ? '!opacity-100' : ''
          }`}
        >
          Account
        </span>
      </div>
      {isSignedIn ? (
        <>
          <NavItem icon={<UserIcon />} label={displayName} onClick={onOpenAccount} expanded={expanded} />
          <NavItem icon={<LogoutIcon />} label="Sign out" onClick={onSignOut} expanded={expanded} />
        </>
      ) : (
        <>
          <NavItem icon={<UserPlusIcon />} label="Sign up" onClick={onSignUp} expanded={expanded} />
          <NavItem icon={<LoginIcon />} label="Log in" onClick={onLogIn} expanded={expanded} />
        </>
      )}
    </nav>
  )
}
