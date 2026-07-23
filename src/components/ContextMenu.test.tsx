import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContextMenu, type ContextMenuItem } from './ContextMenu'

afterEach(() => {
  cleanup()
})

describe('ContextMenu grouped (drill-down) items', () => {
  function items(onMove: (stage: string) => void, onDelete: () => void): ContextMenuItem[] {
    return [
      {
        label: 'Move to stage',
        items: [
          { label: 'Applied', onSelect: () => onMove('Applied') },
          { label: 'Interview', onSelect: () => onMove('Interview') },
        ],
      },
      { label: 'Delete', onSelect: onDelete, danger: true },
    ]
  }

  it('shows only the top-level groups until one is chosen', async () => {
    const user = userEvent.setup()
    render(<ContextMenu x={0} y={0} items={items(vi.fn(), vi.fn())} onClose={vi.fn()} />)

    expect(await screen.findByRole('menuitem', { name: 'Move to stage ▸' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Applied' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: '← Back' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: 'Move to stage ▸' }))

    expect(await screen.findByRole('menuitem', { name: 'Applied' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Interview' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '← Back' })).toBeInTheDocument()
    // Drilling in doesn't close the menu or run anything yet.
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('runs the leaf item and closes on selection', async () => {
    const user = userEvent.setup()
    const onMove = vi.fn()
    const onClose = vi.fn()
    render(<ContextMenu x={0} y={0} items={items(onMove, vi.fn())} onClose={onClose} />)

    await user.click(await screen.findByRole('menuitem', { name: 'Move to stage ▸' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Interview' }))

    expect(onMove).toHaveBeenCalledWith('Interview')
    expect(onClose).toHaveBeenCalled()
  })

  it('returns to the top level via Back without running anything', async () => {
    const user = userEvent.setup()
    const onMove = vi.fn()
    const onClose = vi.fn()
    render(<ContextMenu x={0} y={0} items={items(onMove, vi.fn())} onClose={onClose} />)

    await user.click(await screen.findByRole('menuitem', { name: 'Move to stage ▸' }))
    await user.click(await screen.findByRole('menuitem', { name: '← Back' }))

    expect(await screen.findByRole('menuitem', { name: 'Move to stage ▸' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
    expect(onMove).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('runs a top-level leaf item directly, without drilling', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    const onClose = vi.fn()
    render(<ContextMenu x={0} y={0} items={items(vi.fn(), onDelete)} onClose={onClose} />)

    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
