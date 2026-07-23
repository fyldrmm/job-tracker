import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { useStageHistory } from '../hooks/useStageHistory'
import { useAuth } from '../hooks/useAuth'
import { useStaleReminders } from '../hooks/useStaleReminders'
import { getRemindersEnabled, setRemindersEnabled } from '../lib/reminders'
import { STAGE_ORDER, STAGE_LABELS, nextStage, prevStage } from '../lib/stages'
import { ARCHIVE_REASONS } from '../lib/archive'
import { consumePendingSignup, migrateGuestDataToAccount } from '../lib/migration'
import { buildExportData, downloadJSON } from '../lib/export'
import {
  deleteOwnAccount,
  changePassword,
  extractJobDetailsFromText,
  type ExtractedJobFields,
} from '../lib/remoteStore'
import { clearLocalStore, hasAnyLocalGuestData } from '../lib/localStore'
import { subscribeToGlobalErrors } from '../lib/globalErrors'
import {
  parseExtensionMessage,
  storePendingExtraction,
  consumePendingExtraction,
  type ExtensionHandoffPayload,
} from '../lib/extensionHandoff'
import { LogoMark } from './Logo'
import { Column } from './Column'
import { SelectionToolbar } from './SelectionToolbar'
import type { ContextMenuItem } from './ContextMenu'
import { ApplicationForm } from './ApplicationForm'
import { CardDetail } from './CardDetail'
import { CardVisual } from './CardVisual'
import { ArchiveView } from './ArchiveView'
import { TableView } from './TableView'
import { InsightsView } from './InsightsView'
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

type FormState =
  | { mode: 'add'; stage: ApplicationStage; prefill?: Partial<ExtractedJobFields> | null }
  | { mode: 'edit'; application: Application }
  | null
