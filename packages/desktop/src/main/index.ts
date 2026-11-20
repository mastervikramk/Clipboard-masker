/**
 * Main Process Entry Point for Clipboard Masker.
 * Orchestrates application lifecycle, tray, monitoring, and windows.
 */
import { app } from 'electron'
import { createHUDWindow, createManagerWindow } from './windows'
import { createSystemTray, updateTrayContextMenu } from './tray'
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './shortcuts'
import { setupIPCHandlers, broadcastClipboardItem, broadcastStatus, broadcastStats } from './ipc'
import { clipboardMonitor } from '../clipboard/monitor'
import { glinerEngine } from '../engine/gliner-engine'
import { retentionManager } from '../storage/retention'
import { store } from '../storage/store'

// Enforce single application instance
app.setName('Clipboard Masker')
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Focus or open manager window on second instance attempt
    createManagerWindow()
  })

  app.whenReady().then(async () => {
    // Set Windows AppUserModelId for native notification branding
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.clipboardmasker.app')
    }

    // Setup IPC handlers
    setupIPCHandlers()

    // Create system tray icon
    createSystemTray()

    // Register Alt+V global shortcut
    registerGlobalShortcuts()

    // Initialize the hidden Win+V HUD window for fast activation
    createHUDWindow()

    // Show the Manager Window on launch so user can see it immediately
    createManagerWindow()

    // Start background data retention manager
    retentionManager.start()

    // Start clipboard monitoring service
    clipboardMonitor.start()

    // Listen to new clipboard items and broadcast to UI
    clipboardMonitor.addListener((item) => {
      broadcastClipboardItem(item)
      broadcastStats(store.getStats())
    })

    // Initial health check against local GLiNER2 engine
    await glinerEngine.checkHealth()
    broadcastStatus()
    updateTrayContextMenu()

    // Background timer to monitor local GLiNER2 engine connectivity every 10 seconds
    setInterval(async () => {
      const prevStatus = glinerEngine.getStatus().dockerStatus
      await glinerEngine.checkHealth()
      const newStatus = glinerEngine.getStatus().dockerStatus

      if (prevStatus !== newStatus) {
        broadcastStatus()
        updateTrayContextMenu()
      }
    }, 10000)
  })

  // Clean up global shortcuts before quitting
  app.on('will-quit', () => {
    unregisterGlobalShortcuts()
    clipboardMonitor.stop()
    retentionManager.stop()
  })

  // Prevent app from quitting when all windows are closed (keeps running in background/tray)
  app.on('window-all-closed', () => {
    // Keep alive in tray
  })
}
