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
import { consumePendingSignup, migrateGuestDataToAccount } from '../lib/migration'
import { buildExportData, downloadJSON } from '../lib/export'
import { deleteOwnAccount, changePassword } from '../lib/remoteStore'
import { clearLocalStore, hasAnyLocalGuestData } from '../lib/localStore'
import { subscribeToGlobalErrors } from '../lib/globalErrors'
import { Column } from './Column'
import { ApplicationForm } from './ApplicationForm'
import { CardDetail } from './CardDetail'
import { CardVisual } from './CardVisual'
import { ArchiveView } from './ArchiveView'
import { UndoToast } from './UndoToast'
import { ErrorToast } from './ErrorToast'
import { AuthModal } from './AuthModal'
import { SetNewPasswordModal } from './SetNewPasswordModal'
import { AccountNudgeBanner } from './AccountNudgeBanner'
import { AccountModal } from './AccountModal'
import { DeleteAccountModal } from './DeleteAccountModal'
import { PrivacyPolicy } from './PrivacyPolicy'
import { Sidebar } from './Sidebar'
import { TrackerTabs } from './TrackerTabs'
import { DeleteTrackerModal } from './DeleteTrackerModal'
import { DeleteApplicationModal } from './DeleteApplicationModal'
import { MigrateGuestDataModal } from './MigrateGuestDataModal'
import { ExtractionPromo } from './ExtractionPromo'
import { CoffeeIcon } from './icons'
import { DONATION_URL } from '../lib/constants'

type FormState = { mode: 'add'; stage: ApplicationStage } | { mode: 'edit'; application: Application } | null
type View = 'board' | 'archive' | 'privacy'

const UNDO_WINDOW_MS = 10000
const ERROR_WINDOW_MS = 8000
const BANNER_DISMISSED_KEY = 'job-tracker:nudge-dismissed'

