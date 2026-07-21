import { useDroppable } from '@dnd-kit/core'
import type { Application, ApplicationStage } from '../types/application'
import { Card } from './Card'

interface ColumnProps {
  title: string
  stage: ApplicationStage
  applications: Application[]
  onAdd: (stage: ApplicationStage) => void
  onCardOpen: (application: Application) => void
  onCardAdvance: (application: Application) => void
  onCardRetreat: (application: Application) => void
  onCardArchive: (application: Application) => void
  onCardDeleteRequest: (application: Application) => void
}

export function Column({
  title,
  stage,
  applications,
  onAdd,
  onCardOpen,
  onCardAdvance,
  onCardRetreat,
  onCardArchive,
  onCardDeleteRequest,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div className="flex flex-col bg-slate-100 rounded-lg w-72 shrink-0 max-h-full">
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="font-medium text-slate-700 text-sm">
          {title} <span className="text-slate-400 font-normal">{applications.length}</span>
        </h2>
        <button
          type="button"
          onClick={() => onAdd(stage)}
          aria-label={`Add application to ${title}`}
          className="text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded w-6 h-6 flex items-center justify-center text-lg leading-none"
        >
          +
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-2 space-y-2 rounded-md transition ${
          isOver ? 'ring-2 ring-inset ring-slate-400 bg-slate-200/50' : ''
        }`}
      >
        {applications.length === 0 && (
          <p className="text-xs text-slate-400 px-1 py-4 text-center">No applications yet</p>
        )}
        {applications.map((application) => (
          <Card
            key={application.id}
            application={application}
            onOpenDetail={() => onCardOpen(application)}
            onAdvance={() => onCardAdvance(application)}
            onRetreat={() => onCardRetreat(application)}
            onArchive={() => onCardArchive(application)}
            onDeleteRequest={() => onCardDeleteRequest(application)}
          />
        ))}
      </div>
    </div>
  )
}
