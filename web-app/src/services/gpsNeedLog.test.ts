import { afterEach, describe, expect, it, vi } from 'vitest'
import { logGpsNeed, resetGpsNeedLogForTests, type GpsNeedLogFlags } from './gpsNeedLog'

const flags: GpsNeedLogFlags = {
  needed: true,
  tokenPresent: false,
  hydrated: true,
  offline: false,
  syncing: false,
}

const delivered = ['token-absent', true, true, false, true, false, false]

afterEach(() => {
  resetGpsNeedLogForTests()
  delete window.vamulaGps
})

describe('logGpsNeed', () => {
  it('sem ponte o evento não fica marcado como entregue', () => {
    logGpsNeed('token-absent', flags)
    const sink = vi.fn()
    window.vamulaGps = bridge(sink)
    logGpsNeed('token-absent', flags)
    expect(sink).toHaveBeenCalledTimes(1)
    expect(sink.mock.calls[0]).toEqual(delivered)
    expect(sink.mock.instances[0]).toBe(window.vamulaGps)
  })

  it('depois de entregue a repetição igual não volta a chamar a ponte', () => {
    const sink = vi.fn()
    window.vamulaGps = bridge(sink)
    logGpsNeed('token-absent', flags)
    logGpsNeed('token-absent', flags)
    expect(sink).toHaveBeenCalledTimes(1)
  })

  it('uma chamada que falha pode ser tentada de novo', () => {
    const failing = vi.fn(() => {
      throw new Error('bridge')
    })
    const fault = vi.fn()
    window.vamulaGps = {
      ...bridge(failing),
      logGpsNeedBridgeFault: fault,
    }
    expect(() => logGpsNeed('host-stop', { ...flags, needed: false })).not.toThrow()
    expect(failing).toHaveBeenCalledTimes(1)
    expect(failing.mock.instances[0]).toBe(window.vamulaGps)
    expect(fault).toHaveBeenCalledTimes(1)
    expect(fault.mock.instances[0]).toBe(window.vamulaGps)
    logGpsNeed('host-stop', { ...flags, needed: false })
    expect(fault).toHaveBeenCalledTimes(1)
    const sink = vi.fn()
    window.vamulaGps = bridge(sink)
    logGpsNeed('host-stop', { ...flags, needed: false })
    expect(sink).toHaveBeenCalledTimes(1)
    expect(sink.mock.calls[0]).toEqual(['host-stop', true, false, false, true, false, false])
  })

  it('rejeita códigos desconhecidos e não os encaminha', () => {
    const sink = vi.fn()
    const fault = vi.fn()
    window.vamulaGps = {
      ...bridge(sink),
      logGpsNeedBridgeFault: fault,
    }
    logGpsNeed('eyJhbGciOiJIUzI1NiJ9.segredo', flags)
    logGpsNeed('family-c3d425bb', flags)
    logGpsNeed('+351911111111', flags)
    expect(sink).not.toHaveBeenCalled()
    expect(fault).not.toHaveBeenCalled()
  })

  it('não copia campos extra nem chama o comando do serviço', () => {
    const setServiceNeeded = vi.fn()
    const sessionChanged = vi.fn()
    const sink = vi.fn()
    window.vamulaGps = {
      ...bridge(sink),
      setServiceNeeded,
      sessionChanged,
    }
    logGpsNeed('logout', { ...flags, note: 'refresh-token' } as GpsNeedLogFlags)
    logGpsNeed('logout', { ...flags, needed: 'segredo' as unknown as boolean })
    logGpsNeed('family-changed')
    expect(sink.mock.calls[0]).toEqual(['logout', true, true, false, true, false, false])
    expect(sink.mock.calls[1]).toEqual(['family-changed', false, false, false, false, false, false])
    expect(JSON.stringify(sink.mock.calls)).not.toContain('refresh-token')
    expect(JSON.stringify(sink.mock.calls)).not.toContain('segredo')
    expect(setServiceNeeded).not.toHaveBeenCalled()
    expect(sessionChanged).not.toHaveBeenCalled()
  })

  it('volta a registar quando a transição muda', () => {
    const sink = vi.fn()
    window.vamulaGps = bridge(sink)
    logGpsNeed('token-absent', flags)
    logGpsNeed('gap-expired', { ...flags, needed: false, hydrated: false })
    expect(sink.mock.calls.map((call) => call[0])).toEqual(['token-absent', 'gap-expired'])
    expect(sink.mock.calls[1][1]).toBe(true)
  })
})

function bridge(
  sink: (
    code: string,
    reportFlags: boolean,
    needed: boolean,
    tokenPresent: boolean,
    hydrated: boolean,
    offline: boolean,
    syncing: boolean,
  ) => void,
) {
  return {
    nativeOwnsUpload: () => false,
    beginWebViewSend: () => true,
    endWebViewSend: () => undefined,
    sessionChanged: () => undefined,
    logGpsNeed: sink,
  }
}
