/**
 * Regista app_start, dormancy_enter e dormancy_exit para análise de timings.
 * Dispara app:visibility-visible quando o tab volta a ficar visível (para auto-refresh).
 */
import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { logLifecycle } from '../api/logs'
import { VISIBILITY_VISIBLE_EVENT } from '../constants/events'

export function AppLifecycleLogger() {
  const { token } = useAuth()
  const hasLoggedStart = useRef(false)

  useEffect(() => {
    if (!hasLoggedStart.current) {
      hasLoggedStart.current = true
      logLifecycle('app_start', token)
    }
  }, [token])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logLifecycle('dormancy_enter', token)
      } else {
        logLifecycle('dormancy_exit', token)
        window.dispatchEvent(new CustomEvent(VISIBILITY_VISIBLE_EVENT))
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [token])

  return null
}
