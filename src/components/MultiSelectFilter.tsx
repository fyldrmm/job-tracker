import { useEffect, useRef, useState } from 'react'

interface MultiSelectFilterProps<T extends string> {
  label: string
  options: { value: T; label: string }[]
  selected: Set<T>
  onToggle: (value: T) => void
}

export function MultiSelectFilter<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: MultiSelectFilterProps<T>) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="border border-slate-300 rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-400"
      >
        {label} ({selected.size})
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg py-1 w-40 z-10">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(option.value)}
                onChange={() => onToggle(option.value)}
                className="rounded border-slate-300"
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
