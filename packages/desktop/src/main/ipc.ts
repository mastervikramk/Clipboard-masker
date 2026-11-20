/**
 * IPC Communication Handlers for Clipboard Masker.
 * Securely links Main process capabilities to Renderer windows.
 */
import { ipcMain, nativeTheme } from 'electron'
import { store } from '../storage/store'
import { glinerEngine } from '../engine/gliner-engine'
import { clipboardMonitor } from '../clipboard/monitor'
import { getHUDWindow, getManagerWindow, createManagerWindow } from './windows'
import { registerGlobalShortcuts } from './shortcuts'
import { updateTrayContextMenu } from './tray'
import type { ClipboardItem, AppSettings, EngineStatus, DetectionStats } from '../shared/types'

export function setupIPCHandlers(): void {
  // History & Clips
  ipcMain.handle('history:get', async () => {
    return store.getItems()
  })

  ipcMain.handle('clipboard:copy-item', async (_, id: string, useOriginal: boolean) => {
    return clipboardMonitor.copyItemToClipboard(id, useOriginal)
  })

  ipcMain.handle('history:delete-item', async (_, id: string) => {
    return store.deleteItem(id)
  })

  ipcMain.handle('history:toggle-pin', async (_, id: string) => {
    return store.togglePin(id)
  })

  ipcMain.handle('history:clear', async () => {
    return store.clearHistory()
  })

  // Engine & Status
  ipcMain.handle('engine:get-status', async () => {
    return glinerEngine.getStatus()
  })

  ipcMain.handle('engine:pause', async (_, durationMinutes: number | null) => {
    glinerEngine.setPaused(true, durationMinutes)
    updateTrayContextMenu()
    broadcastStatus()
    return true
  })

  ipcMain.handle('engine:resume', async () => {
    glinerEngine.setPaused(false)
    updateTrayContextMenu()
    broadcastStatus()
    return true
  })

  // Settings
  ipcMain.handle('settings:get', async () => {
    return store.getSettings()
  })

  ipcMain.handle('settings:save', async (_, newSettings: Partial<AppSettings>) => {
    const success = store.saveSettings(newSettings)
    if (newSettings.hotkey || newSettings.maskHotkey || newSettings.pasteMaskedHotkey) {
      registerGlobalShortcuts()
    }
    if (newSettings.selectedModel) {
      updateTrayContextMenu()
      broadcastStatus()
    }
    return success
  })

  // Models & AI
  ipcMain.handle('model:get-available', async () => {
    return ['gliner2-pii']
  })

  ipcMain.handle('model:pull', async () => {
    return true
  })

  // Theme
  ipcMain.handle('theme:get-system', async () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  })

  nativeTheme.on('updated', () => {
    broadcastTheme(nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
  })

  // Stats
  ipcMain.handle('stats:get', async () => {
    return store.getStats()
  })

  // Window Controls
  ipcMain.handle('window:close-hud', async () => {
    const hud = getHUDWindow()
    if (hud && !hud.isDestroyed()) {
      hud.hide()
    }
  })

  ipcMain.handle('window:open-manager', async () => {
    createManagerWindow()
  })

  ipcMain.handle('window:minimize-manager', async () => {
    const mgr = getManagerWindow()
    if (mgr && !mgr.isDestroyed()) {
      mgr.minimize()
    }
  })

  ipcMain.handle('window:close-manager', async () => {
    const mgr = getManagerWindow()
    if (mgr && !mgr.isDestroyed()) {
      mgr.close()
    }
  })
}

export function broadcastClipboardItem(item: ClipboardItem): void {
  const hud = getHUDWindow()
  if (hud && !hud.isDestroyed() && !hud.webContents.isDestroyed()) {
    hud.webContents.send('clipboard:item-added', item)
  }

  const mgr = getManagerWindow()
  if (mgr && !mgr.isDestroyed() && !mgr.webContents.isDestroyed()) {
    mgr.webContents.send('clipboard:item-added', item)
  }
}

export function broadcastStatus(): void {
  const status = glinerEngine.getStatus()
  const hud = getHUDWindow()
  if (hud && !hud.isDestroyed() && !hud.webContents.isDestroyed()) {
    hud.webContents.send('engine:status-changed', status)
  }
  const mgr = getManagerWindow()
  if (mgr && !mgr.isDestroyed() && !mgr.webContents.isDestroyed()) {
    mgr.webContents.send('engine:status-changed', status)
  }
}

export function broadcastStats(stats: DetectionStats): void {
  const mgr = getManagerWindow()
  if (mgr && !mgr.isDestroyed() && !mgr.webContents.isDestroyed()) {
    mgr.webContents.send('stats:updated', stats)
  }
}

export function broadcastTheme(theme: 'dark' | 'light'): void {
  const hud = getHUDWindow()
  if (hud && !hud.isDestroyed() && !hud.webContents.isDestroyed()) {
    hud.webContents.send('theme:changed', theme)
  }
  const mgr = getManagerWindow()
  if (mgr && !mgr.isDestroyed() && !mgr.webContents.isDestroyed()) {
    mgr.webContents.send('theme:changed', theme)
  }
}
