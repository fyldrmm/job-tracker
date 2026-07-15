import { useCallback, useEffect, useState } from 'react'
import { getAllApplications, putApplication } from '../lib/localStore'
import type { Application, ApplicationStage } from '../types/application'

export interface ApplicationInput {
  company: string
  role_title: string
  job_link: string | null
  date_applied: string
  current_stage: ApplicationStage
  salary_range: string | null
  location: string | null
  notes: string | null
}

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const all = await getAllApplications()
    setApplications(all)
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const createApplication = useCallback(
    async (input: ApplicationInput) => {
      const now = new Date().toISOString()
      const application: Application = {
        id: crypto.randomUUID(),
        user_id: null,
        ...input,
        is_archived: false,
        archive_reason: null,
        archived_at: null,
        created_at: now,
        updated_at: now,
      }
      await putApplication(application)
      await refresh()
    },
    [refresh],
  )

  const updateApplication = useCallback(
    async (id: string, input: ApplicationInput) => {
      const existing = applications.find((app) => app.id === id)
      if (!existing) return
      const updated: Application = {
        ...existing,
        ...input,
        updated_at: new Date().toISOString(),
      }
      await putApplication(updated)
      await refresh()
    },
    [applications, refresh],
  )

  return { applications, loading, createApplication, updateApplication }
}
