import type { Application } from '../types/application'
import { formatDate } from '../lib/format'
import { StarIcon } from './icons'

interface CardVisualProps {
  application: Application
  dragging?: boolean
}

const STALE_THRESHOLD_DAYS = 14

function isStale(application: Application): boolean {
  const daysSinceUpdate = (Date.now() - new Date(application.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  return daysSinceUpdate > STALE_THRESHOLD_DAYS
}

export function CardVisual({ application, dragging }: CardVisualProps) {
  return (
    <div
      className={`w-full text-left bg-white rounded-md border p-3 transition select-none ${
        application.is_priority ? 'border-l-4 border-l-amber-400 border-slate-200' : 'border-slate-200'
      } ${dragging ? 'shadow-lg' : 'shadow-sm hover:shadow-md hover:border-slate-300'}`}
    >
      <div className="flex items-start gap-1">
        {application.is_priority && (
          <StarIcon
            role="img"
            aria-label="Most wanted"
            className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400 fill-amber-400"
          />
        )}
        <div className="min-w-0">
          <div className="font-medium text-slate-800 text-sm truncate">{application.company}</div>
          <div className="text-slate-600 text-sm truncate">{application.role_title}</div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-slate-400 text-xs">{formatDate(application.date_applied)}</span>
        {isStale(application) && (
          <span
            title={`No activity in over ${STALE_THRESHOLD_DAYS} days`}
            className="text-amber-600 text-[10px] font-medium uppercase tracking-wide"
          >
            Stale
          </span>
        )}
      </div>
    </div>
  )
}
