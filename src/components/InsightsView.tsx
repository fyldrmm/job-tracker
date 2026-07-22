import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Application, ApplicationStage, ArchiveReason, StageHistoryEntry, Tracker } from '../types/application'
import { EMPLOYMENT_TYPES, WORK_MODES } from '../lib/employment'
import {
  computeApplicationsOverTime,
  computeEmploymentTypeSplit,
  computeFunnel,
  computeKpis,
  computeOutcomes,
  computeResponseRateBySegment,
  computeStageTiming,
  computeTrackerComparison,
  computeWorkModeSplit,
  filterApplicationsForScope,
  type InsightsScope,
} from '../lib/insights'
import { buildApplicationsCsv, triggerCsvDownload } from '../lib/csvExport'

interface InsightsViewProps {
  applications: Application[]
  stageHistory: StageHistoryEntry[]
  trackers: Tracker[]
}

// Fixed hue order (categorical identity, never cycled or reassigned by
// filter state -- see the dataviz skill). Light mode only: the app has no
// dark-mode variants anywhere else (see PLAN.md), so these charts don't need
// a dark ramp either.
const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'] as const

// Ordinal ramp for the four pipeline stages (lightest = earliest), reused
// across both the funnel and the stage-timing chart so a stage reads as the
// same color everywhere it appears.
const STAGE_COLORS: Record<ApplicationStage, string> = {
  eyes_on: '#86b6ef',
  applied: '#5598e7',
  interview: '#2a78d6',
  offer: '#1c5cab',
}

