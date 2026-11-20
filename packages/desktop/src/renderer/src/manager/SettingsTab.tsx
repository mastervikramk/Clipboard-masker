import React, { useState } from 'react'
import {
  Keyboard,
  HardDrive,
  Cpu,
  RefreshCw,
  AlertTriangle,
  Sun,
  Moon,
  Monitor,
  CheckCircle2,
  Sliders
} from 'lucide-react'
import { Toggle } from '../components/Toggle'
import { Button } from '../components/Button'
import type { AppSettings, EngineStatus } from '../../../shared/types'

interface SettingsTabProps {
  settings: AppSettings
  status: EngineStatus | null
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void
  onRefreshStatus: () => void
  api: any
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  status,
  onUpdateSettings,
  onRefreshStatus,
  api
}) => {
  const [hotkeyVal, setHotkeyVal] = useState(settings.hotkey || 'Alt+V')
  const [pasteMaskedHotkeyVal, setPasteMaskedHotkeyVal] = useState(settings.pasteMaskedHotkey || 'CommandOrControl+Shift+V')
  const [savedNote, setSavedNote] = useState<string | null>(null)
  
  const handleSaveHotkey = () => {
    onUpdateSettings({ hotkey: hotkeyVal, pasteMaskedHotkey: pasteMaskedHotkeyVal })
    setSavedNote('Shortcuts updated!')
    setTimeout(() => setSavedNote(null), 2000)
  }

  const handleThemeChange = (newTheme: 'system' | 'dark' | 'light') => {
    onUpdateSettings({ theme: newTheme })
    
    // Apply immediately to current DOM
    if (newTheme === 'dark') {
      document.documentElement.classList.remove('light')
      document.documentElement.classList.add('dark')
      document.documentElement.setAttribute('data-theme', 'dark')
      document.documentElement.style.colorScheme = 'dark'
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
      document.documentElement.setAttribute('data-theme', 'light')
      document.documentElement.style.colorScheme = 'light'
    } else {
      // system
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const resolved = isDark ? 'dark' : 'light'
      document.documentElement.classList.remove('dark', 'light')
      document.documentElement.classList.add(resolved)
      document.documentElement.setAttribute('data-theme', resolved)
      document.documentElement.style.colorScheme = resolved
    }
  }

  const retentionOptions = [
    { hours: 1, label: '1 Hour' },
    { hours: 24, label: '24 Hours (Recommended)' },
    { hours: 168, label: '7 Days' },
    { hours: 720, label: '30 Days' }
  ]

  return (
    <div className="flex-1 p-8 overflow-y-auto max-w-3xl">
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Application Settings</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Configure appearance theme, AI models, high-speed masking, and encrypted storage.
          </p>
        </div>

        {/* Appearance & Color Scheme (Theme) */}
        <div className="p-5 rounded-2xl glass-panel flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sun className="w-4 h-4 text-[#0A84FF]" />
              <div>
                <span className="text-xs font-semibold text-[var(--text-primary)]">Appearance & Color Theme</span>
                <p className="text-xs text-[var(--text-secondary)]">Adapts automatically to Windows system light and dark modes.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleThemeChange('system')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                settings.theme === 'system'
                  ? 'border-[#0A84FF] bg-[#0A84FF]/10 text-[#0A84FF] font-semibold ring-1 ring-[#0A84FF]/30'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
              }`}
            >
              <Monitor className="w-5 h-5" />
              <div className="text-center">
                <span className="text-xs block">System Default</span>
                <span className="text-[10px] text-[var(--text-muted)]">Auto (Matches Windows)</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                settings.theme === 'light'
                  ? 'border-[#0A84FF] bg-[#0A84FF]/10 text-[#0A84FF] font-semibold ring-1 ring-[#0A84FF]/30'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
              }`}
            >
              <Sun className="w-5 h-5" />
              <div className="text-center">
                <span className="text-xs block">Light Mode</span>
                <span className="text-[10px] text-[var(--text-muted)]">Frosted clean glass</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                settings.theme === 'dark'
                  ? 'border-[#0A84FF] bg-[#0A84FF]/10 text-[#0A84FF] font-semibold ring-1 ring-[#0A84FF]/30'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
              }`}
            >
              <Moon className="w-5 h-5" />
              <div className="text-center">
                <span className="text-xs block">Dark Mode</span>
                <span className="text-[10px] text-[var(--text-muted)]">Midnight obsidian glass</span>
              </div>
            </button>
          </div>
        </div>

        {/* Bundled AI Engine (GLiNER2-PII + Tier 1 Deterministic DLP) */}
        <div className="p-5 rounded-2xl glass-panel flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-[#0A84FF]" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Bundled AI & Protection Engine</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Default & Ready
                </span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={onRefreshStatus}
              icon={<RefreshCw className="w-3 h-3" />}
            >
              Refresh Status
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    status?.dockerStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  GLiNER2-PII + Tier 1 Deterministic DLP
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">
                {status?.dockerStatus === 'connected' ? 'In-Process Worker Active' : 'Tier 1 In-Process Active'}
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Pre-configured and bundled directly into the application setup. Uses mathematical checksums for structured data (Aadhaar Verhoeff, Credit Card Luhn, PAN, IFSC, UPI) and a 205M parameter bidirectional token classifier for contextual entities (names, addresses, organizations) with zero cloud calls, zero external daemons, and zero conversational refusals.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-subtle)] text-[11px]">
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span>Model Architecture:</span>
                <span className="text-[var(--text-primary)] font-medium">mDeBERTa-v3 Bi-Encoder</span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span>Entity Categories:</span>
                <span className="text-[var(--text-primary)] font-medium">42 Native Classes</span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span>Network Policy:</span>
                <span className="text-[var(--text-primary)] font-medium">100% Offline Air-Gapped</span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span>Latency Profile:</span>
                <span className="text-[var(--text-primary)] font-medium font-mono">
                  {status?.latencyMs !== undefined ? `${status.latencyMs}ms` : '~200ms'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Shortcuts */}
        <div className="p-5 rounded-2xl glass-panel flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-4 h-4 text-[#0A84FF]" />
            <div>
              <span className="text-xs font-semibold text-[var(--text-primary)]">Global Keyboard Shortcuts</span>
              <p className="text-xs text-[var(--text-secondary)]">Configure quick access hotkeys.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Summon Quick HUD</span>
              <input
                type="text"
                value={hotkeyVal}
                onChange={(e) => setHotkeyVal(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[#0A84FF]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Dedicated "Paste Masked" Shortcut</span>
              <input
                type="text"
                value={pasteMaskedHotkeyVal}
                onChange={(e) => setPasteMaskedHotkeyVal(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[#0A84FF]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
            <Button variant="primary" size="sm" onClick={handleSaveHotkey}>
              Save Shortcuts
            </Button>
            {savedNote && <span className="text-xs text-emerald-400 font-medium">{savedNote}</span>}
          </div>
        </div>

        {/* Data Retention & Storage Security */}
        <div className="p-5 rounded-2xl glass-panel flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-4 h-4 text-[#0A84FF]" />
            <div>
              <span className="text-xs font-semibold text-[var(--text-primary)]">Storage Security & Auto-Purge</span>
              <p className="text-xs text-[var(--text-secondary)]">Encrypted with AES-256-GCM. Unpinned history is purged automatically.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-[var(--text-secondary)]">Auto-Purge Retention Duration</span>
            <select
              value={settings.retentionHours}
              onChange={(e) => onUpdateSettings({ retentionHours: Number(e.target.value) })}
              className="px-3 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[#0A84FF] max-w-sm"
            >
              {retentionOptions.map((opt) => (
                <option key={opt.hours} value={opt.hours} className="bg-neutral-900 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <Toggle
              checked={settings.persistOriginalText}
              onChange={(checked) => onUpdateSettings({ persistOriginalText: checked })}
              label="Save Original Unmasked Text in Encrypted History"
              description="When disabled, raw sensitive text is never saved to disk and is only kept temporarily in RAM for the active session."
            />
          </div>
        </div>
      </div>
    </div>
  )
}
