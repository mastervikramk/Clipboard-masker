import React, { useState, useEffect } from 'react'
import {
  Clock,
  Sliders,
  BarChart3,
  Settings,
  Minus,
  X,
  Lock
} from 'lucide-react'
import { HistoryTab } from './HistoryTab'
import { RulesTab } from './RulesTab'
import { StatsTab } from './StatsTab'
import { SettingsTab } from './SettingsTab'
import { StatusPill } from '../components/StatusPill'
import { AppLogo } from '../components/AppLogo'
import type { ClipboardItem, EngineStatus, AppSettings, DetectionStats } from '../../../shared/types'

export const ManagerView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'history' | 'rules' | 'stats' | 'settings'>('history')
  const [items, setItems] = useState<ClipboardItem[]>([])
  const [status, setStatus] = useState<EngineStatus | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [stats, setStats] = useState<DetectionStats | null>(null)

  const api = (window as any).clipboardMasker

  const loadData = () => {
    if (!api) return
    api.getHistory().then(setItems)
    api.getEngineStatus().then(setStatus)
    api.getSettings().then(setSettings)
    api.getStats().then(setStats)
  }

  useEffect(() => {
    loadData()

    if (!api) return

    const unsubClip = api.onClipboardChanged((newItem: ClipboardItem) => {
      setItems((prev) => [newItem, ...prev.filter((i) => i.id !== newItem.id)])
    })

    const unsubStatus = api.onStatusChanged((newStatus: EngineStatus) => {
      setStatus(newStatus)
    })

    const unsubStats = api.onStatsUpdated((newStats: DetectionStats) => {
      setStats(newStats)
    })

    return () => {
      unsubClip()
      unsubStatus()
      unsubStats()
    }
  }, [api])

  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    if (!api || !settings) return
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    await api.saveSettings(newSettings)
  }

  const handleRefreshStatus = async () => {
    if (!api) return
    const s = await api.getEngineStatus()
    setStatus(s)
  }

  const navItems: { id: 'history' | 'rules' | 'stats' | 'settings'; label: string; icon: React.ReactNode }[] = [
    { id: 'history', label: 'Clipboard History', icon: <Clock className="w-4 h-4" /> },
    { id: 'rules', label: 'PII Rules & Policies', icon: <Sliders className="w-4 h-4" /> },
    { id: 'stats', label: 'Detection Stats', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> }
  ]

  return (
    <div className="w-full h-screen flex flex-col bg-[var(--bg-app)] text-[var(--text-primary)] select-none overflow-hidden">
      {/* Top Apple Style Title Bar */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-[var(--border-subtle)] drag-region bg-[var(--bg-header)]">
        <div className="flex items-center gap-2.5 no-drag-region">
          <AppLogo className="w-5 h-5 rounded-md shadow-sm" />
          <span className="text-xs font-semibold tracking-wide text-[var(--text-primary)]">
            Clipboard Masker
          </span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">v1.0.0</span>
        </div>

        <div className="flex items-center gap-2 no-drag-region">
          <StatusPill status={status} onClick={() => setActiveTab('settings')} />
          <button
            type="button"
            title="Minimize"
            onClick={() => api?.minimizeManager()}
            className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-hover)] transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Close"
            onClick={() => api?.closeManager()}
            className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-hover)] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-3 flex flex-col justify-between">
          <div className="flex flex-col gap-1">
            <span className="px-3 pt-2 pb-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Navigation
            </span>
            {navItems.map((item) => {
              const isSelected = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[#0A84FF] text-white shadow-sm font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              )
            })}
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-[11px]">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Zero-Log Privacy</span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] leading-tight">
              All processing remains strictly local. Unmasked data is never sent to external servers.
            </p>
          </div>
        </div>

        {/* Content Pane */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-app)]">
          {activeTab === 'history' && (
            <HistoryTab items={items} onRefresh={loadData} api={api} />
          )}
          {activeTab === 'rules' && settings && (
            <RulesTab settings={settings} onUpdateSettings={handleUpdateSettings} />
          )}
          {activeTab === 'stats' && (
            <StatsTab stats={stats} status={status} />
          )}
          {activeTab === 'settings' && settings && (
            <SettingsTab
              settings={settings}
              status={status}
              onUpdateSettings={handleUpdateSettings}
              onRefreshStatus={handleRefreshStatus}
              api={api}
            />
          )}
        </div>
      </div>
    </div>
  )
}
