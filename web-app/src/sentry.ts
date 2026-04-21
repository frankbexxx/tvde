/**
 * Sentry error tracking — inicialização condicional.
 *
 * Só inicializa se:
 * - VITE_SENTRY_DSN estiver definida (em produção/preview)
 * - E não estivermos em desenvolvimento local (MODE !== 'development')
 *
 * Isto evita poluir o Sentry com erros do `npm run dev` local.
 *
 * Integração feita com @sentry/react. Traces e Replays estão DESLIGADOS por
 * defeito para não consumir quota da BETA; ligar pontualmente no futuro se útil.
 */
import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN
const mode = import.meta.env.MODE
const enabled = typeof dsn === 'string' && dsn.length > 0 && mode !== 'development'

if (enabled) {
  Sentry.init({
    dsn,
    environment: mode,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,

    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    sendDefaultPii: false,

    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      'AbortError',
      'Request aborted',
      'NetworkError when attempting to fetch resource',
      'Failed to fetch',
      'Load failed',
    ],

    beforeSend(event, hint) {
      const err = hint.originalException as { name?: string; message?: string } | undefined
      if (err?.name === 'AbortError') return null
      if (typeof err?.message === 'string' && /aborted|cancelled/i.test(err.message)) return null
      return event
    },
  })
}

export { Sentry }
export const sentryEnabled = enabled
