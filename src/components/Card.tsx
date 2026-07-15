import type { Application } from '../types/application'

interface CardProps {
  application: Application
  onClick: () => void
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${month}/${day}/${year}`
}

export function Card({ application, onClick }: CardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-md border border-slate-200 p-3 shadow-sm hover:shadow-md hover:border-slate-300 transition"
    >
      <div className="font-medium text-slate-800 text-sm truncate">{application.company}</div>
      <div className="text-slate-600 text-sm truncate">{application.role_title}</div>
      <div className="text-slate-400 text-xs mt-1">{formatDate(application.date_applied)}</div>
    </button>
  )
}