const REASON_COLORS: Record<ArchiveReason, string> = {
  rejected: CATEGORICAL[0],
  withdrawn: CATEGORICAL[1],
  no_response: CATEGORICAL[2],
  accepted: CATEGORICAL[3],
}

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}%`
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-ink-200 rounded-md p-4">
      <div className="text-2xl font-semibold text-ink-800">{value}</div>
      <div className="text-sm text-ink-500 mt-0.5">{label}</div>
    </div>
  )
}

function ChartCard({ title, empty, children }: { title: string; empty?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-ink-200 rounded-md p-4">
      <h3 className="text-sm font-medium text-ink-700 mb-3">{title}</h3>
      {empty ? <p className="text-sm text-ink-400 py-8 text-center">{empty}</p> : children}
    </div>
  )
}

const tooltipStyle = { fontSize: 13, borderRadius: 6, borderColor: '#cdd7cf' }

export function InsightsView({ applications, stageHistory, trackers }: InsightsViewProps) {
  const [scope, setScope] = useState<InsightsScope>('global')

  const scoped = useMemo(() => filterApplicationsForScope(applications, scope), [applications, scope])
  const kpis = useMemo(() => computeKpis(scoped, stageHistory), [scoped, stageHistory])
  const funnel = useMemo(() => computeFunnel(scoped, stageHistory), [scoped, stageHistory])
  const outcomes = useMemo(() => computeOutcomes(scoped), [scoped])
  const overTime = useMemo(() => computeApplicationsOverTime(scoped), [scoped])
  const stageTiming = useMemo(() => computeStageTiming(scoped, stageHistory), [scoped, stageHistory])
  const workModeSplit = useMemo(() => computeWorkModeSplit(scoped, WORK_MODES), [scoped])
  const employmentSplit = useMemo(() => computeEmploymentTypeSplit(scoped, EMPLOYMENT_TYPES), [scoped])
  const workModeResponse = useMemo(
    () => computeResponseRateBySegment(scoped, stageHistory, 'work_mode', WORK_MODES),
    [scoped, stageHistory],
  )
  const employmentResponse = useMemo(
    () => computeResponseRateBySegment(scoped, stageHistory, 'employment_type', EMPLOYMENT_TYPES),
    [scoped, stageHistory],
  )
  const trackerComparison = useMemo(
    () => computeTrackerComparison(applications, stageHistory, trackers),
    [applications, stageHistory, trackers],
  )

  const hasOutcomes = outcomes.some((o) => o.count > 0)
  const hasWorkMode = workModeSplit.some((s) => s.count > 0)
  const hasEmployment = employmentSplit.some((s) => s.count > 0)

  const scopeSlug =
    scope === 'global' ? 'all-trackers' : (trackers.find((t) => t.id === scope)?.name ?? scope).toLowerCase().replace(/[^a-z0-9]+/g, '-')

  const handleExportCsv = () => {
    const csv = buildApplicationsCsv(scoped, trackers)
    const date = new Date().toISOString().slice(0, 10)
    triggerCsvDownload(`jobtracker-${scopeSlug}-${date}.csv`, csv)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-ink-800">Insights</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={scoped.length === 0}
            className="text-sm px-3 py-1 rounded-md border border-ink-300 text-ink-700 hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
          <label className="flex items-center gap-1.5 text-sm text-ink-600">
            Tracker
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="border border-ink-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ink-400 bg-white"
            >
              <option value="global">All trackers</option>
              {trackers.map((tracker) => (
                <option key={tracker.id} value={tracker.id}>
                  {tracker.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {scoped.length === 0 ? (
        <p className="text-sm text-ink-400">No applications here yet -- add some to see insights.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <KpiTile label="Total applications" value={String(kpis.total)} />
            <KpiTile label="Active" value={String(kpis.active)} />
            <KpiTile label="Reached interview" value={formatPercent(kpis.interviewRate)} />
            <KpiTile label="Reached offer" value={formatPercent(kpis.offerRate)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Pipeline funnel">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={funnel} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid horizontal={false} stroke="#e0ebe2" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#637968' }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#455a4a' }}
                    width={70}
                  />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, 'Reached this stage']} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {funnel.map((stage) => (
                      <Cell key={stage.stage} fill={STAGE_COLORS[stage.stage]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-ink-400 mt-2">
                Each bar counts applications that ever reached that stage or beyond, so bars only shrink left to
                right.
              </p>
            </ChartCard>

            <ChartCard title="Outcomes" empty={!hasOutcomes ? 'No archived applications yet.' : undefined}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={outcomes.filter((o) => o.count > 0)}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={50}
                    outerRadius={80}
                  >
                    {outcomes
                      .filter((o) => o.count > 0)
                      .map((o) => (
                        <Cell key={o.reason} fill={REASON_COLORS[o.reason]} />
                      ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Applications over time">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={overTime} margin={{ left: -16 }}>
                  <CartesianGrid vertical={false} stroke="#e0ebe2" />
                  <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#637968' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#637968' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="active" name="Still active" fill={CATEGORICAL[0]} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="archived" name="Now archived" fill={CATEGORICAL[1]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-ink-400 mt-2">
                Grouped by the month you applied. The split shows each month's current status, not when it was
                archived -- an app from January archived last week still counts as January's.
              </p>
            </ChartCard>

            <ChartCard title="Avg. days to reach each stage">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stageTiming} margin={{ left: -16 }}>
                  <CartesianGrid vertical={false} stroke="#e0ebe2" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#637968' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#637968' }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _name, item) => [
                      value === null ? 'Not reached yet' : `${Number(value).toFixed(1)} days`,
                      `n=${item.payload.sampleSize}`,
                    ]}
                  />
                  <Bar dataKey="avgDaysToReach" radius={[3, 3, 0, 0]}>
                    {stageTiming.map((stage) => (
                      <Cell key={stage.stage} fill={STAGE_COLORS[stage.stage]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-ink-400 mt-2">
                Measured from the date you applied, since stage_history doesn't record how long an app sat in a
                stage before moving on.
              </p>
            </ChartCard>

            <ChartCard title="Work mode" empty={!hasWorkMode ? 'No applications tagged with a work mode yet.' : undefined}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={workModeSplit} margin={{ left: -16 }}>
                  <CartesianGrid vertical={false} stroke="#e0ebe2" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#637968' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#637968' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill={CATEGORICAL[0]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Employment type"
              empty={!hasEmployment ? 'No applications tagged with an employment type yet.' : undefined}
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={employmentSplit} margin={{ left: -16 }}>
                  <CartesianGrid vertical={false} stroke="#e0ebe2" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#637968' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#637968' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill={CATEGORICAL[0]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Response rate by work mode"
              empty={!hasWorkMode ? 'No applications tagged with a work mode yet.' : undefined}
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={workModeResponse.filter((r) => r.total > 0)} margin={{ left: -16 }}>
                  <CartesianGrid vertical={false} stroke="#e0ebe2" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#637968' }} />
                  <YAxis allowDecimals={false} unit="%" tick={{ fontSize: 12, fill: '#637968' }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _name, item) => [
                      `${Number(value).toFixed(0)}%`,
                      item.payload.pending > 0
                        ? `n=${item.payload.total} (${item.payload.pending} too new to count)`
                        : `n=${item.payload.total}`,
                    ]}
                  />
                  <Bar dataKey="rate" fill={CATEGORICAL[0]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-ink-400 mt-2">
                Excludes apps still active and under 14 days old -- too soon to call it a non-response.
              </p>
            </ChartCard>

            <ChartCard
              title="Response rate by employment type"
              empty={!hasEmployment ? 'No applications tagged with an employment type yet.' : undefined}
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={employmentResponse.filter((r) => r.total > 0)} margin={{ left: -16 }}>
                  <CartesianGrid vertical={false} stroke="#e0ebe2" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#637968' }} />
                  <YAxis allowDecimals={false} unit="%" tick={{ fontSize: 12, fill: '#637968' }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _name, item) => [
                      `${Number(value).toFixed(0)}%`,
                      item.payload.pending > 0
                        ? `n=${item.payload.total} (${item.payload.pending} too new to count)`
                        : `n=${item.payload.total}`,
                    ]}
                  />
                  <Bar dataKey="rate" fill={CATEGORICAL[0]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-ink-400 mt-2">
                Excludes apps still active and under 14 days old -- too soon to call it a non-response.
              </p>
            </ChartCard>

            {scope === 'global' && trackers.length > 1 && (
              <ChartCard title="Interview rate by tracker">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trackerComparison} margin={{ left: -16 }}>
                    <CartesianGrid vertical={false} stroke="#e0ebe2" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#637968' }} />
                    <YAxis allowDecimals={false} unit="%" tick={{ fontSize: 12, fill: '#637968' }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, _name, item) => [
                        value === null ? 'No applications' : `${Number(value).toFixed(0)}%`,
                        `n=${item.payload.total}`,
                      ]}
                    />
                    <Bar dataKey="interviewRate" fill={CATEGORICAL[0]} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>
        </>
      )}
    </div>
  )
}
