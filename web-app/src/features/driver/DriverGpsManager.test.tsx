import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, render, waitFor } from '@testing-library/react'
import { useEffect, useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActiveTripProvider, useActiveTrip } from '../../context/ActiveTripContext'
import { noteLegalAcceptancePhase, resetLegalAcceptancePhaseForTests } from '../auth/legalAcceptancePhase'
import { resetGpsNeedLogForTests } from '../../services/gpsNeedLog'
import { logGpsNeed } from '../../services/gpsNeedLog'
import { DriverGpsManager } from './DriverGpsManager'
import { DriverLocationProvider, useDriverLocation } from './DriverLocationProvider'
import { noteSessionFamily, resetSessionFamilyForTests } from './driverSessionFamily'

const auth = vi.hoisted(() => ({
  token: 'access-1' as string | null,
  sessionRole: 'driver' as string | null,
}))

const status = vi.hoisted(() => vi.fn<(token: string) => Promise<{ is_available: boolean }>>())
const tripDetail = vi.hoisted(() => vi.fn<(tripId: string, token: string) => Promise<{ status: string }>>())

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => auth,
}))

vi.mock('../../api/trips', () => ({
  getDriverStatus: (token: string) => status(token),
  getDriverTripDetail: (tripId: string, token: string) => tripDetail(tripId, token),
}))

const serviceCalls: boolean[] = []
const needLogs: string[] = []

function installBridge() {
  window.vamulaGps = {
    nativeOwnsUpload: () => false,
    beginWebViewSend: () => true,
    endWebViewSend: () => undefined,
    sessionChanged: () => undefined,
    setServiceNeeded: (needed: boolean) => {
      serviceCalls.push(needed)
    },
    serviceOperational: () => false,
    serviceCollecting: () => false,
    serviceSending: () => false,
    serviceStopReason: () => '',
    logGpsNeed: (code: string) => {
      needLogs.push(code)
    },
  }
}

function trip(statusName: string) {
  return {
    trip_id: 'trip-1',
    status: statusName,
    passenger_id: 'passenger',
    origin_lat: 0,
    origin_lng: 0,
    destination_lat: 1,
    destination_lng: 1,
    estimated_price: 1,
  }
}

function SetTrip({ id }: { id: string | null }) {
  const { setDriverActiveTripId } = useActiveTrip()
  useEffect(() => {
    setDriverActiveTripId(id)
  }, [id, setDriverActiveTripId])
  return null
}

function Shell() {
  const location = useDriverLocation()
  const needed = useRef(false)
  useEffect(() => {
    needed.current = location.locationNeeded
  }, [location.locationNeeded])
  useEffect(() => {
    return () => {
      logGpsNeed('ui-detached', {
        needed: needed.current,
        tokenPresent: true,
        hydrated: true,
        offline: false,
        syncing: false,
      })
    }
  }, [])
  return <p>shell</p>
}

function AllowDocuments() {
  const location = useDriverLocation()
  useEffect(() => {
    location.publishDocumentEligibility('clear')
  }, [location])
  return null
}

function Harness({ shell, tripId = null as string | null }: { shell: boolean; tripId?: string | null }) {
  return (
    <ActiveTripProvider>
      <SetTrip id={tripId} />
      <DriverLocationProvider>
        <AllowDocuments />
        <DriverGpsManager />
        {shell ? <Shell /> : null}
      </DriverLocationProvider>
    </ActiveTripProvider>
  )
}

