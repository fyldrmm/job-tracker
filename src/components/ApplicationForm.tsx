import { useState, type FormEvent } from 'react'
import type { Application, ApplicationStage } from '../types/application'
import type { ApplicationInput } from '../hooks/useApplications'

interface ApplicationFormProps {
  initial: Application | null
  defaultStage: ApplicationStage
  onSubmit: (input: ApplicationInput) => Promise<void>
  onClose: () => void
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ApplicationForm({ initial, defaultStage, onSubmit, onClose }: ApplicationFormProps) {
  const [company, setCompany] = useState(initial?.company ?? '')
  const [roleTitle, setRoleTitle] = useState(initial?.role_title ?? '')
  const [dateApplied, setDateApplied] = useState(initial?.date_applied ?? today())
  const [jobLink, setJobLink] = useState(initial?.job_link ?? '')
  const [salaryRange, setSalaryRange] = useState(initial?.salary_range ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [submitting, setSubmitting] = useState(false)

  const isEdit = initial !== null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!company.trim() || !roleTitle.trim() || !dateApplied) return

    setSubmitting(true)
    try {
      await onSubmit({
        company: company.trim(),
        role_title: roleTitle.trim(),
        date_applied: dateApplied,
        current_stage: initial?.current_stage ?? defaultStage,
        job_link: jobLink.trim() || null,
        salary_range: salaryRange.trim() || null,
        location: location.trim() || null,
        notes: notes.trim() || null,
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-medium text-slate-800">
            {isEdit ? 'Edit application' : 'Add application'}
          </h2>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-slate-700">
              Company *
            </label>
            <input
              id="company"
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div>
            <label htmlFor="role_title" className="block text-sm font-medium text-slate-700">
              Role title *
            </label>
            <input
              id="role_title"
              type="text"
              required
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div>
            <label htmlFor="date_applied" className="block text-sm font-medium text-slate-700">
              Date applied *
            </label>
            <input
              id="date_applied"
              type="date"
              required
              value={dateApplied}
              onChange={(e) => setDateApplied(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div>
            <label htmlFor="job_link" className="block text-sm font-medium text-slate-700">
              Job link
            </label>
            <input
              id="job_link"
              type="url"
              value={jobLink}
              onChange={(e) => setJobLink(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="salary_range" className="block text-sm font-medium text-slate-700">
                Salary range
              </label>
              <input
                id="salary_range"
                type="text"
                value={salaryRange}
                onChange={(e) => setSalaryRange(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-slate-700">
                Location
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-50"
            >
              {isEdit ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
