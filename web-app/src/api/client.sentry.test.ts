import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../sentry', () => ({
  reportApiServerError: vi.fn(),
}))

import { apiFetch } from './client'
import { reportApiServerError } from '../sentry'

function jsonResponse(status: number, requestId: string | null, detail: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'status',
    headers: {
      get: (name: string) => (name === 'X-Request-ID' ? requestId : null),
    },
    json: async () => ({ detail }),
  }
}

describe('apiFetch sentry', () => {
  beforeEach(() => {
    vi.mocked(reportApiServerError).mockClear()
  })

  it('reports HTTP 500 with the request id and still throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(500, 'rid-500', 'internal and phone +351')),
    )
    await expect(apiFetch('/trips?x=1')).rejects.toMatchObject({
      status: 500,
      request_id: 'rid-500',
    })
    expect(reportApiServerError).toHaveBeenCalledTimes(1)
    expect(reportApiServerError).toHaveBeenCalledWith(500, 'rid-500', '/trips?x=1')
  })

  it('does not report HTTP 400', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(400, 'rid-400', 'invalid')),
    )
    await expect(apiFetch('/trips')).rejects.toMatchObject({ status: 400 })
    expect(reportApiServerError).not.toHaveBeenCalled()
  })

  it('does not report an aborted request', async () => {
    const abort = new Error('aborted')
    abort.name = 'AbortError'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort))
    await expect(apiFetch('/config')).rejects.toMatchObject({ status: 0, detail: 'timeout' })
    expect(reportApiServerError).not.toHaveBeenCalled()
  })
})
