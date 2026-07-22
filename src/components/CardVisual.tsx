import { useReducer } from 'react'
import type { Application } from '../types/application'
import { formatDate } from '../lib/format'
import { isStale, STALE_THRESHOLD_DAYS } from '../lib/stale'
import { dismissStale, isDismissedStale } from '../lib/reminders'
import { StarIcon } from './icons'

interface CardVisualProps {
  application: Application
  dragging?: boolean
}

export function CardVisual({ application, dragging }: CardVisualProps) {
  // Re-render after a dismiss write -- localStorage itself isn't reactive,
  // and `application` doesn't change when its stale badge is dismissed.
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)
  const showStale = isStale(application) && !isDismissedStale(application.id, application.updated_at)

  function handleDismissStale(event: React.MouseEvent) {
    event.stopPropagation()
    dismissStale(application.id, application.updated_at)
    forceUpdate()
  }

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
        {showStale && (
          <span className="inline-flex items-center gap-1 text-amber-600 text-[10px] font-medium uppercase tracking-wide">
            <span title={`No activity in over ${STALE_THRESHOLD_DAYS} days`}>OUTDATED</span>
            <button
              type="button"
              aria-label="Dismiss stale reminder — keep this card here without flagging it"
              title="Dismiss — keep this card here without flagging it"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={handleDismissStale}
              className="leading-none text-amber-500 hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-sm"
            >
              ✕
            </button>
          </span>
        )}
      </div>
    </div>
  )
}