describe('DriverGpsManager', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    resetSessionFamilyForTests()
    resetLegalAcceptancePhaseForTests()
    resetGpsNeedLogForTests()
    serviceCalls.length = 0
    needLogs.length = 0
    status.mockReset()
    tripDetail.mockReset()
    auth.token = 'access-1'
    auth.sessionRole = 'driver'
    installBridge()
    noteSessionFamily('family-a')
  })

  afterEach(() => {
    vi.useRealTimers()
    resetSessionFamilyForTests()
    resetLegalAcceptancePhaseForTests()
    delete window.vamulaGps
  })

  function openLegal() {
    noteLegalAcceptancePhase('open', 'family-a')
  }

  it('não arranca enquanto a sessão não está hidratada nem a fase legal aberta', async () => {
    status.mockImplementation(() => new Promise(() => { }))
    render(<Harness shell={false} />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(serviceCalls).toEqual([false])
  })

  it('Online confirmado arranca uma vez e o remount do ecrã não envia false', async () => {
    status.mockResolvedValue({ is_available: true })
    openLegal()
    const view = render(<Harness shell />)
    await waitFor(() => expect(serviceCalls.at(-1)).toBe(true))
    expect(serviceCalls.filter(Boolean)).toEqual([true])

    view.rerender(<Harness shell={false} />)
    expect(needLogs).toContain('ui-detached')
    expect(serviceCalls.at(-1)).toBe(true)
    expect(serviceCalls.filter((call) => call === false).length).toBe(1)

    view.rerender(<Harness shell />)
    expect(serviceCalls.at(-1)).toBe(true)
    expect(serviceCalls.filter(Boolean)).toEqual([true])
  })

  it('viagem confirmada com Offline mantém e a viagem terminada pára', async () => {
    status.mockResolvedValue({ is_available: false })
    tripDetail.mockResolvedValue(trip('accepted'))
    openLegal()
    render(<Harness shell={false} tripId="trip-1" />)
    await waitFor(() => expect(serviceCalls.at(-1)).toBe(true))

    tripDetail.mockResolvedValue(trip('cancelled'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })
    await waitFor(() => expect(serviceCalls.at(-1)).toBe(false))
  })

  it('refresh da mesma família e a lacuna curta não param; a expiração pára', async () => {
    status.mockResolvedValue({ is_available: true })
    openLegal()
    const view = render(<Harness shell={false} />)
    await waitFor(() => expect(serviceCalls.at(-1)).toBe(true))
    const afterStart = serviceCalls.slice()

    auth.token = 'access-2'
    view.rerender(<Harness shell={false} />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(serviceCalls).toEqual(afterStart)

    auth.token = null
    view.rerender(<Harness shell={false} />)
    await waitFor(() => expect(serviceCalls.at(-1)).toBe(true))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    view.rerender(<Harness shell={false} />)
    expect(serviceCalls.at(-1)).toBe(true)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    await waitFor(() => expect(serviceCalls.at(-1)).toBe(false))
  })

  it('logout e troca de família param de imediato', async () => {
    status.mockResolvedValue({ is_available: true })
    openLegal()
    const view = render(<Harness shell={false} />)
    await waitFor(() => expect(serviceCalls.at(-1)).toBe(true))

    act(() => {
      noteSessionFamily('family-b')
    })
    view.rerender(<Harness shell={false} />)
    expect(serviceCalls.at(-1)).toBe(false)

    auth.token = 'access-1'
    noteSessionFamily('family-a')
    openLegal()
    view.rerender(<Harness shell={false} />)
    await waitFor(() => expect(serviceCalls.at(-1)).toBe(true))

    auth.sessionRole = 'passenger'
    view.rerender(<Harness shell={false} />)
    await waitFor(() => expect(serviceCalls.at(-1)).toBe(false))

    auth.sessionRole = 'driver'
    view.rerender(<Harness shell={false} />)
    await waitFor(() => expect(serviceCalls.at(-1)).toBe(true))
    auth.token = null
    act(() => {
      noteSessionFamily(null)
    })
    view.rerender(<Harness shell={false} />)
    expect(serviceCalls.at(-1)).toBe(false)
  })

  it('checking na mesma família mantém e blocked pára', async () => {
    status.mockResolvedValue({ is_available: true })
    openLegal()
    const view = render(<Harness shell={false} />)
    await waitFor(() => expect(serviceCalls.at(-1)).toBe(true))
    const whileOpen = serviceCalls.slice()

    act(() => {
      noteLegalAcceptancePhase('checking', 'family-a')
    })
    view.rerender(<Harness shell={false} />)
    expect(serviceCalls).toEqual(whileOpen)

    act(() => {
      noteLegalAcceptancePhase('blocked', 'family-a')
    })
    view.rerender(<Harness shell={false} />)
    expect(serviceCalls.at(-1)).toBe(false)
    expect(needLogs).toContain('legal-blocked')
  })

  it('o dashboard não é um segundo caller', () => {
    const dashboard = readFileSync(
      resolve(process.cwd(), 'src/features/driver/DriverDashboard.tsx'),
      'utf8',
    )
    expect(dashboard).not.toContain('useNativeLocationServiceLifecycle')
    expect(dashboard).not.toContain('syncNativeLocationServiceNeed')
    expect(dashboard).not.toContain('setServiceNeeded')
    const manager = readFileSync(
      resolve(process.cwd(), 'src/features/driver/DriverGpsManager.tsx'),
      'utf8',
    )
    expect(manager).toContain('useNativeLocationServiceLifecycle')
  })
})
