import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetIndexedDb } from '../test/dbHelpers'
import { installGlobalErrorHandlers, resetGlobalErrorsForTest } from '../lib/globalErrors'
import { getAllApplications, getAllInterviews } from '../lib/localStore'
import { Board } from './Board'

// Guest mode never touches Supabase, but useAuth() still calls these on
// mount -- stub them so tests don't depend on network/env config and stay
// deterministic (user always resolves to null, i.e. guest mode).
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}))

describe('Board archive/undo (guest mode)', () => {
  beforeEach(async () => {
    await resetIndexedDb()
  })

  afterEach(() => {
    cleanup()
  })

  async function addApplication(user: ReturnType<typeof userEvent.setup>, company: string) {
    await user.click(await screen.findByRole('button', { name: '+ Create tracker' }))
    await user.click(await screen.findByRole('button', { name: '+ Add your first application' }))
    await user.type(screen.getByLabelText(/company/i), company)
    await user.type(screen.getByLabelText(/role title/i), 'Engineer')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await screen.findByText(company)
  }

  it('archives a card and restores it via the undo toast', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addApplication(user, 'Acme Corp')

    await user.click(screen.getByText('Acme Corp'))
    await user.click(await screen.findByRole('button', { name: 'Archive' }))

    await screen.findByText(/archived acme corp/i)
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Undo' }))

    await waitFor(() => expect(screen.getByText('Acme Corp')).toBeInTheDocument())
  })

  it('archives a card and restores it via Ctrl/Cmd+Z', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addApplication(user, 'Globex Inc')

    await user.click(screen.getByText('Globex Inc'))
    await user.click(await screen.findByRole('button', { name: 'Archive' }))
    await screen.findByText(/archived globex inc/i)

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })

    await waitFor(() => expect(screen.getByText('Globex Inc')).toBeInTheDocument())
  })
})

