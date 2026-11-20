/**
 * Secure Preload Script for Clipboard Masker.
 * Exposes type-safe ContextBridge APIs to the React renderer.
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { PreloadAPI, ClipboardItem, EngineStatus, DetectionStats, AppSettings } from '../shared/types'

const api: PreloadAPI = {
  getHistory: () => ipcRenderer.invoke('history:get'),
  copyItem: (id: string, useOriginal: boolean) => ipcRenderer.invoke('clipboard:copy-item', id, useOriginal),
  deleteItem: (id: string) => ipcRenderer.invoke('history:delete-item', id),
  togglePin: (id: string) => ipcRenderer.invoke('history:toggle-pin', id),
  clearHistory: () => ipcRenderer.invoke('history:clear'),

  getEngineStatus: () => ipcRenderer.invoke('engine:get-status'),
  pauseProtection: (durationMinutes: number | null) => ipcRenderer.invoke('engine:pause', durationMinutes),
  resumeProtection: () => ipcRenderer.invoke('engine:resume'),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke('settings:save', settings),

  getStats: () => ipcRenderer.invoke('stats:get'),

  closeHUD: () => ipcRenderer.invoke('window:close-hud'),
  openManager: () => ipcRenderer.invoke('window:open-manager'),
  minimizeManager: () => ipcRenderer.invoke('window:minimize-manager'),
  closeManager: () => ipcRenderer.invoke('window:close-manager'),

  // System Theme
  getSystemTheme: () => ipcRenderer.invoke('theme:get-system'),
  onThemeChanged: (callback: (theme: 'dark' | 'light') => void) => {
    const handler = (_: any, theme: 'dark' | 'light') => callback(theme)
    ipcRenderer.on('theme:changed', handler)
    return () => {
      ipcRenderer.removeListener('theme:changed', handler)
    }
  },

  onClipboardChanged: (callback: (item: ClipboardItem) => void) => {
    const handler = (_: any, item: ClipboardItem) => callback(item)
    ipcRenderer.on('clipboard:item-added', handler)
    return () => {
      ipcRenderer.removeListener('clipboard:item-added', handler)
    }
  },

  onStatusChanged: (callback: (status: EngineStatus) => void) => {
    const handler = (_: any, status: EngineStatus) => callback(status)
    ipcRenderer.on('engine:status-changed', handler)
    return () => {
      ipcRenderer.removeListener('engine:status-changed', handler)
    }
  },

  onStatsUpdated: (callback: (stats: DetectionStats) => void) => {
    const handler = (_: any, stats: DetectionStats) => callback(stats)
    ipcRenderer.on('stats:updated', handler)
    return () => {
      ipcRenderer.removeListener('stats:updated', handler)
    }
  }
}

contextBridge.exposeInMainWorld('clipboardMasker', api)
