import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { triggerBlobDownload } from './triggerBlobDownload'

describe('triggerBlobDownload', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('anexa <a>, faz click e só revoga/remove após atraso', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-csv')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    const click = vi.fn()
    const remove = vi.fn()
    const a = {
      href: '',
      download: '',
      rel: '',
      style: { display: '' },
      click,
      remove,
    } as unknown as HTMLAnchorElement

    const appendChild = vi.fn()
    const createElement = vi.fn(() => a)
    const doc = {
      createElement,
      body: { appendChild },
    } as unknown as Document

    const blob = new Blob(['trip_id\n'], { type: 'text/csv' })
    triggerBlobDownload(blob, 'partner_trips_export.csv', {
      revokeDelayMs: 1000,
      documentRef: doc,
    })

    expect(createObjectURL).toHaveBeenCalled()
    expect(createElement).toHaveBeenCalledWith('a')
    expect(appendChild).toHaveBeenCalledWith(a)
    expect(a.download).toBe('partner_trips_export.csv')
    expect(a.href).toBe('blob:mock-csv')
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()

    vi.advanceTimersByTime(999)
    expect(revokeObjectURL).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-csv')
    expect(remove).toHaveBeenCalledTimes(1)
  })
})
