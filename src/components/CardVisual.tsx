import type { Application } from '../types/application'
import { formatDate } from '../lib/format'

interface CardVisualProps {
  application: Application
  dragging?: boolean
}

export function CardVisual({ application, dragging }: CardVisualProps) {
  return (
    <div
      className={`w-full text-left bg-white rounded-md border border-slate-200 p-3 transition ${
        dragging ? 'shadow-lg' : 'shadow-sm hover:shadow-md hover:border-slate-300'
      }`}
    >
      <div className="font-medium text-slate-800 text-sm truncate">{application.company}</div>
      <div className="text-slate-600 text-sm truncate">{application.role_title}</div>
      <div className="text-slate-400 text-xs mt-1">{formatDate(application.date_applied)}</div>
    </div>
  )
}
