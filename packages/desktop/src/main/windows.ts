/**
 * Window Management for Clipboard Masker.
 * Coordinates the Floating Win+V HUD and the Full Manager Window.
 */
import { BrowserWindow, screen, app, nativeTheme } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

let hudWindow: BrowserWindow | null = null
let managerWindow: BrowserWindow | null = null

function getPreloadPath(): string {
  const appPath = app.getAppPath()
  const candidates = [
    path.join(appPath, 'dist-electron/preload/index.js'),
    path.join(appPath, 'dist-electron/preload/index.mjs')
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return candidates[0]
}

function getHtmlPath(): string {
  const appPath = app.getAppPath()
  return path.join(appPath, 'dist/index.html')
}

export function getIconPath(): string {
  const appPath = app.getAppPath()
  const candidates = [
    path.join(appPath, 'build/icon.ico'),
    path.join(appPath, 'build/icon.png'),
    path.join(process.cwd(), 'packages/desktop/build/icon.ico'),
    path.join(process.cwd(), 'packages/desktop/build/icon.png')
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c
    }
  }
  return ''
}

export function createHUDWindow(): BrowserWindow {
  if (hudWindow && !hudWindow.isDestroyed()) {
    return hudWindow
  }

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  const hudWidth = 420
  const hudHeight = 580
  // Position in bottom-right corner near system tray / taskbar
  const x = screenWidth - hudWidth - 24
  const y = screenHeight - hudHeight - 24

  hudWindow = new BrowserWindow({
    width: hudWidth,
    height: hudHeight,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    hasShadow: true,
    icon: getIconPath() || undefined,
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  // Close HUD on blur for seamless Win+V ergonomics
  hudWindow.on('blur', () => {
    if (hudWindow && !hudWindow.isDestroyed() && hudWindow.isVisible()) {
      hudWindow.hide()
    }
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    hudWindow.loadURL(`${devServerUrl}#/hud`)
  } else {
    hudWindow.loadFile(getHtmlPath(), {
      hash: '/hud'
    })
  }

  return hudWindow
}

export function toggleHUD(): void {
  if (!hudWindow || hudWindow.isDestroyed()) {
    createHUDWindow()
  }

  if (hudWindow?.isVisible()) {
    hudWindow.hide()
  } else if (hudWindow) {
    // Reposition to current mouse display's bottom-right
    const cursor = screen.getCursorScreenPoint()
    const currentDisplay = screen.getDisplayNearestPoint(cursor)
    const { x: dX, y: dY, width: dW, height: dH } = currentDisplay.workArea

    const hudWidth = 420
    const hudHeight = 580
    hudWindow.setPosition(dX + dW - hudWidth - 24, dY + dH - hudHeight - 24)
    hudWindow.show()
    hudWindow.focus()
  }
}

export function createManagerWindow(): BrowserWindow {
  if (managerWindow && !managerWindow.isDestroyed()) {
    managerWindow.show()
    managerWindow.focus()
    return managerWindow
  }

  managerWindow = new BrowserWindow({
    width: 980,
    height: 700,
    minWidth: 800,
    minHeight: 560,
    frame: false, // Custom Apple HIG window frame
    titleBarStyle: 'hidden',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0F0F11' : '#F5F5F7',
    show: false,
    icon: getIconPath() || undefined,
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  managerWindow.once('ready-to-show', () => {
    managerWindow?.show()
    managerWindow?.focus()
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    managerWindow.loadURL(`${devServerUrl}#/manager`)
  } else {
    managerWindow.loadFile(getHtmlPath(), {
      hash: '/manager'
    })
  }

  managerWindow.on('closed', () => {
    managerWindow = null
  })

  return managerWindow
}

export function getHUDWindow(): BrowserWindow | null {
  return hudWindow
}

export function getManagerWindow(): BrowserWindow | null {
  return managerWindow
}
