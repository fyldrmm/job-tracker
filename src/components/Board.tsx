import { useMemo, useState } from 'react'
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
import type { Application, ApplicationStage } from '../types/application'
import { useApplications } from '../hooks/useApplications'
import { STAGE_ORDER, STAGE_LABELS, nextStage, prevStage } from '../lib/stages'
import { Column } from './Column'
import { ApplicationForm } from './ApplicationForm'
import { CardDetail } from './CardDetail'
import { CardVisual } from './CardVisual'

type FormState = { mode: 'add'; stage: ApplicationStage } | { mode: 'edit'; application: Application } | null

export function Board() {
  const { applications, loading, createApplication, updateApplication, moveApplicationStage } =
    useApplications()
  const [formState, setFormState] = useState<FormState>(null)
  const [detailApplication, setDetailApplication] = useState<Application | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

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

  const activeApplication = activeId ? applications.find((app) => app.id === activeId) ?? null : null

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
        <button
          type="button"
          onClick={() => setFormState({ mode: 'add', stage: 'applied' })}
          className="px-3 py-1.5 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700"
        >
          + Add application
        </button>
      </header>

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
        />
      )}
    </div>
  )
}
