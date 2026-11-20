/**
 * System Tray Integration for Clipboard Masker.
 * Shows status icon, quick toggle, pause controls, and app actions.
 */
import { Tray, Menu, nativeImage, app, NativeImage } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { toggleHUD, createManagerWindow } from './windows'
import { glinerEngine } from '../engine/gliner-engine'
import { store } from '../storage/store'

let tray: Tray | null = null

function createSimpleTrayIcon(): NativeImage {
  const width = 16
  const height = 16
  const buffer = Buffer.alloc(width * height * 4)

  // Draw a crisp 16x16 shield icon in BGRA format
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const dx = Math.abs(x - 7.5)
      const isTop = y >= 2 && y <= 6 && dx <= 5.5
      const isBottom = y > 6 && y <= 13 && dx <= (14 - y) * 0.75

      if (isTop || isBottom) {
        // Apple Blue #0A84FF in BGRA order
        buffer[idx + 0] = 255 // Blue
        buffer[idx + 1] = 132 // Green
        buffer[idx + 2] = 10  // Red
        buffer[idx + 3] = 255 // Alpha
      } else {
        buffer[idx + 0] = 0
        buffer[idx + 1] = 0
        buffer[idx + 2] = 0
        buffer[idx + 3] = 0
      }
    }
  }

  return nativeImage.createFromBitmap(buffer, { width, height })
}

function getTrayIcon(): NativeImage {
  const appPath = app.getAppPath()
  const candidates = [
    path.join(appPath, 'build/tray-icon.ico'),
    path.join(appPath, 'build/tray-icon.png'),
    path.join(process.cwd(), 'packages/desktop/build/tray-icon.ico'),
    path.join(process.cwd(), 'packages/desktop/build/tray-icon.png')
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        const img = nativeImage.createFromPath(c)
        if (!img.isEmpty()) return img
      } catch {}
    }
  }
  return createSimpleTrayIcon()
}

export function createSystemTray(): Tray {
  if (tray) return tray

  try {
    const icon = getTrayIcon()
    tray = new Tray(icon)
    tray.setToolTip('Clipboard Masker — Active Privacy Protection')

    updateTrayContextMenu()

    tray.on('click', () => {
      toggleHUD()
    })

    tray.on('double-click', () => {
      createManagerWindow()
    })
  } catch (err) {
    console.error('Failed to initialize system tray:', err)
  }

  return tray!
}

export function updateTrayContextMenu(): void {
  if (!tray) return

  const isPaused = glinerEngine.isPaused()
  const status = glinerEngine.getStatus()

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Clipboard Masker',
      enabled: false
    },
    {
      label: `Engine: ${status.activeEngine === 'gliner' ? 'GLiNER2-PII (Local AI)' : 'Regex Deterministic'}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Toggle Clipboard History (Alt+V)',
      click: () => toggleHUD()
    },
    {
      label: 'Paste Masked Clipboard (Ctrl+Shift+V)',
      click: async () => {
        const { pasteSanitizedClipboard } = await import('./shortcuts')
        pasteSanitizedClipboard()
      }
    },
    {
      label: 'Open Dashboard & Settings',
      click: () => createManagerWindow()
    },
    { type: 'separator' },
    {
      label: isPaused ? 'Resume Protection' : 'Protection Active (Click to Pause)',
      type: 'submenu',
      submenu: [
        {
          label: 'Resume Now',
          enabled: isPaused,
          click: () => {
            glinerEngine.setPaused(false)
            updateTrayContextMenu()
          }
        },
        { type: 'separator' },
        {
          label: 'Pause for 5 minutes',
          click: () => {
            glinerEngine.setPaused(true, 5)
            updateTrayContextMenu()
          }
        },
        {
          label: 'Pause for 1 hour',
          click: () => {
            glinerEngine.setPaused(true, 60)
            updateTrayContextMenu()
          }
        },
        {
          label: 'Pause indefinitely',
          click: () => {
            glinerEngine.setPaused(true, null)
            updateTrayContextMenu()
          }
        }
      ]
    },
    {
      label: 'Clear History',
      click: () => {
        store.clearHistory()
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}
