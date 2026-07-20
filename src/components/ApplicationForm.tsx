import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Application, ApplicationStage, EmploymentType, WorkMode } from '../types/application'
import type { ApplicationInput } from '../hooks/useApplications'
import { extractJobDetails, getExtractionUsageThisMonth } from '../lib/remoteStore'
import { PER_USER_MONTHLY_LIMIT } from '../lib/extraction'
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS } from '../lib/employment'
import { useModalDismiss } from '../hooks/useModalDismiss'

interface ApplicationFormProps {
  initial: Application | null
  defaultStage: ApplicationStage
  userId: string | null
  onSubmit: (input: ApplicationInput) => Promise<void>
  onClose: () => void
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

const MAX_EXTRACT_IMAGE_BYTES = 5 * 1024 * 1024

export function ApplicationForm({ initial, defaultStage, userId, onSubmit, onClose }: ApplicationFormProps) {
  const isSignedIn = userId !== null
  const [company, setCompany] = useState(initial?.company ?? '')
  const [roleTitle, setRoleTitle] = useState(initial?.role_title ?? '')
  const [dateApplied, setDateApplied] = useState(initial?.date_applied ?? today())
  const [jobLink, setJobLink] = useState(initial?.job_link ?? '')
  const [salaryRange, setSalaryRange] = useState(initial?.salary_range ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [employmentType, setEmploymentType] = useState<EmploymentType | ''>(initial?.employment_type ?? '')
  const [workMode, setWorkMode] = useState<WorkMode | ''>(initial?.work_mode ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [extractionsLeft, setExtractionsLeft] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Escape closes the form; no backdrop-click-to-close, to avoid losing
  // typed input on a stray click outside the dialog.
  useModalDismiss(onClose)

  const isEdit = initial !== null

  // Load remaining extraction quota when the Extract button is shown
  // (signed-in, add mode). Best-effort -- a failure just hides the counter
  // rather than blocking the form; the server still enforces the real cap.
  useEffect(() => {
    if (isEdit || !userId) return
    let cancelled = false
    getExtractionUsageThisMonth(userId)
      .then((used) => {
        if (!cancelled) setExtractionsLeft(Math.max(0, PER_USER_MONTHLY_LIMIT - used))
      })
      .catch(() => {
        /* leave the counter hidden on failure */
      })
    return () => {
      cancelled = true
    }
  }, [isEdit, userId])

  async function handleScreenshotSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file next time
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setExtractError('Please choose an image file.')
      return
    }
    if (file.size > MAX_EXTRACT_IMAGE_BYTES) {
      setExtractError('Image is too large. Please use a smaller screenshot (max 5MB).')
      return
    }

    setExtracting(true)
    setExtractError(null)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      const imageBase64 = dataUrl.slice(dataUrl.indexOf(',') + 1)

      const fields = await extractJobDetails(imageBase64, file.type)
      if (fields.company) setCompany(fields.company)
      if (fields.role_title) setRoleTitle(fields.role_title)
      if (fields.salary_range) setSalaryRange(fields.salary_range)
      if (fields.location) setLocation(fields.location)
      if (fields.job_link) setJobLink(fields.job_link)
      if (fields.employment_type) setEmploymentType(fields.employment_type)
      if (fields.work_mode) setWorkMode(fields.work_mode)
      setExtractionsLeft((left) => (left !== null ? Math.max(0, left - 1) : left))
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Extraction failed. Please fill in the details manually.')
    } finally {
      setExtracting(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!company.trim() || !roleTitle.trim() || !dateApplied) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit({
        company: company.trim(),
        role_title: roleTitle.trim(),
        date_applied: dateApplied,
        current_stage: initial?.current_stage ?? defaultStage,
        job_link: jobLink.trim() || null,
        salary_range: salaryRange.trim() || null,
        location: location.trim() || null,
        employment_type: employmentType || null,
        work_mode: workMode || null,
        notes: notes.trim() || null,
      })
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save. Please try again.')
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

          {!isEdit && isSignedIn && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleScreenshotSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={extracting || extractionsLeft === 0}
                className="text-sm font-medium text-slate-600 border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-100 disabled:opacity-50"
              >
                {extracting ? 'Extracting...' : 'Extract from screenshot'}
              </button>
              {extractionsLeft !== null && (
                <p className="mt-1 text-xs text-slate-400">
                  {extractionsLeft === 0
                    ? "You've used all your free extractions this month."
                    : `${extractionsLeft} of ${PER_USER_MONTHLY_LIMIT} free extractions left this month.`}
                </p>
              )}
              {extractError && <p className="mt-1 text-sm text-red-600">{extractError}</p>}
            </div>
          )}

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-slate-700">
              Company *
            </label>
            <input
              id="company"
              type="text"
              required
              maxLength={200}
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
              maxLength={200}
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
              maxLength={2000}
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
                maxLength={200}
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
                maxLength={200}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="employment_type" className="block text-sm font-medium text-slate-700">
                Employment type
              </label>
              <select
                id="employment_type"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType | '')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="">Not specified</option>
                {(Object.entries(EMPLOYMENT_TYPE_LABELS) as [EmploymentType, string][]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="work_mode" className="block text-sm font-medium text-slate-700">
                Work mode
              </label>
              <select
                id="work_mode"
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as WorkMode | '')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="">Not specified</option>
                {(Object.entries(WORK_MODE_LABELS) as [WorkMode, string][]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              maxLength={5000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {submitError && <p className="text-sm text-rose-600">{submitError}</p>}

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
