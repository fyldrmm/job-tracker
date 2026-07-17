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
import type { Application, ApplicationStage, ArchiveReason, Tracker } from '../types/application'
import { useApplications } from '../hooks/useApplications'
import { useTrackers } from '../hooks/useTrackers'
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
import { TrackerTabs } from './TrackerTabs'
import { DeleteTrackerModal } from './DeleteTrackerModal'
import { CoffeeIcon } from './icons'
import { DONATION_URL } from '../lib/constants'

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
  const {
    trackers,
    loading: trackersLoading,
    createTracker,
    renameTracker,
    removeTracker,
    refresh: refreshTrackers,
  } = useTrackers(user?.id ?? null)
  const [activeTrackerId, setActiveTrackerId] = useState<string | null>(null)
  const [deleteTrackerTarget, setDeleteTrackerTarget] = useState<Tracker | null>(null)
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
    const active = applications.filter((app) => !app.is_archived && app.tracker_id === activeTrackerId)
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
  }, [applications, activeTrackerId])

  // Archive spans every tracker (grouped by tracker in ArchiveView) rather
  // than being scoped to the active one -- per product decision, there's
  // one shared Archive screen, not one per tracker.
  const archivedApplications = useMemo(() => applications.filter((app) => app.is_archived), [applications])

  const activeTrackerHasApplications = useMemo(
    () => applications.some((app) => app.tracker_id === activeTrackerId),
    [applications, activeTrackerId],
  )

  // Keep a valid active tracker selected: pick the first one once trackers
  // load, and re-pick if the active one gets deleted out from under us.
  useEffect(() => {
    if (trackers.length === 0) return
    if (!activeTrackerId || !trackers.some((t) => t.id === activeTrackerId)) {
      setActiveTrackerId(trackers[0].id)
    }
  }, [trackers, activeTrackerId])

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
      // Refresh both applications AND trackers once migration lands.
      // Missing the trackers refresh here was the bug: useTrackers has its
      // own fetch triggered independently by the userId change (same
      // moment migration starts), which can resolve before migration's
      // uploads finish and land on stale/empty data -- with nothing to
      // force a second look once migration actually completes, the UI
      // stayed stuck on that stale snapshot until a full page reload.
      .then(() => Promise.all([refresh(), refreshTrackers()]))
      .catch((err) => console.error('Migration failed', err))
      .finally(() => setMigrating(false))
  }, [user, refresh, refreshTrackers])

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

  async function handleSignOut() {
    // The local IndexedDB store is a write-through cache of whatever
    // account is signed in (see useApplications/useTrackers). Without
    // clearing it, "guest mode" after sign-out would read that account's
    // mirrored data straight back out of the cache instead of a clean
    // slate -- a real data leak between accounts on a shared device.
    await clearLocalStore()
    setActiveTrackerId(null)
    setView('board')
    try {
      await signOut()
    } catch {
      // Local cache is already cleared regardless of whether the network
      // sign-out call itself succeeds.
    }
  }

  async function handleConfirmDeleteTracker() {
    if (!deleteTrackerTarget) return
    await removeTracker(deleteTrackerTarget.id)
    if (activeTrackerId === deleteTrackerTarget.id) setActiveTrackerId(null)
    setDeleteTrackerTarget(null)
  }

  async function handleCreateFirstTracker() {
    const tracker = await createTracker('My Applications')
    setActiveTrackerId(tracker.id)
  }

  async function handleExport() {
    const data = await buildExportData(user?.id ?? null)
    const date = new Date().toISOString().slice(0, 10)
    downloadJSON(data, `job-tracker-export-${date}.json`)
  }

  async function handleDeleteAccount(password: string) {
    if (!user?.email) throw new Error('No signed-in user.')
    // Password verification happens server-side inside the delete-account
    // Edge Function now, not via a separate client-side signIn() call here
    // -- a client-only check can't stop someone who calls the function
    // directly with just a stolen session token. deleteOwnAccount() throws
    // (wrong password / other error) if verification fails, which
    // DeleteAccountModal surfaces and stops here, before anything is deleted.
    await deleteOwnAccount(password)
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

  if (loading || trackersLoading) {
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
        onSignOut={handleSignOut}
        onSignUp={() => setAuthModalMode('sign-up')}
        onLogIn={() => setAuthModalMode('log-in')}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <h1 className="text-xl font-medium text-slate-800">{pageTitle}</h1>
        <div className="flex items-center gap-4">
          {migrating && <span className="text-sm text-slate-400">Syncing your data…</span>}
          <a
            href={DONATION_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Support this project"
            title="Support this project"
            className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100"
          >
            <CoffeeIcon className="w-5 h-5" />
          </a>
          {view === 'board' && activeTrackerId && (
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

      {view === 'board' && trackers.length > 0 && (
        <TrackerTabs
          trackers={trackers}
          activeTrackerId={activeTrackerId}
          onSelect={setActiveTrackerId}
          onCreate={(name) => createTracker(name).then((t) => setActiveTrackerId(t.id))}
          onRename={renameTracker}
          onDeleteRequest={setDeleteTrackerTarget}
        />
      )}

      {view === 'archive' ? (
        <ArchiveView
          applications={archivedApplications}
          trackers={trackers}
          onBack={() => setView('board')}
          onCardOpen={setDetailApplication}
          onUnarchive={handleUnarchive}
        />
      ) : view === 'privacy' ? (
        <PrivacyPolicy onBack={() => setView('board')} />
      ) : trackers.length === 0 || !activeTrackerId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <h2 className="text-lg font-medium text-slate-800">Create your first tracker</h2>
            <p className="mt-2 text-sm text-slate-500">
              A tracker is its own board -- handy if you're job hunting in more than one place at once.
            </p>
            <button
              type="button"
              onClick={handleCreateFirstTracker}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700"
            >
              + Create tracker
            </button>
          </div>
        </div>
      ) : !activeTrackerHasApplications ? (
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
        <main className="flex-1 overflow-x-auto py-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="flex h-full justify-evenly">
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
        <footer className="px-6 py-3 border-t border-slate-200 flex items-center justify-center text-xs text-slate-400">
          <button type="button" onClick={() => setView('privacy')} className="hover:text-slate-600 hover:underline">
            Privacy policy
          </button>
        </footer>
      )}
      </div>

      {formState && activeTrackerId && (
        <ApplicationForm
          initial={formState.mode === 'edit' ? formState.application : null}
          defaultStage={formState.mode === 'add' ? formState.stage : 'applied'}
          onSubmit={
            formState.mode === 'edit'
              ? (input) => updateApplication(formState.application.id, input)
              : (input) => createApplication(input, activeTrackerId)
          }
          onClose={() => setFormState(null)}
        />
      )}

      {detailApplication && (
        <CardDetail
          application={detailApplication}
          trackerName={trackers.find((t) => t.id === detailApplication.tracker_id)?.name}
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

      {deleteTrackerTarget && (
        <DeleteTrackerModal
          tracker={deleteTrackerTarget}
          applicationCount={applications.filter((app) => app.tracker_id === deleteTrackerTarget.id).length}
          onConfirm={handleConfirmDeleteTracker}
          onClose={() => setDeleteTrackerTarget(null)}
        />
      )}
    </div>
  )
}
