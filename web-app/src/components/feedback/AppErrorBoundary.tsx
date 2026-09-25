import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Sentry } from '../../sentry'

type FallbackProps = {
  resetError: () => void
}

function AppCrashFallback({ resetError }: FallbackProps) {
  const { t } = useTranslation('common')
  return (
    <div
      role="alert"
      data-testid="app-error-boundary"
      className="min-h-screen flex items-center justify-center p-6"
    >
      <div className="max-w-md w-full text-sm text-destructive bg-destructive/10 border border-destructive/25 border-l-4 border-l-destructive px-4 py-4 rounded-xl">
        <p>{t('appCrashTitle')}</p>
        <div className="mt-3 flex gap-2">
          <button type="button" data-testid="app-error-retry" onClick={resetError}>
            {t('appCrashRetry')}
          </button>
          <button
            type="button"
            data-testid="app-error-reload"
            onClick={() => window.location.reload()}
          >
            {t('appCrashReload')}
          </button>
        </div>
      </div>
    </div>
  )
}

type AppErrorBoundaryProps = {
  children: ReactNode
}

/** Global render boundary. The fallback does not show the exception text. */
export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => <AppCrashFallback resetError={resetError} />}
    >
      {children}
    </Sentry.ErrorBoundary>
  )
}
