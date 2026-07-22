import type { ReactNode } from 'react'
import { BoardIcon, ArchiveIcon, LogoutIcon, LoginIcon, UserIcon, UserPlusIcon, CoffeeIcon, BellIcon } from './icons'
import { DONATION_URL } from '../lib/constants'

interface SidebarProps {
  view: 'board' | 'archive' | 'privacy'
  onNavigate: (view: 'board' | 'archive') => void
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
}

function NavItem({ icon, label, badge, active, onClick }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm rounded-md transition-colors ${
        active ? 'text-slate-900 bg-slate-100 font-medium' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <span className="shrink-0 w-5 h-5">{icon}</span>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap flex items-center gap-1.5 overflow-hidden">
        {label}
        {badge !== undefined && badge > 0 && (
          <span className="text-xs text-slate-400 font-normal">{badge}</span>
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
  return (
    <nav className="group h-screen sticky top-0 shrink-0 w-14 hover:w-56 transition-[width] duration-150 bg-white border-r border-slate-200 flex flex-col overflow-hidden py-3 gap-1">
      <div className="px-4 py-2 mb-1">
        <span className="text-slate-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Tracker
        </span>
      </div>
      <NavItem
        icon={<BoardIcon />}
        label="Job Tracker"
        active={view === 'board'}
        onClick={() => onNavigate('board')}
      />
      <NavItem
        icon={<ArchiveIcon />}
        label="Archived"
        badge={archivedCount}
        active={view === 'archive'}
        onClick={() => onNavigate('archive')}
      />

      <div className="flex-1" />

      <div className="border-t border-slate-200 my-2" />

      <NavItem
        icon={<CoffeeIcon />}
        label="Support this project"
        onClick={() => window.open(DONATION_URL, '_blank', 'noopener,noreferrer')}
      />

      <button
        type="button"
        onClick={onToggleReminders}
        aria-pressed={remindersEnabled}
        title={remindersBlocked ? 'Notifications are blocked in your browser settings' : undefined}
        className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm rounded-md transition-colors ${
          remindersEnabled ? 'text-slate-900 bg-slate-100 font-medium' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <span className="shrink-0 w-5 h-5">
          <BellIcon />
        </span>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap flex items-center gap-1.5 overflow-hidden">
          {remindersBlocked ? 'Reminders blocked' : remindersEnabled ? 'Reminders on' : 'Reminders off'}
        </span>
      </button>

      <div className="border-t border-slate-200 my-2" />

      <div className="px-4 py-2 mb-1">
        <span className="text-slate-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Account
        </span>
      </div>
      {isSignedIn ? (
        <>
          <NavItem icon={<UserIcon />} label={displayName} onClick={onOpenAccount} />
          <NavItem icon={<LogoutIcon />} label="Sign out" onClick={onSignOut} />
        </>
      ) : (
        <>
          <NavItem icon={<UserPlusIcon />} label="Sign up" onClick={onSignUp} />
          <NavItem icon={<LoginIcon />} label="Log in" onClick={onLogIn} />
        </>
      )}
    </nav>
  )
}
