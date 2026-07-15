import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import type { Application, ApplicationStage, ArchiveReason } from '../types/application'
import { useApplications } from '../hooks/useApplications'
import { STAGE_ORDER, STAGE_LABELS, nextStage, prevStage } from '../lib/stages'
import { Column } from './Column'
import { ApplicationForm } from './ApplicationForm'
import { CardDetail } from './CardDetail'
import { CardVisual } from './CardVisual'
import { ArchiveView } from './ArchiveView'
import { UndoToast } from './UndoToast'

type FormState = { mode: 'add'; stage: ApplicationStage } | { mode: 'edit'; application: Application } | null

const UNDO_WINDOW_MS = 10000

export function Board() {
  const {
    applications,
    loading,
    createApplication,
    updateApplication,
    moveApplicationStage,
    archiveApplication,
    unarchiveApplication,
  } = useApplications()
  const [formState, setFormState] = useState<FormState>(null)
  const [detailApplication, setDetailApplication] = useState<Application | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [view, setView] = useState<'board' | 'archive'>('board')
  const [undoState, setUndoState] = useState<{ id: string; company: string } | null>(null)
  const undoTimerRef = useRef<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const byStage = useMemo(() => {
    const active = applications.filter((app) => !app.is_archived)
    const grouped: Record<ApplicationStage, Application[]> = {
      eyes_on: [],
      applied: [],
      interview: [],
      offer: [],
    }
    for (const app of active) {
      grouped[app.current_stage].push(app)
    }
    return grouped
  }, [applications])

  const archivedApplications = useMemo(() => applications.filter((app) => app.is_archived), [applications])

  const activeApplication = activeId ? applications.find((app) => app.id === activeId) ?? null : null

  function clearUndoTimer() {
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
    }
  }

  async function handleArchive(application: Application, reason: ArchiveReason) {
    // Await so `applications` (and the unarchiveApplication closure derived
    // from it) is fresh before undoState triggers the keydown effect to
    // resubscribe -- otherwise Ctrl/Cmd+Z can silently no-op against a
    // pre-archive snapshot that still thinks the row isn't archived.
    await archiveApplication(application.id, reason)
    setDetailApplication(null)
    clearUndoTimer()
    setUndoState({ id: application.id, company: application.company })
    undoTimerRef.current = window.setTimeout(() => setUndoState(null), UNDO_WINDOW_MS)
  }

  function handleUndo() {
    if (!undoState) return
    unarchiveApplication(undoState.id)
    clearUndoTimer()
    setUndoState(null)
  }

  function handleUnarchive(application: Application) {
    unarchiveApplication(application.id)
    if (undoState?.id === application.id) {
      clearUndoTimer()
      setUndoState(null)
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        if (undoState) {
          event.preventDefault()
          handleUndo()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undoState])

  useEffect(() => clearUndoTimer, [])

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    moveApplicationStage(String(active.id), over.id as ApplicationStage)
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  function handleCardAdvance(application: Application) {
    const next = nextStage(application.current_stage)
    if (next) moveApplicationStage(application.id, next)
  }

  function handleCardRetreat(application: Application) {
    const prev = prevStage(application.current_stage)
    if (prev) moveApplicationStage(application.id, prev)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <h1 className="text-xl font-medium text-slate-800">Job Application Tracker</h1>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setView('archive')}
            className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
          >
            {archivedApplications.length} archived
          </button>
          <button
            type="button"
            onClick={() => setFormState({ mode: 'add', stage: 'applied' })}
            className="px-3 py-1.5 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700"
          >
            + Add application
          </button>
        </div>
      </header>

      {view === 'archive' ? (
        <ArchiveView
          applications={archivedApplications}
          onBack={() => setView('board')}
          onCardOpen={setDetailApplication}
          onUnarchive={handleUnarchive}
        />
      ) : (
        <main className="flex-1 overflow-x-auto p-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="flex gap-4 h-full">
              {STAGE_ORDER.map((stage) => (
                <Column
                  key={stage}
                  title={STAGE_LABELS[stage]}
                  stage={stage}
                  applications={byStage[stage]}
                  onAdd={(s) => setFormState({ mode: 'add', stage: s })}
                  onCardOpen={setDetailApplication}
                  onCardAdvance={handleCardAdvance}
                  onCardRetreat={handleCardRetreat}
                />
              ))}
            </div>
            <DragOverlay>
              {activeApplication ? <CardVisual application={activeApplication} dragging /> : null}
            </DragOverlay>
          </DndContext>
        </main>
      )}

      {formState && (
        <ApplicationForm
          initial={formState.mode === 'edit' ? formState.application : null}
          defaultStage={formState.mode === 'add' ? formState.stage : 'applied'}
          onSubmit={
            formState.mode === 'edit'
              ? (input) => updateApplication(formState.application.id, input)
              : createApplication
          }
          onClose={() => setFormState(null)}
        />
      )}

      {detailApplication && (
        <CardDetail
          application={detailApplication}
          onEdit={() => {
            setFormState({ mode: 'edit', application: detailApplication })
            setDetailApplication(null)
          }}
          onClose={() => setDetailApplication(null)}
          onArchive={(reason) => handleArchive(detailApplication, reason)}
        />
      )}

      {undoState && (
        <UndoToast message={`Archived ${undoState.company}`} onUndo={handleUndo} />
      )}
    </div>
  )
}
