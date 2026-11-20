import React, { useState, useEffect } from 'react'
import { HUDView } from './hud/HUDView'
import { ManagerView } from './manager/ManagerView'
import type { AppSettings } from '../../shared/types'

export const App: React.FC = () => {
  const [route, setRoute] = useState<'hud' | 'manager'>('hud')
  const api = (window as any).clipboardMasker

  useEffect(() => {
    const updateRoute = () => {
      const hash = window.location.hash
      if (hash.includes('manager')) {
        setRoute('manager')
      } else {
        setRoute('hud')
      }
    }

    updateRoute()
    window.addEventListener('hashchange', updateRoute)
    return () => window.removeEventListener('hashchange', updateRoute)
  }, [])

  useEffect(() => {
    if (!api) return

    const applyTheme = (theme: 'dark' | 'light') => {
      document.documentElement.classList.remove('dark', 'light')
      document.documentElement.classList.add(theme)
      document.documentElement.setAttribute('data-theme', theme)
      document.documentElement.style.colorScheme = theme
    }

    const checkAndApply = async () => {
      try {
        const settings: AppSettings = await api.getSettings()
        if (settings?.theme === 'light') {
          applyTheme('light')
        } else if (settings?.theme === 'dark') {
          applyTheme('dark')
        } else {
          // 'system'
          const sysTheme = await api.getSystemTheme()
          applyTheme(sysTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
        }
      } catch {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        applyTheme(isDark ? 'dark' : 'light')
      }
    }

    checkAndApply()

    // Listen to native Windows theme changes
    const unsubTheme = api.onThemeChanged?.((newSysTheme: 'dark' | 'light') => {
      api.getSettings().then((s: AppSettings) => {
        if (!s || s.theme === 'system') {
          applyTheme(newSysTheme)
        }
      })
    })

    // Web media query listener fallback
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handleMql = (e: MediaQueryListEvent) => {
      api.getSettings().then((s: AppSettings) => {
        if (!s || s.theme === 'system') {
          applyTheme(e.matches ? 'dark' : 'light')
        }
      })
    }
    mql.addEventListener('change', handleMql)

    return () => {
      unsubTheme?.()
      mql.removeEventListener('change', handleMql)
    }
  }, [api])

  return route === 'hud' ? <HUDView /> : <ManagerView />
}
