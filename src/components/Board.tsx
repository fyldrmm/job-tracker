import { useMemo, useState } from 'react'
import type { Application, ApplicationStage } from '../types/application'
import { useApplications } from '../hooks/useApplications'
import { Column } from './Column'
import { ApplicationForm } from './ApplicationForm'

const COLUMNS: { stage: ApplicationStage; title: string }[] = [
  { stage: 'eyes_on', title: 'Eyes on' },
  { stage: 'applied', title: 'Applied' },
  { stage: 'interview', title: 'Interview' },
  { stage: 'offer', title: 'Offer' },
]

type FormState = { mode: 'add'; stage: ApplicationStage } | { mode: 'edit'; application: Application } | null

export function Board() {
  const { applications, loading, createApplication, updateApplication } = useApplications()
  const [formState, setFormState] = useState<FormState>(null)

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
        <div className="flex gap-4 h-full">
          {COLUMNS.map(({ stage, title }) => (
            <Column
              key={stage}
              title={title}
              stage={stage}
              applications={byStage[stage]}
              onAdd={(s) => setFormState({ mode: 'add', stage: s })}
              onCardClick={(application) => setFormState({ mode: 'edit', application })}
            />
          ))}
        </div>
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
    </div>
  )
}
