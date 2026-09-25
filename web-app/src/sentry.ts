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
      return scrubSentryEvent(event)
    },
  })
}

export { Sentry }
export const sentryEnabled = enabled

const REQUEST_ID_RE = /^[A-Za-z0-9._:-]{1,80}$/

/** HTTP 5xx only. 4xx, timeouts and network failures stay out. */
export function shouldReportApiStatus(status: number): boolean {
  return status >= 500 && status <= 599
}

/**
 * Report a caught API 5xx. Sends status, path without query, and request id.
 * Does not send the response body or detail.
 */
export function reportApiServerError(
  status: number,
  requestId: string | undefined,
  path: string,
): void {
  if (!shouldReportApiStatus(status)) return
  const rid = requestId && REQUEST_ID_RE.test(requestId) ? requestId : undefined
  const pathname = path.split('?')[0] || path
  Sentry.withScope((scope) => {
    scope.setTag('http_status', String(status))
    scope.setFingerprint(['api-server-error', String(status), pathname])
    if (rid) scope.setTag('request_id', rid)
    scope.setContext('api_error', {
      status,
      path: pathname,
      request_id: rid ?? null,
    })
    const error = new Error('API server error')
    error.name = 'ApiServerError'
    Sentry.captureException(error)
  })
}

export function scrubSentryEvent<T extends { request?: { headers?: Record<string, string>; data?: unknown; cookies?: unknown } }>(
  event: T,
): T {
  const request = event.request
  if (!request) return event
  if (request.headers) {
    const headers = { ...request.headers }
    for (const key of Object.keys(headers)) {
      const lower = key.toLowerCase()
      if (
        lower === 'authorization' ||
        lower === 'cookie' ||
        lower === 'set-cookie' ||
        lower === 'x-cron-secret'
      ) {
        delete headers[key]
      }
    }
    request.headers = headers
  }
  delete request.data
  delete request.cookies
  return event
}
