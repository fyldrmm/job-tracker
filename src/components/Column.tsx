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
  onCardTogglePriority: (application: Application) => void
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
  onCardTogglePriority,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div className="flex flex-col bg-ink-100 rounded-lg w-72 shrink-0 max-h-full">
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="font-medium text-ink-700 text-sm">
          {title} <span className="text-ink-400 font-normal">{applications.length}</span>
        </h2>
        <button
          type="button"
          onClick={() => onAdd(stage)}
          aria-label={`Add application to ${title}`}
          className="text-ink-500 hover:text-ink-800 hover:bg-ink-200 rounded w-6 h-6 flex items-center justify-center text-lg leading-none"
        >
          +
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-2 space-y-2 rounded-md transition ${
          isOver ? 'ring-2 ring-inset ring-ink-400 bg-ink-200/50' : ''
        }`}
      >
        {applications.length === 0 && (
          <p className="text-xs text-ink-400 px-1 py-4 text-center">No applications yet</p>
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
            onTogglePriority={() => onCardTogglePriority(application)}
          />
        ))}
      </div>
    </div>
  )
}
