import React from 'react'
import { ShieldCheck, ShieldAlert, Cpu, Activity } from 'lucide-react'
import type { DetectionStats, EngineStatus } from '../../../shared/types'

interface StatsTabProps {
  stats: DetectionStats | null
  status: EngineStatus | null
}

export const StatsTab: React.FC<StatsTabProps> = ({ stats, status }) => {
  const totalClips = stats?.totalClips || 0
  const totalPII = stats?.totalPIIDetected || 0
  const entityCounts = stats?.entityCounts || {}

  const sortedEntities: [string, number][] = Object.entries(entityCounts).map(
    ([k, v]) => [k, Number(v)]
  )
  sortedEntities.sort((a, b) => b[1] - a[1])

  return (
    <div className="flex-1 p-8 overflow-y-auto max-w-4xl">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">PII Detection Statistics</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Real-time telemetry on intercepted clipboard data and neutralized privacy risks.
          </p>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl glass-panel flex flex-col gap-2">
            <div className="flex items-center justify-between text-[var(--text-secondary)]">
              <span className="text-xs font-medium">Clips Monitored</span>
              <Activity className="w-4 h-4 text-[#0A84FF]" />
            </div>
            <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">{totalClips}</span>
            <span className="text-[11px] text-[var(--text-muted)]">Processed across system</span>
          </div>

          <div className="p-4 rounded-2xl glass-panel flex flex-col gap-2">
            <div className="flex items-center justify-between text-[var(--text-secondary)]">
              <span className="text-xs font-medium">PII Neutralized</span>
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-2xl font-bold font-mono text-emerald-400">{totalPII}</span>
            <span className="text-[11px] text-[var(--text-muted)]">Sensitive fields masked</span>
          </div>

          <div className="p-4 rounded-2xl glass-panel flex flex-col gap-2">
            <div className="flex items-center justify-between text-[var(--text-secondary)]">
              <span className="text-xs font-medium">Active Engine</span>
              <Cpu className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)] mt-1">
              {status?.dockerStatus === 'connected' ? status.modelName : 'Fast Fallback Engine'}
            </span>
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>{status?.dockerStatus === 'connected' ? 'Bundled GLiNER2 AI (~200ms)' : 'Tier 1 In-Process (< 1ms)'}</span>
              {status?.latencyMs !== undefined && (
                <span className="text-emerald-400 font-mono font-medium">{status.latencyMs}ms</span>
              )}
            </div>
          </div>
        </div>

        {/* Breakdown by Entity Type */}
        <div className="p-5 rounded-2xl glass-panel flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-primary)]">Neutralized Entities Breakdown</span>
            <span className="text-xs text-[var(--text-secondary)]">{sortedEntities.length} categories active</span>
          </div>

          {sortedEntities.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No sensitive entities detected yet. Copy an email, phone number, or card to test!
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sortedEntities.map(([entity, count]) => {
                const percentage = totalPII > 0 ? Math.round((count / totalPII) * 100) : 0
                return (
                  <div key={entity} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[var(--text-primary)]">{entity.replace('_', ' ')}</span>
                      <span className="text-[var(--text-secondary)]">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                      <div
                        className="h-full bg-[#0A84FF] rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Protection Health Card */}
        <div className="p-5 rounded-2xl glass-panel flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-primary)]">Active Real-Time Protection</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Two-tier instant masking pipeline: &lt; 1ms deterministic pass + asynchronous local SLM reasoning.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            Running
          </span>
        </div>
      </div>
    </div>
  )
}
