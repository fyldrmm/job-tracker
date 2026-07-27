import { useEffect, useState } from 'react'
import { getCurrency, createCheckoutSession } from '../lib/billing'
import type { SubscriptionSummary } from '../lib/entitlements'

interface PricingPageProps {
  userId: string | null
  subscription: SubscriptionSummary
  onBack: () => void
  onRequireAuth: () => void
  onOpenTerms: () => void
}

const PRICES = {
  usd: { symbol: '$', monthly: '5.99', quarterly: '14.99' },
  eur: { symbol: '€', monthly: '5.99', quarterly: '14.99' },
}

export function PricingPage({ userId, subscription, onBack, onRequireAuth, onOpenTerms }: PricingPageProps) {
  const [currency, setCurrency] = useState<'usd' | 'eur'>('usd')
  const [startingCheckout, setStartingCheckout] = useState<'monthly' | 'quarterly' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getCurrency().then((c) => {
      if (!cancelled) setCurrency(c)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const price = PRICES[currency]

  async function handleSubscribe(plan: 'monthly' | 'quarterly') {
    if (!userId) {
      onRequireAuth()
      return
    }
    setError(null)
    setStartingCheckout(plan)
    try {
      const url = await createCheckoutSession(plan)
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStartingCheckout(null)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <button type="button" onClick={onBack} className="text-sm font-medium text-ink-600 hover:text-ink-800 mb-4">
        ← Back to board
      </button>

      <div className="max-w-2xl">
        <h2 className="text-lg font-medium text-ink-800">OfferTrail Pro</h2>
        <p className="mt-1 text-sm text-ink-600">
          The board, manual entry, archive, interview tracking, and calendar export stay free forever. Pro adds more
          AI extraction and power-user exports.
        </p>

        {subscription.isCompAccount ? (
          <div className="mt-6 rounded-lg border border-ink-200 bg-ink-50 p-6">
            <p className="text-sm font-medium text-ink-800">You have unlimited access on this account.</p>
          </div>
        ) : subscription.isPro ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-sm font-medium text-emerald-900">
              You're already on the {subscription.plan === 'quarterly' ? 'quarterly' : 'monthly'} Pro plan.
            </p>
            <p className="mt-1 text-sm text-emerald-800">Manage or cancel your subscription from Account settings.</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-ink-200 p-6 flex flex-col">
              <h3 className="text-sm font-medium text-ink-800">Monthly</h3>
              <p className="mt-2 text-3xl font-semibold text-ink-800">
                {price.symbol}
                {price.monthly}
                <span className="text-sm font-normal text-ink-400"> /month</span>
              </p>
              <button
                type="button"
                onClick={() => handleSubscribe('monthly')}
                disabled={startingCheckout !== null}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-ink-800 rounded-md hover:bg-ink-700 disabled:opacity-50"
              >
                {startingCheckout === 'monthly' ? 'Starting checkout…' : 'Subscribe monthly'}
              </button>
            </div>

            <div className="rounded-lg border border-ink-800 p-6 flex flex-col relative">
              <span className="absolute -top-3 left-4 bg-ink-800 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                Better value
              </span>
              <h3 className="text-sm font-medium text-ink-800">Quarterly</h3>
              <p className="mt-2 text-3xl font-semibold text-ink-800">
                {price.symbol}
                {price.quarterly}
                <span className="text-sm font-normal text-ink-400"> /quarter</span>
              </p>
              <button
                type="button"
                onClick={() => handleSubscribe('quarterly')}
                disabled={startingCheckout !== null}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-ink-800 rounded-md hover:bg-ink-700 disabled:opacity-50"
              >
                {startingCheckout === 'quarterly' ? 'Starting checkout…' : 'Subscribe quarterly'}
              </button>
            </div>
          </div>
        )}

        {!subscription.isPro && !subscription.isCompAccount && (
          <>
            <p className="mt-4 text-xs text-ink-400">
              Early pricing — this rate may change for new subscribers in the future. If you're already subscribed,
              your price stays the same for as long as you keep your subscription. See the{' '}
              <button type="button" onClick={onOpenTerms} className="underline hover:no-underline">
                Terms of Service
              </button>{' '}
              for the full subscription and refund policy.
            </p>
            {!userId && (
              <p className="mt-2 text-sm text-ink-500">
                You'll need an account to subscribe — we'll ask you to sign in or create one first.
              </p>
            )}
          </>
        )}

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        <div className="mt-8 space-y-1 text-sm text-ink-600">
          <p className="font-medium text-ink-800">What's in Pro</p>
          <p>• AI extraction: 500/month, up from 5 free</p>
          <p>• XLSX and CSV export for Table view and Insights</p>
        </div>
      </div>
    </div>
  )
}