// True when a keyboard event came from somewhere the browser's own editing
// shortcuts belong -- an input, a textarea, a select, or a contenteditable.
function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function Board() {
  const { user, displayName, passwordRecovery, signUp, signIn, signOut, updateName, resetPassword, updatePasswordAfterRecovery } =
    useAuth()
  const {
    applications,
    loading,
    createApplication,
    updateApplication,
    moveApplicationStage,
    togglePriority,
    archiveApplication,
    unarchiveApplication,
    deleteApplication,
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
  const [deleteApplicationTarget, setDeleteApplicationTarget] = useState<Application | null>(null)
  const [formState, setFormState] = useState<FormState>(null)
  // Stores an id, not a snapshot -- CardDetail must reflect live state (e.g.
  // a stage move or priority toggle applied while it's open), not the
  // object as it looked the moment it was opened. detailApplication below
  // is derived fresh from `applications` on every render.
  const [detailApplicationId, setDetailApplicationId] = useState<string | null>(null)
  const detailApplication = applications.find((app) => app.id === detailApplicationId) ?? null
  function setDetailApplication(application: Application | null) {
    setDetailApplicationId(application?.id ?? null)
  }
  const [activeId, setActiveId] = useState<string | null>(null)
  const [view, setView] = useState<View>('board')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [undoState, setUndoState] = useState<{ id: string; company: string } | null>(null)
  const undoTimerRef = useRef<number | null>(null)
  const [errorToast, setErrorToast] = useState<string | null>(null)
  const errorTimerRef = useRef<number | null>(null)
  // Mirrors errorToast for the global-error subscription below, so that
  // effect can read the current toast without depending on errorToast
  // itself (which would resubscribe on every toast change).
  const errorToastRef = useRef<string | null>(null)
  useEffect(() => {
    errorToastRef.current = errorToast
  }, [errorToast])
  const [authModalMode, setAuthModalMode] = useState<'sign-up' | 'log-in' | null>(null)
  const [authModalNotice, setAuthModalNotice] = useState<string | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(
    () => sessionStorage.getItem(BANNER_DISMISSED_KEY) === 'true',
  )
  const [migrating, setMigrating] = useState(false)
  const [migratePrompt, setMigratePrompt] = useState(false)
  const migrationCheckedForRef = useRef<string | null>(null)

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

  function clearErrorTimer() {
    if (errorTimerRef.current !== null) {
      window.clearTimeout(errorTimerRef.current)
      errorTimerRef.current = null
    }
  }

  // Every fire-and-forget async action below routes failures through this
  // instead of letting them fail silently -- previously a failed drag/
  // archive/undo/delete left no trace beyond a console.error, so the UI
  // could look like it saved something that never actually persisted.
  function showError(err: unknown, fallback: string) {
    console.error(fallback, err)
    clearErrorTimer()
    setErrorToast(err instanceof Error ? err.message : fallback)
    errorTimerRef.current = window.setTimeout(() => setErrorToast(null), ERROR_WINDOW_MS)
  }

  async function handleArchive(application: Application, reason: ArchiveReason) {
    // Await so `applications` (and the unarchiveApplication closure derived
    // from it) is fresh before undoState triggers the keydown effect to
    // resubscribe -- otherwise Ctrl/Cmd+Z can silently no-op against a
    // pre-archive snapshot that still thinks the row isn't archived.
    try {
      await archiveApplication(application.id, reason)
    } catch (err) {
      showError(err, 'Could not archive the application. Please try again.')
      return
    }
    setDetailApplication(null)
    clearUndoTimer()
    setUndoState({ id: application.id, company: application.company })
    undoTimerRef.current = window.setTimeout(() => setUndoState(null), UNDO_WINDOW_MS)
  }

  function handleUndo() {
    if (!undoState) return
    unarchiveApplication(undoState.id).catch((err) =>
      showError(err, 'Could not undo the archive. Please try again.'),
    )
    clearUndoTimer()
    setUndoState(null)
  }

  function handleUnarchive(application: Application) {
    unarchiveApplication(application.id).catch((err) =>
      showError(err, 'Could not un-archive the application. Please try again.'),
    )
    if (undoState?.id === application.id) {
      clearUndoTimer()
      setUndoState(null)
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Never steal Cmd/Ctrl+Z from a text field -- inside notes, a tracker
      // rename, or any other input it must undo typing, not un-archive the
      // last application (AUDIT.md M4).
      if (isTextEntryTarget(event.target)) return
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
  useEffect(() => clearErrorTimer, [])

  // Routes window-level uncaught errors/rejections into the SAME toast as
  // every other failure (AUDIT.md C4) -- not a second, parallel one. A
  // ref (not errorToast itself) is the dep so this subscribes exactly
  // once; a specific, actionable message already on screen ("Could not
  // archive...") must not be clobbered by the generic global one, since
  // ErrorToast has no queue.
  useEffect(() => {
    return subscribeToGlobalErrors((message) => {
      if (errorToastRef.current !== null) return
      clearErrorTimer()
      setErrorToast(message)
      errorTimerRef.current = window.setTimeout(() => setErrorToast(null), ERROR_WINDOW_MS)
    })
  }, [])

  // Whenever a session becomes active, check LIVE for local guest data
  // (trackers/applications with no user_id) rather than trusting a
  // persisted "already migrated" flag -- the old flag-based version could
  // desync from clearLocalStore() on sign-out and either silently drop
  // guest data or silently merge unrelated guest data into an existing
  // account (see AUDIT.md H1/M6). A fresh sign-up (markPendingSignup, set
  // in useAuth.signUp) auto-migrates with no prompt, preserving the
  // brief's zero-friction guest-to-account promise; logging into an
  // existing account only prompts if this browser happens to hold
  // unclaimed guest data, instead of merging it in without asking.
  // migrationCheckedForRef guards against re-checking (and re-prompting)
  // on every token-refresh-triggered re-run of this effect for the same
  // signed-in user. consumePendingSignup validates the flag against the
  // arriving session (email + created_at) and is ALWAYS called, even with
  // no guest data present -- otherwise a flag left by a signup that never
  // produced a session (e.g. an already-registered email, which Supabase
  // reports as success) lingers forever and can mislabel a later,
  // unrelated login as "from this signup" (M6 reproduced a second way).
  useEffect(() => {
    if (!user) return
    if (migrationCheckedForRef.current === user.id) return
    migrationCheckedForRef.current = user.id
    const currentUser = user
    let cancelled = false

    async function runMigration() {
      setMigrating(true)
      try {
        await migrateGuestDataToAccount(currentUser.id)
        // Refresh both applications AND trackers once migration lands.
        // Missing the trackers refresh here was the bug: useTrackers has
        // its own fetch triggered independently by the userId change
        // (same moment migration starts), which can resolve before
        // migration's uploads finish and land on stale/empty data --
        // with nothing to force a second look once migration actually
        // completes, the UI stayed stuck on that stale snapshot until a
        // full page reload.
        await Promise.all([refresh(), refreshTrackers()])
      } catch (err) {
        showError(err, "We couldn't finish syncing your guest data. It's still saved on this device -- reload to try again.")
      } finally {
        if (!cancelled) setMigrating(false)
      }
    }

    hasAnyLocalGuestData().then((hasGuestData) => {
      if (cancelled) return
      const fromThisSignUp = consumePendingSignup(currentUser)
      if (!hasGuestData) return
      if (fromThisSignUp) {
        runMigration()
      } else {
        setMigratePrompt(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user, refresh, refreshTrackers])

  async function handleConfirmMigratePrompt() {
    if (!user) return
    setMigratePrompt(false)
    setMigrating(true)
    try {
      await migrateGuestDataToAccount(user.id)
      await Promise.all([refresh(), refreshTrackers()])
    } catch (err) {
      showError(err, "We couldn't finish syncing your guest data. It's still saved on this device -- reload to try again.")
    } finally {
      setMigrating(false)
    }
  }

  function handleDeclineMigratePrompt() {
    setMigratePrompt(false)
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    moveApplicationStage(String(active.id), over.id as ApplicationStage).catch((err) =>
      showError(err, 'Could not move the application. Please try again.'),
    )
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  function handleCardAdvance(application: Application) {
    const next = nextStage(application.current_stage)
    if (next) {
      moveApplicationStage(application.id, next).catch((err) =>
        showError(err, 'Could not move the application. Please try again.'),
      )
    }
  }

  function handleCardRetreat(application: Application) {
    const prev = prevStage(application.current_stage)
    if (prev) {
      moveApplicationStage(application.id, prev).catch((err) =>
        showError(err, 'Could not move the application. Please try again.'),
      )
    }
  }

  function handleTogglePriority(application: Application) {
    togglePriority(application.id).catch((err) =>
      showError(err, 'Could not update the application. Please try again.'),
    )
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
    // Without this, signing back into the SAME account later in this tab
    // would skip the guest-data check entirely (the ref would already
    // match that user id from before) -- exactly the H1 scenario this
    // migration rework was meant to fix.
    migrationCheckedForRef.current = null
    try {
      await signOut()
    } catch {
      // Local cache is already cleared regardless of whether the network
      // sign-out call itself succeeds.
    }
  }

  async function handleConfirmDeleteTracker() {
    if (!deleteTrackerTarget) return
    try {
      await removeTracker(deleteTrackerTarget.id)
    } catch (err) {
      showError(err, 'Could not delete the tracker. Please try again.')
      return
    }
    if (activeTrackerId === deleteTrackerTarget.id) setActiveTrackerId(null)
    setDeleteTrackerTarget(null)
  }

  async function handleConfirmDeleteApplication() {
    if (!deleteApplicationTarget) return
    try {
      await deleteApplication(deleteApplicationTarget.id)
    } catch (err) {
      showError(err, 'Could not delete the application. Please try again.')
      return
    }
    if (detailApplication?.id === deleteApplicationTarget.id) setDetailApplication(null)
    setDeleteApplicationTarget(null)
  }

  async function handleCreateFirstTracker() {
    try {
      const tracker = await createTracker('My Applications')
      setActiveTrackerId(tracker.id)
    } catch (err) {
      showError(err, 'Could not create the tracker. Please try again.')
    }
  }

  async function handleExport() {
    try {
      const data = await buildExportData(user?.id ?? null)
      const date = new Date().toISOString().slice(0, 10)
      downloadJSON(data, `job-tracker-export-${date}.json`)
    } catch (err) {
      showError(err, 'Could not export your data. Please try again.')
    }
  }

  async function handleChangePassword(currentPassword: string, newPassword: string) {
    // changePassword throws on a wrong current password (verified
    // server-side) -- that propagates straight to AccountModal's own catch
    // block, which surfaces it inline and stops here, before any of the
    // sign-out below runs.
    await changePassword(currentPassword, newPassword)
    // The Edge Function already revoked every session for this account,
    // including this one (AUDIT.md M5) -- the local sign-out just cleans
    // up this browser's client-side state to match. Reuses handleSignOut
    // for the same reason handleDeleteAccount does: it already clears the
    // write-through IndexedDB cache so guest mode afterward can't leak
    // this account's data (see the H1 comment on handleSignOut above).
    setAccountModalOpen(false)
    await handleSignOut()
    setAuthModalNotice('Password changed — please log in again.')
    setAuthModalMode('log-in')
  }

  async function handleDeleteAccount(password: string) {
    if (!user?.email) throw new Error('No signed-in user.')
    // Password verification happens server-side inside the account-action
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
        isSignedIn={!!user}
        displayName={displayName}
        onOpenAccount={() => setAccountModalOpen(true)}
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
          onDeleteRequest={setDeleteApplicationTarget}
        />
      ) : view === 'privacy' ? (
        <PrivacyPolicy onBack={() => setView('board')} />
      ) : trackers.length === 0 || !activeTrackerId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm flex flex-col items-center">
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
          <div className="text-center max-w-sm flex flex-col items-center">
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
            {!user && <ExtractionPromo onSignUp={() => setAuthModalMode('sign-up')} />}
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
                  onCardArchive={(application) => handleArchive(application, 'rejected')}
                  onCardDeleteRequest={setDeleteApplicationTarget}
                  onCardTogglePriority={handleTogglePriority}
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
          <a href="mailto:fazare@fazare.dev" className="hover:text-slate-600 hover:underline">
            Contact
          </a>
        </footer>
      )}
      </div>

      {formState && activeTrackerId && (
        <ApplicationForm
          initial={formState.mode === 'edit' ? formState.application : null}
          defaultStage={formState.mode === 'add' ? formState.stage : 'applied'}
          userId={user?.id ?? null}
          onSubmit={
            formState.mode === 'edit'
              ? (input) => updateApplication(formState.application.id, input)
              : (input) => createApplication(input, activeTrackerId)
          }
          // Deliberately leaves the form mounted underneath rather than
          // closing it -- this form opts out of backdrop-dismiss precisely
          // so a stray click can't discard typed input, and silently
          // discarding it here would contradict that. AuthModal renders
          // after this in the tree, so it stacks on top.
          onRequestSignUp={() => setAuthModalMode('sign-up')}
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
          onDeleteRequest={setDeleteApplicationTarget}
          onTogglePriority={() => handleTogglePriority(detailApplication)}
        />
      )}

      {undoState && (
        <UndoToast message={`Archived ${undoState.company}`} onUndo={handleUndo} />
      )}

      {errorToast && (
        <ErrorToast
          message={errorToast}
          onDismiss={() => {
            clearErrorTimer()
            setErrorToast(null)
          }}
        />
      )}

      {authModalMode && (
        <AuthModal
          mode={authModalMode}
          notice={authModalNotice}
          onSignUp={signUp}
          onSignIn={signIn}
          onResetPassword={resetPassword}
          onClose={() => {
            setAuthModalMode(null)
            setAuthModalNotice(null)
          }}
        />
      )}

      {passwordRecovery && <SetNewPasswordModal onConfirm={updatePasswordAfterRecovery} />}

      {migratePrompt && (
        <MigrateGuestDataModal onConfirm={handleConfirmMigratePrompt} onDecline={handleDeclineMigratePrompt} />
      )}

      {accountModalOpen && user && (
        <AccountModal
          name={displayName}
          email={user.email ?? ''}
          onUpdateName={updateName}
          onChangePassword={handleChangePassword}
          onExport={handleExport}
          onOpenDeleteAccount={() => {
            setAccountModalOpen(false)
            setDeleteModalOpen(true)
          }}
          onSignOut={() => {
            setAccountModalOpen(false)
            handleSignOut()
          }}
          onClose={() => setAccountModalOpen(false)}
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

      {deleteApplicationTarget && (
        <DeleteApplicationModal
          application={deleteApplicationTarget}
          onConfirm={handleConfirmDeleteApplication}
          onClose={() => setDeleteApplicationTarget(null)}
        />
      )}
    </div>
  )
}
