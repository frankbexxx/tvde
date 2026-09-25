import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as Sentry from '@sentry/react'

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  withScope: (fn: (scope: { setTag: () => void; setFingerprint: () => void; setContext: () => void }) => void) => {
    fn({
      setTag: vi.fn(),
      setFingerprint: vi.fn(),
      setContext: vi.fn(),
    })
  },
  captureException: vi.fn(),
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}))

import { reportApiServerError, scrubSentryEvent, shouldReportApiStatus } from './sentry'

describe('api server error reporting', () => {
  beforeEach(() => {
    vi.mocked(Sentry.captureException).mockClear()
  })

  it('reports HTTP 500 with request id and without response body', () => {
    reportApiServerError(500, 'req-abc', '/trips/1?phone=hidden')
    expect(Sentry.captureException).toHaveBeenCalledTimes(1)
    const error = vi.mocked(Sentry.captureException).mock.calls[0][0] as Error
    expect(error.name).toBe('ApiServerError')
    expect(error.message).toBe('API server error')
    expect(JSON.stringify(vi.mocked(Sentry.captureException).mock.calls)).not.toContain('phone')
  })

  it('does not report HTTP 400', () => {
    reportApiServerError(400, 'req-abc', '/auth/login')
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  it('does not report auth failure or timeout status', () => {
    expect(shouldReportApiStatus(401)).toBe(false)
    expect(shouldReportApiStatus(422)).toBe(false)
    expect(shouldReportApiStatus(0)).toBe(false)
    reportApiServerError(401, 'req-abc', '/auth/login')
    reportApiServerError(0, undefined, '/config')
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  it('strips authorization headers', () => {
    const event = scrubSentryEvent({
      request: {
        headers: { Authorization: 'Bearer jwt', Accept: 'application/json' },
        data: { email: 'a@b.c' },
        cookies: { sid: 'x' },
      },
    })
    expect(event.request?.headers?.Authorization).toBeUndefined()
    expect(event.request?.headers?.Accept).toBe('application/json')
    expect(event.request?.data).toBeUndefined()
    expect(event.request?.cookies).toBeUndefined()
  })
})