describe('Board card context menu', () => {
  beforeEach(async () => {
    await resetIndexedDb()
  })

  afterEach(() => {
    cleanup()
  })

  async function addApplication(user: ReturnType<typeof userEvent.setup>, company: string) {
    await user.click(await screen.findByRole('button', { name: '+ Create tracker' }))
    await user.click(await screen.findByRole('button', { name: '+ Add your first application' }))
    await user.type(screen.getByLabelText(/company/i), company)
    await user.type(screen.getByLabelText(/role title/i), 'Engineer')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await screen.findByText(company)
  }

  it('moves a card to the next stage via "Move to Applied"', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addApplication(user, 'Acme Corp')

    const card = screen.getByText('Acme Corp').closest('div[role="button"]') as HTMLElement
    await user.click(within(card).getByRole('button', { name: 'More actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Move to Interview' }))

    await screen.findByRole('heading', { name: 'Interview 1' })
    expect(screen.getByRole('heading', { name: 'Applied 0' })).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  // Regression test: the menu is rendered inside the card's own DOM subtree
  // (fixed-positioned, not a portal), so a menu item click that doesn't
  // stop propagation bubbles to the card's onClick and re-triggers its
  // click-count debounce, silently reopening the detail view ~250ms after
  // an action was chosen.
  it('does not reopen the detail view after choosing a context menu action', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addApplication(user, 'Acme Corp')

    const card = screen.getByText('Acme Corp').closest('div[role="button"]') as HTMLElement
    await user.click(within(card).getByRole('button', { name: 'More actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Move to Interview' }))

    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('routes Delete through the confirm modal instead of deleting immediately', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addApplication(user, 'Acme Corp')

    const card = screen.getByText('Acme Corp').closest('div[role="button"]') as HTMLElement
    await user.click(within(card).getByRole('button', { name: 'More actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))

    expect(await screen.findByText('Delete "Acme Corp"?')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('marks a card as most wanted from the context menu, and can unmark it again', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addApplication(user, 'Acme Corp')

    const card = screen.getByText('Acme Corp').closest('div[role="button"]') as HTMLElement
    await user.click(within(card).getByRole('button', { name: 'More actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Mark as most wanted' }))

    await screen.findByLabelText('Most wanted')

    await user.click(within(card).getByRole('button', { name: 'More actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Remove from most wanted' }))

    await waitFor(() => expect(screen.queryByLabelText('Most wanted')).not.toBeInTheDocument())
  })

  it('toggles most-wanted from the card detail panel too', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addApplication(user, 'Acme Corp')

    await user.click(screen.getByText('Acme Corp'))
    const toggle = await screen.findByRole('button', { name: 'Mark as most wanted' })
    await user.click(toggle)

    expect(await screen.findByRole('button', { name: 'Remove from most wanted' })).toBeInTheDocument()
  })
})

describe('Board multi-select and bulk actions', () => {
  beforeEach(async () => {
    await resetIndexedDb()
  })

  afterEach(() => {
    cleanup()
  })

  async function addFirstApplication(user: ReturnType<typeof userEvent.setup>, company: string) {
    await user.click(await screen.findByRole('button', { name: '+ Create tracker' }))
    await user.click(await screen.findByRole('button', { name: '+ Add your first application' }))
    await user.type(screen.getByLabelText(/company/i), company)
    await user.type(screen.getByLabelText(/role title/i), 'Engineer')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await screen.findByText(company)
  }

  async function addApplication(user: ReturnType<typeof userEvent.setup>, company: string, stage = 'Applied') {
    await user.click(screen.getByRole('button', { name: `Add application to ${stage}` }))
    await user.type(screen.getByLabelText(/company/i), company)
    await user.type(screen.getByLabelText(/role title/i), 'Engineer')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await screen.findByText(company)
  }

  function ctrlClickCard(company: string) {
    const card = screen.getByText(company).closest('div[role="button"]') as HTMLElement
    fireEvent.click(card, { ctrlKey: true })
    return card
  }

  it('selects cards with Ctrl/Cmd+click and shows the selection toolbar', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addFirstApplication(user, 'Acme Corp')
    await addApplication(user, 'Globex Inc')

    ctrlClickCard('Acme Corp')
    await screen.findByText('1 selected')

    ctrlClickCard('Globex Inc')
    await screen.findByText('2 selected')

    // Ctrl+click again deselects, back down to one.
    ctrlClickCard('Globex Inc')
    await screen.findByText('1 selected')
  })

  it('a plain click while a selection is active clears it instead of opening detail', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addFirstApplication(user, 'Acme Corp')
    await addApplication(user, 'Globex Inc')

    ctrlClickCard('Acme Corp')
    await screen.findByText('1 selected')

    const other = screen.getByText('Globex Inc').closest('div[role="button"]') as HTMLElement
    fireEvent.click(other)

    expect(screen.queryByText('1 selected')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('bulk-moves selected cards to a stage via the toolbar\'s Actions menu', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addFirstApplication(user, 'Acme Corp')
    await addApplication(user, 'Globex Inc')

    ctrlClickCard('Acme Corp')
    ctrlClickCard('Globex Inc')
    await screen.findByText('2 selected')

    await user.click(screen.getByRole('button', { name: 'Actions ▾' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Move to stage ▸' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Interview' }))

    await screen.findByRole('heading', { name: 'Interview 2' })
    expect(screen.getByRole('heading', { name: 'Applied 0' })).toBeInTheDocument()
    expect(screen.queryByText('2 selected')).not.toBeInTheDocument()
  })

  it('bulk-archives selected cards via a right-click on a selected card, and undo restores both', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addFirstApplication(user, 'Acme Corp')
    await addApplication(user, 'Globex Inc')

    const card1 = ctrlClickCard('Acme Corp')
    ctrlClickCard('Globex Inc')
    await screen.findByText('2 selected')

    fireEvent.contextMenu(card1)
    await user.click(await screen.findByRole('menuitem', { name: 'Archive ▸' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Withdrawn' }))

    await screen.findByText('Archived 2 applications')
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument()
    expect(screen.queryByText('Globex Inc')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(screen.getByText('Acme Corp')).toBeInTheDocument())
    expect(screen.getByText('Globex Inc')).toBeInTheDocument()
  })

  it('routes bulk Delete through the confirm modal, naming the count', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addFirstApplication(user, 'Acme Corp')
    await addApplication(user, 'Globex Inc')

    ctrlClickCard('Acme Corp')
    ctrlClickCard('Globex Inc')
    await screen.findByText('2 selected')

    await user.click(screen.getByRole('button', { name: 'Actions ▾' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))

    expect(await screen.findByText('Delete 2 applications?')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Globex Inc')).toBeInTheDocument()
  })

  it('marks and unmarks most-wanted in bulk via the toolbar star icon', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addFirstApplication(user, 'Acme Corp')
    await addApplication(user, 'Globex Inc')

    ctrlClickCard('Acme Corp')
    ctrlClickCard('Globex Inc')
    await screen.findByText('2 selected')

    await user.click(screen.getByRole('button', { name: 'Mark as most wanted' }))

    await waitFor(() => expect(screen.getAllByLabelText('Most wanted')).toHaveLength(2))

    ctrlClickCard('Acme Corp')
    ctrlClickCard('Globex Inc')
    await screen.findByText('2 selected')
    await user.click(screen.getByRole('button', { name: 'Remove from most wanted' }))

    await waitFor(() => expect(screen.queryAllByLabelText('Most wanted')).toHaveLength(0))
  })
})

describe('Board global error surfacing (AUDIT.md C4)', () => {
  let uninstall: () => void

  beforeEach(async () => {
    await resetIndexedDb()
    // main.tsx installs this once at boot in production; tests render
    // Board directly without main.tsx, so it has to be installed here to
    // exercise the same path a real uncaught error would take.
    resetGlobalErrorsForTest()
    uninstall = installGlobalErrorHandlers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    uninstall()
    vi.restoreAllMocks()
    cleanup()
  })

  // A genuine ErrorEvent, not a plain Event with properties bolted on --
  // jsdom never invokes addEventListener('error', ...) listeners for a
  // dispatched 'error' event that only duck-types as an ErrorEvent. Also
  // suppresses jsdom's default action for an unhandled 'error' event,
  // which (unlike real browsers) it turns into an actual uncaught
  // exception in the test process rather than just a console log.
  function dispatchWindowError(overrides: { error?: Error; message: string }) {
    const event = new ErrorEvent('error', { cancelable: true, ...overrides })
    const suppressDefault = (e: Event) => e.preventDefault()
    window.addEventListener('error', suppressDefault)
    try {
      fireEvent(window, event)
    } finally {
      window.removeEventListener('error', suppressDefault)
    }
  }

  it('routes a window-level uncaught error through the existing ErrorToast, not a second UI', async () => {
    render(<Board />)

    dispatchWindowError({ error: new Error('boom'), message: 'boom' })

    const toast = await screen.findByRole('alert')
    expect(toast).toHaveTextContent(/something went wrong in the background/i)
  })

  it('does not surface known-benign noise like a ResizeObserver loop notice', async () => {
    render(<Board />)

    dispatchWindowError({ message: 'ResizeObserver loop completed with undelivered notifications.' })

    // Give any (incorrect) toast a chance to appear before asserting absence.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

// Guests can't use screenshot extraction (the quota is per-account), so the
// only way they learn it exists is these prompts -- and they're the exact
// traffic an ad for the feature would send. See AUDIT.md C6.
describe('Board extraction discovery (guest mode)', () => {
  const PROMO_CTA = 'Extract with AI'

  beforeEach(async () => {
    await resetIndexedDb()
  })

  afterEach(() => {
    cleanup()
  })

  // Not shown on the "create your first tracker" screen -- extraction
  // isn't actionable until a tracker exists to add into.
  it('does not promote extraction before any tracker exists', async () => {
    render(<Board />)

    await screen.findByRole('button', { name: '+ Create tracker' })
    expect(screen.queryByText(/skip the typing/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: PROMO_CTA })).not.toBeInTheDocument()
  })

  it('promotes extraction on the empty-board state, once a tracker exists', async () => {
    const user = userEvent.setup()
    render(<Board />)

    await user.click(await screen.findByRole('button', { name: '+ Create tracker' }))

    await screen.findByRole('button', { name: '+ Add your first application' })
    expect(screen.getByRole('button', { name: PROMO_CTA })).toBeInTheDocument()
  })

  it('opens sign-up from the promo, since extraction needs an account', async () => {
    const user = userEvent.setup()
    render(<Board />)

    await user.click(await screen.findByRole('button', { name: '+ Create tracker' }))
    await user.click(await screen.findByRole('button', { name: PROMO_CTA }))

    expect(await screen.findByRole('heading', { name: 'Create an account' })).toBeInTheDocument()
  })

  // The card has no dismiss button on purpose -- an empty board IS the
  // dismissal condition. If it ever leaked onto a populated board it would
  // become a permanent nag, which is the thing this design avoids.
  it('disappears once the board has an application', async () => {
    const user = userEvent.setup()
    render(<Board />)

    await user.click(await screen.findByRole('button', { name: '+ Create tracker' }))
    await user.click(await screen.findByRole('button', { name: '+ Add your first application' }))
    await user.type(screen.getByLabelText(/company/i), 'Acme Corp')
    await user.type(screen.getByLabelText(/role title/i), 'Engineer')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await screen.findByText('Acme Corp')

    expect(screen.queryByText(/skip the typing/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: PROMO_CTA })).not.toBeInTheDocument()
  })

  // A guest who already has applications never sees the empty-state card,
  // so the in-form hint is their only path to discovering the feature.
  it('hints at extraction inside the add form, where the real button is hidden', async () => {
    const user = userEvent.setup()
    render(<Board />)

    await user.click(await screen.findByRole('button', { name: '+ Create tracker' }))
    await user.click(await screen.findByRole('button', { name: '+ Add your first application' }))

    const hint = await screen.findByRole('button', { name: 'Free with an account' })
    await user.click(hint)

    expect(await screen.findByRole('heading', { name: 'Create an account' })).toBeInTheDocument()
  })
})

describe('Interview scheduling prompt (guest mode)', () => {
  beforeEach(async () => {
    await resetIndexedDb()
  })

  afterEach(() => {
    cleanup()
  })

  async function addFirstApplication(user: ReturnType<typeof userEvent.setup>, company: string) {
    await user.click(await screen.findByRole('button', { name: '+ Create tracker' }))
    await user.click(await screen.findByRole('button', { name: '+ Add your first application' }))
    await user.type(screen.getByLabelText(/company/i), company)
    await user.type(screen.getByLabelText(/role title/i), 'Engineer')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await screen.findByText(company)
  }

  // Creates a second application straight into a given column via its own
  // "+" -- the create-path prompt this describe block mostly exercises,
  // since it needs the board (not the empty-state screen) already showing.
  async function addApplication(user: ReturnType<typeof userEvent.setup>, company: string, stage = 'Applied') {
    await user.click(screen.getByRole('button', { name: `Add application to ${stage}` }))
    await user.type(screen.getByLabelText(/company/i), company)
    await user.type(screen.getByLabelText(/role title/i), 'Engineer')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await screen.findByText(company)
  }

  function ctrlClickCard(company: string) {
    const card = screen.getByText(company).closest('div[role="button"]') as HTMLElement
    fireEvent.click(card, { ctrlKey: true })
    return card
  }

  async function bulkMoveSelectionToInterview(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Actions ▾' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Move to stage ▸' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Interview' }))
  }

  // The modal's header renders "{company} — {role}" as a single text node,
  // scoped under the "Schedule the interview?" heading -- scoping through
  // it (rather than a bare screen.getByText) avoids colliding with the same
  // company name still visible on the card behind the modal.
  function modalHeader() {
    return screen.getByText('Schedule the interview?').parentElement as HTMLElement
  }

  it('prompts after creating a card directly into Interview, and Save persists a round', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addFirstApplication(user, 'First Co')
    await addApplication(user, 'Second Co', 'Interview')

    expect(await screen.findByText('Schedule the interview?')).toBeInTheDocument()
    expect(within(modalHeader()).getByText(/Second Co/)).toBeInTheDocument()
    // A single-card queue shows neither an "N of M" counter nor "Skip all" --
    // both are specific to a multi-card queue (see the bulk-move tests below).
    expect(screen.queryByText(/of 1/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Skip all' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByText('Schedule the interview?')).not.toBeInTheDocument())

    const apps = await getAllApplications()
    const secondCo = apps.find((a) => a.company === 'Second Co')!
    const interviews = await getAllInterviews()
    const forSecondCo = interviews.filter((i) => i.application_id === secondCo.id)
    expect(forSecondCo).toHaveLength(1)
    expect(forSecondCo[0].round).toBe(1)
  })

  it('creates no interview row when the prompt is skipped -- skip is the absence of a row, not a half-filled one', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addFirstApplication(user, 'First Co')
    await addApplication(user, 'Second Co', 'Interview')

    await screen.findByText('Schedule the interview?')
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    await waitFor(() => expect(screen.queryByText('Schedule the interview?')).not.toBeInTheDocument())

    const apps = await getAllApplications()
    const secondCo = apps.find((a) => a.company === 'Second Co')!
    const interviews = await getAllInterviews()
    expect(interviews.filter((i) => i.application_id === secondCo.id)).toHaveLength(0)
    // The card still landed in Interview -- skipping the prompt never blocks
    // the move itself.
    expect(secondCo.current_stage).toBe('interview')
  })

  it('queues one prompt per card on a bulk move, in "N of M" order, and Skip all discards every remaining card', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addFirstApplication(user, 'Card A')
    await addApplication(user, 'Card B')

    ctrlClickCard('Card A')
    ctrlClickCard('Card B')
    await screen.findByText('2 selected')
    await bulkMoveSelectionToInterview(user)

    expect(await screen.findByText('Schedule the interview?')).toBeInTheDocument()
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
    const skipAll = screen.getByRole('button', { name: 'Skip all' })

    await user.click(skipAll)
    await waitFor(() => expect(screen.queryByText('Schedule the interview?')).not.toBeInTheDocument())

    const apps = await getAllApplications()
    const cardA = apps.find((a) => a.company === 'Card A')!
    const cardB = apps.find((a) => a.company === 'Card B')!
    expect(cardA.current_stage).toBe('interview')
    expect(cardB.current_stage).toBe('interview')
    const interviews = await getAllInterviews()
    expect(interviews).toHaveLength(0)
  })

  it('advances to the next card in the queue after Save, and keeps both rounds', async () => {
    const user = userEvent.setup()
    render(<Board />)
    await addFirstApplication(user, 'Card A')
    await addApplication(user, 'Card B')

    ctrlClickCard('Card A')
    ctrlClickCard('Card B')
    await screen.findByText('2 selected')
    await bulkMoveSelectionToInterview(user)

    await screen.findByText('1 of 2')
    await user.click(screen.getByRole('button', { name: 'Save & next' }))
    await screen.findByText('2 of 2')
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByText('Schedule the interview?')).not.toBeInTheDocument())

    const interviews = await getAllInterviews()
    expect(interviews).toHaveLength(2)
  })
})