type View = 'board' | 'archive' | 'table' | 'insights' | 'privacy'

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
    reorderTrackers,
    refresh: refreshTrackers,
  } = useTrackers(user?.id ?? null)
  const { stageHistory, refresh: refreshStageHistory } = useStageHistory(user?.id ?? null)
  const [activeTrackerId, setActiveTrackerId] = useState<string | null>(null)
  const [deleteTrackerTarget, setDeleteTrackerTarget] = useState<Tracker | null>(null)
  const [deleteApplicationTargets, setDeleteApplicationTargets] = useState<Application[] | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
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
  const [undoState, setUndoState] = useState<{ ids: string[]; label: string } | null>(null)
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
  // True once the migration-decision effect below has fully resolved for the
  // current user (including a user-answered prompt, if one was shown).
  // Gates the extension-handoff resume effect so it can't race migration
  // and land an extracted application in a stale/about-to-change tracker.
  const [migrationSettled, setMigrationSettled] = useState(false)
  const [extractingFromExtension, setExtractingFromExtension] = useState(false)
  const [remindersEnabled, setRemindersEnabledState] = useState(() => getRemindersEnabled())
  const [notificationPermission, setNotificationPermission] = useState(() =>
    typeof Notification === 'undefined' ? 'denied' : Notification.permission,
  )
  useStaleReminders(applications, remindersEnabled && notificationPermission === 'granted')

  // stage_history is otherwise only loaded once on mount -- refetch on every
  // visit to Insights so a drag made earlier in the session (which appends a
  // row via moveApplicationStage but doesn't touch this hook) shows up
  // without needing a full page reload.
  useEffect(() => {
    if (view === 'insights') refreshStageHistory()
  }, [view, refreshStageHistory])

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Selection is board-scoped: leaving the board view, or switching which
  // tracker is active, invalidates whatever was selected rather than
  // silently carrying it into a different set of cards.
  useEffect(() => {
    clearSelection()
  }, [view, activeTrackerId])

  async function handleToggleReminders() {
    if (remindersEnabled) {
      setRemindersEnabledState(false)
      setRemindersEnabled(false)
      return
    }
    if (typeof Notification === 'undefined') return
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
    setNotificationPermission(permission)
    if (permission === 'granted') {
      setRemindersEnabledState(true)
      setRemindersEnabled(true)
    }
  }

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

  // Table view is just another rendering of the same active-tracker data as
  // the board (see byStage above), not a separate scope.
  const activeApplications = useMemo(
    () => applications.filter((app) => !app.is_archived && app.tracker_id === activeTrackerId),
    [applications, activeTrackerId],
  )

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
    setUndoState({ ids: [application.id], label: `Archived ${application.company}` })
    undoTimerRef.current = window.setTimeout(() => setUndoState(null), UNDO_WINDOW_MS)
  }

  async function handleBulkArchive(reason: ArchiveReason) {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    const companies = applications.filter((app) => ids.includes(app.id)).map((app) => app.company)
    clearSelection()
    try {
      await Promise.all(ids.map((id) => archiveApplication(id, reason)))
    } catch (err) {
      showError(err, 'Could not archive the selected applications. Please try again.')
      return
    }
    if (detailApplication && ids.includes(detailApplication.id)) setDetailApplication(null)
    clearUndoTimer()
    setUndoState({
      ids,
      label: ids.length === 1 ? `Archived ${companies[0]}` : `Archived ${ids.length} applications`,
    })
    undoTimerRef.current = window.setTimeout(() => setUndoState(null), UNDO_WINDOW_MS)
  }

  function handleUndo() {
    if (!undoState) return
    Promise.all(undoState.ids.map((id) => unarchiveApplication(id))).catch((err) =>
      showError(err, 'Could not undo the archive. Please try again.'),
    )
    clearUndoTimer()
    setUndoState(null)
  }

  function handleUnarchive(application: Application) {
    unarchiveApplication(application.id).catch((err) =>
      showError(err, 'Could not un-archive the application. Please try again.'),
    )
    if (undoState?.ids.includes(application.id)) {
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
      if (event.key === 'Escape' && selectedIds.size > 0) {
        clearSelection()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undoState, selectedIds])

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
    // A genuinely new user -- the extraction-resume effect below must wait
    // for this round to fully settle (including a user-answered prompt)
    // before it's safe to resolve/create a tracker, or it could race
    // migration and land the extracted application in a stale or
    // about-to-be-replaced tracker.
    setMigrationSettled(false)
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
        if (!cancelled) {
          setMigrating(false)
          setMigrationSettled(true)
        }
      }
    }

    hasAnyLocalGuestData().then((hasGuestData) => {
      if (cancelled) return
      const fromThisSignUp = consumePendingSignup(currentUser)
      if (!hasGuestData) {
        setMigrationSettled(true)
        return
      }
      if (fromThisSignUp) {
        runMigration()
      } else {
        // Settles once the user answers, in handleConfirmMigratePrompt /
        // handleDeclineMigratePrompt below -- not yet.
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
      setMigrationSettled(true)
    }
  }

  function handleDeclineMigratePrompt() {
    setMigratePrompt(false)
    setMigrationSettled(true)
  }

  // Picks the tracker an extension handoff's extracted application should
  // land in: the active one if there is one, else the first tracker, else
  // (a genuinely trackerless account/guest) creates one -- same default
  // name and behavior as the "+ Create tracker" empty state
  // (handleCreateFirstTracker below).
  const resolveTrackerIdForHandoff = useCallback(async (): Promise<string | null> => {
    if (activeTrackerId && trackers.some((t) => t.id === activeTrackerId)) return activeTrackerId
    if (trackers.length > 0) return trackers[0].id
    const tracker = await createTracker('My Applications')
    return tracker.id
  }, [activeTrackerId, trackers, createTracker])

  // Runs an extension-handoff extraction and opens the add form pre-filled
  // with the result, for the user to review and save -- same "extract, then
  // human confirms" flow as the in-form "Extract with AI" button (M8), just
  // triggered by an external postMessage instead of a click. On extraction
  // failure, still opens a blank-ish form seeded with the page's URL (if the
  // extension sent one) rather than losing the handoff entirely -- the user
  // can fill the rest in manually.
  const runExtensionExtraction = useCallback(
    async (payload: ExtensionHandoffPayload) => {
      setExtractingFromExtension(true)
      let trackerId: string | null
      try {
        trackerId = await resolveTrackerIdForHandoff()
      } catch (err) {
        setExtractingFromExtension(false)
        showError(err, 'Could not prepare a tracker for the extracted application.')
        return
      }
      setActiveTrackerId(trackerId)
      try {
        const fields = await extractJobDetailsFromText(payload.text)
        setFormState({
          mode: 'add',
          stage: 'applied',
          prefill: { ...fields, job_link: fields.job_link ?? payload.sourceUrl },
        })
      } catch (err) {
        showError(err, 'Could not extract job details from that page. You can still add it manually.')
        setFormState({
          mode: 'add',
          stage: 'applied',
          prefill: payload.sourceUrl ? { job_link: payload.sourceUrl } : null,
        })
      } finally {
        setExtractingFromExtension(false)
      }
    },
    [resolveTrackerIdForHandoff],
  )

  // Receiving half of the browser-extension handoff (milestone B1) -- see
  // src/lib/extensionHandoff.ts for the wire contract and why origin+source
  // are both checked (postMessage has no built-in sender scoping). Requires
  // sign-in (idea 1's decision): page text can't usefully be extracted from
  // without an account to run it against, unlike a plain link.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      const payload = parseExtensionMessage(event.data)
      if (!payload) return
      if (!user) {
        storePendingExtraction(payload)
        setAuthModalNotice('Sign in to extract job details from this page.')
        setAuthModalMode('sign-up')
        return
      }
      if (!migrationSettled || trackersLoading) {
        // Not safe to resolve/create a tracker yet -- stash it the same way
        // the sign-in wall does; the resume effect below picks it up once
        // migration has settled and trackers have loaded.
        storePendingExtraction(payload)
        return
      }
      runExtensionExtraction(payload)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [user, migrationSettled, trackersLoading, runExtensionExtraction])

  // Resumes a handoff held across the sign-in wall (or a not-yet-ready
  // moment above) once it's actually safe to act on: signed in, migration
  // fully settled (including any user-answered prompt), trackers loaded.
  useEffect(() => {
    if (!user) return
    if (!migrationSettled || trackersLoading) return
    const pending = consumePendingExtraction()
    if (!pending) return
    runExtensionExtraction(pending)
  }, [user, migrationSettled, trackersLoading, runExtensionExtraction])

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

  function handleStageChange(application: Application, stage: ApplicationStage) {
    moveApplicationStage(application.id, stage).catch((err) =>
      showError(err, 'Could not move the application. Please try again.'),
    )
  }

  function handleTogglePriority(application: Application) {
    togglePriority(application.id).catch((err) =>
      showError(err, 'Could not update the application. Please try again.'),
    )
  }

  function handleBulkMove(stage: ApplicationStage) {
    const ids = [...selectedIds]
    clearSelection()
    Promise.all(ids.map((id) => moveApplicationStage(id, stage))).catch((err) =>
      showError(err, 'Could not move the selected applications. Please try again.'),
    )
  }

  function handleBulkSetPriority(value: boolean) {
    const ids = [...selectedIds]
    clearSelection()
    Promise.all(ids.map((id) => togglePriority(id, value))).catch((err) =>
      showError(err, 'Could not update the selected applications. Please try again.'),
    )
  }

  // A single star toggle, not two menu items: with a mixed selection this
  // treats "any not-yet-priority card" as the sign to mark everything, and
  // only unmarks once every selected card is already priority -- the same
  // tri-state feel as a "select all" checkbox.
  const selectedApplications = useMemo(
    () => applications.filter((app) => selectedIds.has(app.id)),
    [applications, selectedIds],
  )
  const allSelectedArePriority = selectedApplications.length > 0 && selectedApplications.every((app) => app.is_priority)

  function handleBulkToggleStar() {
    handleBulkSetPriority(!allSelectedArePriority)
  }

  function handleBulkDeleteRequest() {
    const targets = applications.filter((app) => selectedIds.has(app.id))
    if (targets.length === 0) return
    setDeleteApplicationTargets(targets)
  }

  // Shared by both bulk-action entry points (a selected card's right-click
  // menu, and the SelectionToolbar's "Actions" button) -- grouped into 3
  // top-level choices (Move / Archive / Delete) rather than one flat list,
  // so choosing one doesn't require scanning past the other two kinds of
  // action. Most-wanted isn't in here at all -- it's the toolbar's star icon.
  function buildBulkMenuItems(): ContextMenuItem[] {
    return [
      {
        label: 'Move to stage',
        items: STAGE_ORDER.map((s) => ({ label: STAGE_LABELS[s], onSelect: () => handleBulkMove(s) })),
      },
      {
        label: 'Archive',
        items: ARCHIVE_REASONS.map((reason) => ({
          label: reason.label,
          onSelect: () => handleBulkArchive(reason.value),
        })),
      },
      { label: 'Delete', onSelect: handleBulkDeleteRequest, danger: true },
    ]
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
    if (!deleteApplicationTargets) return
    const ids = deleteApplicationTargets.map((app) => app.id)
    try {
      await Promise.all(ids.map((id) => deleteApplication(id)))
    } catch (err) {
      showError(err, 'Could not delete the application. Please try again.')
      return
    }
    if (detailApplication && ids.includes(detailApplication.id)) setDetailApplication(null)
    setDeleteApplicationTargets(null)
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
    return <div className="min-h-screen flex items-center justify-center text-ink-400">Loading…</div>
  }

  const pageTitle =
    view === 'archive' ? 'Archive' : view === 'insights' ? 'Insights' : view === 'privacy' ? 'Privacy policy' : null

  return (
    <div className="h-screen bg-ink-50 flex">
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
        remindersEnabled={remindersEnabled && notificationPermission === 'granted'}
        remindersBlocked={notificationPermission === 'denied'}
        onToggleReminders={handleToggleReminders}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-ink-200">
        <div className="flex items-center gap-2.5">
          <span className="shrink-0 w-6 h-6 rounded-[6px] overflow-hidden">
            <LogoMark className="w-full h-full" />
          </span>
          <h1 className="text-lg font-semibold text-ink-800">JobTracker</h1>
          {pageTitle && (
            <span className="text-lg font-normal text-ink-300">
              / <span className="text-ink-500">{pageTitle}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {migrating && <span className="text-sm text-ink-400">Syncing your data…</span>}
          {extractingFromExtension && (
            <span className="text-sm text-ink-400">Extracting job details…</span>
          )}
          <a
            href={DONATION_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Support this project"
            title="Support this project"
            className="text-ink-400 hover:text-ink-600 w-8 h-8 flex items-center justify-center rounded-md hover:bg-ink-100"
          >
            <CoffeeIcon className="w-5 h-5" />
          </a>
          {(view === 'board' || view === 'table') && activeTrackerId && (
            <button
              type="button"
              onClick={() => setFormState({ mode: 'add', stage: 'applied' })}
              className="px-3 py-1.5 text-sm font-medium text-white bg-ink-800 rounded-md hover:bg-ink-700"
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

      {(view === 'board' || view === 'table') && trackers.length > 0 && (
        <TrackerTabs
          trackers={trackers}
          activeTrackerId={activeTrackerId}
          onSelect={setActiveTrackerId}
          onCreate={(name) => createTracker(name).then((t) => setActiveTrackerId(t.id))}
          onRename={renameTracker}
          onDeleteRequest={setDeleteTrackerTarget}
          onReorder={reorderTrackers}
        />
      )}

      {view === 'archive' ? (
        <ArchiveView
          applications={archivedApplications}
          trackers={trackers}
          onBack={() => setView('board')}
          onCardOpen={setDetailApplication}
          onUnarchive={handleUnarchive}
          onDeleteRequest={(application) => setDeleteApplicationTargets([application])}
        />
      ) : view === 'privacy' ? (
        <PrivacyPolicy onBack={() => setView('board')} />
      ) : view === 'insights' ? (
        <InsightsView applications={applications} stageHistory={stageHistory} trackers={trackers} />
      ) : trackers.length === 0 || !activeTrackerId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm flex flex-col items-center">
            <h2 className="text-lg font-medium text-ink-800">Create your first tracker</h2>
            <p className="mt-2 text-sm text-ink-500">
              A tracker is its own board -- handy if you're job hunting in more than one place at once.
            </p>
            <button
              type="button"
              onClick={handleCreateFirstTracker}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-ink-800 rounded-md hover:bg-ink-700"
            >
              + Create tracker
            </button>
          </div>
        </div>
      ) : !activeTrackerHasApplications ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm flex flex-col items-center">
            <h2 className="text-lg font-medium text-ink-800">Nothing here yet</h2>
            <p className="mt-2 text-sm text-ink-500">
              Add the first job you're eyeing, applying to, or already interviewing for.
            </p>
            <button
              type="button"
              onClick={() => setFormState({ mode: 'add', stage: 'applied' })}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-ink-800 rounded-md hover:bg-ink-700"
            >
              + Add your first application
            </button>
            {!user && <ExtractionPromo onSignUp={() => setAuthModalMode('sign-up')} />}
          </div>
        </div>
      ) : view === 'table' ? (
        <TableView
          applications={activeApplications}
          onCardOpen={setDetailApplication}
          onStageChange={handleStageChange}
          onTogglePriority={handleTogglePriority}
        />
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
                  onCardDeleteRequest={(application) => setDeleteApplicationTargets([application])}
                  onCardTogglePriority={handleTogglePriority}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onClearSelection={clearSelection}
                  buildBulkMenuItems={buildBulkMenuItems}
                />
              ))}
            </div>
            <DragOverlay>
              {activeApplication ? <CardVisual application={activeApplication} dragging /> : null}
            </DragOverlay>
          </DndContext>
          {selectedIds.size > 0 && (
            <SelectionToolbar
              count={selectedIds.size}
              onClear={clearSelection}
              buildMenuItems={buildBulkMenuItems}
              starActive={allSelectedArePriority}
              onToggleStar={handleBulkToggleStar}
            />
          )}
        </main>
      )}

      {view !== 'privacy' && (
        <footer className="px-6 py-3 border-t border-ink-200 flex items-center justify-center gap-4 text-xs text-ink-400">
          <button type="button" onClick={() => setView('privacy')} className="hover:text-ink-600 hover:underline">
            Privacy policy
          </button>
          <a href="mailto:fazare@fazare.dev" className="hover:text-ink-600 hover:underline">
            Contact
          </a>
        </footer>
      )}
      </div>

      {formState && activeTrackerId && (
        <ApplicationForm
          initial={formState.mode === 'edit' ? formState.application : null}
          defaultStage={formState.mode === 'add' ? formState.stage : 'applied'}
          prefill={formState.mode === 'add' ? formState.prefill : null}
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
          onDeleteRequest={(application) => setDeleteApplicationTargets([application])}
          onTogglePriority={() => handleTogglePriority(detailApplication)}
        />
      )}

      {undoState && (
        <UndoToast message={undoState.label} onUndo={handleUndo} />
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

      {deleteApplicationTargets && (
        <DeleteApplicationModal
          applications={deleteApplicationTargets}
          onConfirm={handleConfirmDeleteApplication}
          onClose={() => setDeleteApplicationTargets(null)}
        />
      )}
    </div>
  )
}
