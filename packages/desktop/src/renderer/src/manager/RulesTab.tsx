import React from 'react'
import { Shield, Lock, Eye, Tag, Hash } from 'lucide-react'
import { SegmentedControl } from '../components/SegmentedControl'
import { Toggle } from '../components/Toggle'
import type { AppSettings, MaskingStrategy } from '../../../shared/types'

interface RulesTabProps {
  settings: AppSettings
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void
}

export const RulesTab: React.FC<RulesTabProps> = ({ settings, onUpdateSettings }) => {
  const strategyOptions: { value: MaskingStrategy; label: string; icon: React.ReactNode }[] = [
    { value: 'tag', label: 'Tag (<EMAIL>)', icon: <Tag className="w-3.5 h-3.5" /> },
    { value: 'redact', label: 'Redact ([REDACTED])', icon: <Lock className="w-3.5 h-3.5" /> },
    { value: 'asterisk', label: 'Asterisk (v***@...)', icon: <Eye className="w-3.5 h-3.5" /> },
    { value: 'hash', label: 'Hash ([#a8f1])', icon: <Hash className="w-3.5 h-3.5" /> }
  ]

  const entityDefinitions: { id: string; label: string; description: string; defaultOn: boolean }[] = [
    {
      id: 'EMAIL_ADDRESS',
      label: 'Email Addresses',
      description: 'Detects personal and corporate email addresses.',
      defaultOn: true
    },
    {
      id: 'PHONE_NUMBER',
      label: 'Phone Numbers',
      description: 'Detects international and regional phone numbers.',
      defaultOn: true
    },
    {
      id: 'CREDIT_CARD',
      label: 'Credit & Debit Cards',
      description: 'Detects card numbers with algorithmic Luhn checksum verification.',
      defaultOn: true
    },
    {
      id: 'US_SSN',
      label: 'Social Security Numbers (SSN)',
      description: 'Detects government SSN numbers.',
      defaultOn: true
    },
    {
      id: 'API_KEY',
      label: 'API Keys & Secrets',
      description: 'Detects AWS keys, GitHub tokens, Bearer tokens, and OpenAI secret keys.',
      defaultOn: true
    },
    {
      id: 'CRYPTO',
      label: 'Cryptocurrency Addresses',
      description: 'Detects Bitcoin and Ethereum blockchain wallet addresses.',
      defaultOn: true
    },
    {
      id: 'IP_ADDRESS',
      label: 'IP Addresses',
      description: 'Detects IPv4 and IPv6 network addresses.',
      defaultOn: true
    },
    {
      id: 'PERSON',
      label: 'Person Names',
      description: 'Powered by GLiNER local zero-shot NER model in Docker.',
      defaultOn: true
    },
    {
      id: 'LOCATION',
      label: 'Physical Locations & Addresses',
      description: 'Detects street addresses, cities, and zip codes via GLiNER.',
      defaultOn: false
    },
    {
      id: 'ORGANIZATION',
      label: 'Organizations & Companies',
      description: 'Detects registered corporate entities via GLiNER.',
      defaultOn: false
    }
  ]

  const handleToggleEntity = (entityId: string, enabled: boolean) => {
    onUpdateSettings({
      enabledEntities: {
        ...settings.enabledEntities,
        [entityId]: enabled
      }
    })
  }

  // Interactive Live Preview
  const getPreviewText = () => {
    switch (settings.maskingStrategy) {
      case 'redact':
        return 'Contact user at [REDACTED] or call [REDACTED]'
      case 'asterisk':
        return 'Contact user at j***e@example.com or call 555-***-0199'
      case 'hash':
        return 'Contact user at [#9b2a1c4e] or call [#7f3d2a1b]'
      case 'tag':
      default:
        return 'Contact user at <EMAIL_ADDRESS> or call <PHONE_NUMBER>'
    }
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto max-w-3xl">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">PII Detection & Masking Rules</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Configure how sensitive information is detected and transformed when copied to your clipboard.
          </p>
        </div>

        {/* Masking Style Section */}
        <div className="p-5 rounded-2xl glass-panel flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--text-primary)]">Default Masking Strategy</span>
            <span className="text-xs text-[var(--text-secondary)]">
              Select the transformation format applied when sensitive data is intercepted.
            </span>
          </div>

          <SegmentedControl
            options={strategyOptions}
            value={settings.maskingStrategy}
            onChange={(val) => onUpdateSettings({ maskingStrategy: val })}
          />

          {/* Live Preview Box */}
          <div className="mt-2 p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Output Transformation Preview
            </span>
            <p className="font-mono text-xs text-[#0A84FF]">
              {getPreviewText()}
            </p>
          </div>
        </div>

        {/* Entity Detectors List */}
        <div className="p-5 rounded-2xl glass-panel flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--text-primary)]">Active Entity Detectors</span>
            <span className="text-xs text-[var(--text-secondary)]">
              Toggle specific categories of sensitive personally identifiable information.
            </span>
          </div>

          <div className="divide-y divide-[var(--border-subtle)] flex flex-col">
            {entityDefinitions.map((ent) => {
              const isChecked = settings.enabledEntities[ent.id] !== false
              return (
                <div key={ent.id} className="py-2.5">
                  <Toggle
                    checked={isChecked}
                    onChange={(checked) => handleToggleEntity(ent.id, checked)}
                    label={ent.label}
                    description={ent.description}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
