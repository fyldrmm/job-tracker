import { useState, type ReactNode } from 'react'
import {
  BoardIcon,
  ArchiveIcon,
  ListIcon,
  ChartIcon,
  LogoutIcon,
  LoginIcon,
  UserIcon,
  UserPlusIcon,
  CoffeeIcon,
  BellIcon,
  FeedbackIcon,
  StarIcon,
  NoteIcon,
} from './icons'
import { LogoMark, LogoFull } from './Logo'
import { DONATION_URL } from '../lib/constants'

interface SidebarProps {
  view: 'board' | 'archive' | 'table' | 'insights' | 'privacy' | 'pricing' | 'terms'
  onNavigate: (view: 'board' | 'archive' | 'table' | 'insights') => void
  archivedCount: number
  isSignedIn: boolean
  displayName: string
  isPro: boolean
  onOpenAccount: () => void
  onOpenPricing: () => void
  onSignOut: () => void
  onSignUp: () => void
  onLogIn: () => void
  onOpenFeedback: () => void
  onOpenNewsletter: () => void
  remindersEnabled: boolean
  remindersBlocked: boolean
  onToggleReminders: () => void
}

interface NavItemProps {
  icon: ReactNode
  label: string
  badge?: number
  tag?: string
  active?: boolean
  onClick: () => void
  expanded: boolean
}

function NavItem({ icon, label, badge, tag, active, onClick, expanded }: NavItemProps) {
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
        {tag && (
          <span className="text-[10px] uppercase tracking-wide text-ink-500 bg-ink-200 rounded-full px-1.5 py-0.5 font-medium">
            {tag}
          </span>
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
  isPro,
  onOpenAccount,
  onOpenPricing,
  onSignOut,
  onSignUp,
  onLogIn,
  onOpenFeedback,
  onOpenNewsletter,
  remindersEnabled,
  remindersBlocked,
  onToggleReminders,
}: SidebarProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <nav
      className={`group h-screen sticky top-0 shrink-0 hover:w-56 transition-[width] duration-150 bg-ink-200 border-r border-ink-300 flex flex-col overflow-hidden py-3 gap-1 ${
        expanded ? 'w-56' : 'w-14'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-expanded={expanded}
        className="relative w-full h-9 px-4 py-2 mb-1 rounded-md"
      >
        <span
          className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-[5px] overflow-hidden transition-opacity group-hover:opacity-0 ${
            expanded ? '!opacity-0' : ''
          }`}
        >
          <LogoMark className="w-full h-full" />
        </span>
        <span
          className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap ${
            expanded ? '!opacity-100' : ''
          }`}
        >
          <LogoFull className="h-full w-auto" />
        </span>
      </button>
      <NavItem
        icon={<BoardIcon />}
        label="Board"
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
      <NavItem
        icon={<ChartIcon />}
        label="Insights"
        active={view === 'insights'}
        onClick={() => onNavigate('insights')}
        expanded={expanded}
      />
      <NavItem
        icon={<NoteIcon />}
        label="AI CV Helper"
        tag="Soon"
        onClick={onOpenNewsletter}
        expanded={expanded}
      />
      <NavItem
        icon={<StarIcon />}
        label={isPro ? 'Pro' : 'Upgrade to Pro'}
        active={view === 'pricing'}
        onClick={onOpenPricing}
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
      <NavItem icon={<FeedbackIcon />} label="Feedback" onClick={onOpenFeedback} expanded={expanded} />

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
