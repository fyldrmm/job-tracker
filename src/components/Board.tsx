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
import { useAuth } from '../hooks/useAuth'
import { STAGE_ORDER, STAGE_LABELS, nextStage, prevStage } from '../lib/stages'
import { hasMigrated, migrateGuestDataToAccount } from '../lib/migration'
import { buildExportData, downloadJSON } from '../lib/export'
import { deleteOwnAccount } from '../lib/remoteStore'
import { clearLocalStore } from '../lib/localStore'
import { Column } from './Column'
import { ApplicationForm } from './ApplicationForm'
import { CardDetail } from './CardDetail'
import { CardVisual } from './CardVisual'
import { ArchiveView } from './ArchiveView'
import { UndoToast } from './UndoToast'
import { AuthModal } from './AuthModal'
import { AccountNudgeBanner } from './AccountNudgeBanner'
import { DeleteAccountModal } from './DeleteAccountModal'
import { PrivacyPolicy } from './PrivacyPolicy'
import { Sidebar } from './Sidebar'

type FormState = { mode: 'add'; stage: ApplicationStage } | { mode: 'edit'; application: Application } | null
type View = 'board' | 'archive' | 'privacy'

const UNDO_WINDOW_MS = 10000
const BANNER_DISMISSED_KEY = 'job-tracker:nudge-dismissed'

export function Board() {
  const { user, signUp, signIn, signOut } = useAuth()
  const {
    applications,
    loading,
    createApplication,
    updateApplication,
    moveApplicationStage,
    archiveApplication,
    unarchiveApplication,
    refresh,
  } = useApplications(user?.id ?? null)
  const [formState, setFormState] = useState<FormState>(null)
  const [detailApplication, setDetailApplication] = useState<Application | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [view, setView] = useState<View>('board')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [undoState, setUndoState] = useState<{ id: string; company: string } | null>(null)
  const undoTimerRef = useRef<number | null>(null)
  const [authModalMode, setAuthModalMode] = useState<'sign-up' | 'log-in' | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(
    () => sessionStorage.getItem(BANNER_DISMISSED_KEY) === 'true',
  )
  const [migrating, setMigrating] = useState(false)

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

  useEffect(() => {
    if (!user || hasMigrated(user.id)) return
    setMigrating(true)
    migrateGuestDataToAccount(user.id)
      .then(refresh)
      .catch((err) => console.error('Migration failed', err))
      .finally(() => setMigrating(false))
  }, [user, refresh])

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

  async function handleExport() {
    const data = await buildExportData(user?.id ?? null)
    const date = new Date().toISOString().slice(0, 10)
    downloadJSON(data, `job-tracker-export-${date}.json`)
  }

  async function handleDeleteAccount(password: string) {
    if (!user?.email) throw new Error('No signed-in user.')
    // Re-verify identity before an irreversible action -- signInWithPassword
    // throws (wrong password / other auth error) if this fails, which
    // DeleteAccountModal surfaces and stops here, before anything is deleted.
    await signIn(user.email, password)
    await deleteOwnAccount()
    await clearLocalStore()
    try {
      await signOut()
    } catch {
      // Session is likely already invalid post-deletion -- fine, we're
      // resetting to guest state regardless.
    }
    setDeleteModalOpen(false)
    setView('board')
    await refresh()
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>
  }

  const pageTitle = view === 'board' ? 'Job Application Tracker' : view === 'archive' ? 'Archive' : 'Privacy policy'

  return (
    <div className="h-screen bg-slate-50 flex">
      <Sidebar
        view={view}
        onNavigate={setView}
        archivedCount={archivedApplications.length}
        user={user}
        onExport={handleExport}
        onDeleteAccount={() => setDeleteModalOpen(true)}
        onSignOut={() => signOut()}
        onSignUp={() => setAuthModalMode('sign-up')}
        onLogIn={() => setAuthModalMode('log-in')}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <h1 className="text-xl font-medium text-slate-800">{pageTitle}</h1>
        <div className="flex items-center gap-4">
          {migrating && <span className="text-sm text-slate-400">Syncing your data…</span>}
          {view === 'board' && (
            <button
              type="button"
              onClick={() => setFormState({ mode: 'add', stage: 'applied' })}
              className="px-3 py-1.5 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700"
            >
              + Add application
            </button>
          )}
        </div>
      </header>

      {!user && !bannerDismissed && (
        <AccountNudgeBanner
          onSignUp={() => setAuthModalMode('sign-up')}
          onDismiss={() => {
            sessionStorage.setItem(BANNER_DISMISSED_KEY, 'true')
            setBannerDismissed(true)
          }}
        />
      )}

      {view === 'archive' ? (
        <ArchiveView
          applications={archivedApplications}
          onBack={() => setView('board')}
          onCardOpen={setDetailApplication}
          onUnarchive={handleUnarchive}
        />
      ) : view === 'privacy' ? (
        <PrivacyPolicy onBack={() => setView('board')} />
      ) : applications.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <h2 className="text-lg font-medium text-slate-800">Nothing here yet</h2>
            <p className="mt-2 text-sm text-slate-500">
              Add the first job you're eyeing, applying to, or already interviewing for.
            </p>
            <button
              type="button"
              onClick={() => setFormState({ mode: 'add', stage: 'applied' })}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700"
            >
              + Add your first application
            </button>
          </div>
        </div>
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

      {view !== 'privacy' && (
        <footer className="px-6 py-3 border-t border-slate-200 flex items-center justify-center gap-4 text-xs text-slate-400">
          <button type="button" onClick={() => setView('privacy')} className="hover:text-slate-600 hover:underline">
            Privacy policy
          </button>
          <span>·</span>
          <a
            href="https://ko-fi.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-600 hover:underline"
          >
            Support this project
          </a>
        </footer>
      )}
      </div>

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

      {authModalMode && (
        <AuthModal
          mode={authModalMode}
          onSignUp={signUp}
          onSignIn={signIn}
          onClose={() => setAuthModalMode(null)}
        />
      )}

      {deleteModalOpen && (
        <DeleteAccountModal onConfirm={handleDeleteAccount} onClose={() => setDeleteModalOpen(false)} />
      )}
    </div>
  )
}
