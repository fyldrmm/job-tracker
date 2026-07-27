import { useCallback, useEffect, useState } from 'react'
import { FREE_SUBSCRIPTION, getSubscriptionSummary, type SubscriptionSummary } from '../lib/entitlements'

// Mirrors useTrackers/useApplications's useX(userId) + refresh() shape.
// Guests (userId null) never hit the network -- there's no session for RLS
// to scope a subscriptions row to, so the free-tier default is returned
// directly rather than making a request that would just come back empty.
export function useEntitlement(userId: string | null) {
  const [summary, setSummary] = useState<SubscriptionSummary>(FREE_SUBSCRIPTION)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const result = userId ? await getSubscriptionSummary() : FREE_SUBSCRIPTION
    setSummary(result)
  }, [userId])

  useEffect(() => {
    setLoading(true)
    refresh().finally(() => setLoading(false))
  }, [refresh])

  return { ...summary, loading, refresh }
}
