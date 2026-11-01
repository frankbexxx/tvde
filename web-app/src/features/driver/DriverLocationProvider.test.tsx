import { act, render, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActiveTripProvider, useActiveTrip } from '../../context/ActiveTripContext'
import { useNativeLocationServiceLifecycle } from '../../hooks/useNativeLocationServiceLifecycle'
import { resetGpsNeedLogForTests } from '../../services/gpsNeedLog'
import { noteSessionFamily, resetSessionFamilyForTests } from './driverSessionFamily'
import { DriverLocationProvider, useDriverLocation } from './DriverLocationProvider'

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
    logGpsNeed: () => undefined,
  }
}

function deferred<T>() {
  let resolve: (value: T) => void = () => { }
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function Watch() {
  const location = useDriverLocation()
  return <p data-testid="watch">{`${location.hydrated ? 'yes' : 'no'}|${location.offline ? 'off' : 'on'}`}</p>
}

function Screen() {
  const location = useDriverLocation()
  useNativeLocationServiceLifecycle({
    token: auth.token,
    offline: location.offline,
    hydrated: location.hydrated,
    syncing: location.syncing,
  })
  return (
    <button type="button" onClick={() => location.setOffline(!location.offline)}>
      toggle
    </button>
  )
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

function Decision() {
  const location = useDriverLocation()
  return (
    <p data-testid="decision">
      {`${location.locationNeeded ? 'need' : 'idle'}|${location.confirmedActiveTrip ? 'confirmed' : 'open'}|${location.tripRecoveryUnresolved ? 'recover' : 'steady'}|${location.tripStatus ?? 'none'}`}
    </p>
  )
}

function PublishDocs({ value }: { value: 'checking' | 'clear' | 'blocked' }) {
  const location = useDriverLocation()
  useEffect(() => {
    location.publishDocumentEligibility(value)
  }, [location, value])
  return null
}

function GoOffline() {
  const location = useDriverLocation()
  return (
    <button type="button" onClick={() => location.setOffline(true)}>
      go-offline
    </button>
  )
}

function DocHarness({
  eligibility,
  tripId = null,
}: {
  eligibility: 'checking' | 'clear' | 'blocked'
  tripId?: string | null
}) {
  return (
    <ActiveTripProvider>
      <SetTrip id={tripId} />
      <DriverLocationProvider>
        <PublishDocs value={eligibility} />
        <Watch />
        <Decision />
        <GoOffline />
      </DriverLocationProvider>
    </ActiveTripProvider>
  )
}

function Harness({ screen }: { screen: boolean }) {
  return (
    <ActiveTripProvider>
      <DriverLocationProvider>
        <Watch />
        {screen ? <Screen /> : null}
      </DriverLocationProvider>
    </ActiveTripProvider>
  )
}

function TripHarness({ tripId, screen = false }: { tripId: string | null; screen?: boolean }) {
  return (
    <ActiveTripProvider>
      <SetTrip id={tripId} />
      <DriverLocationProvider>
        <PublishDocs value="clear" />
        <Watch />
        <Decision />
        <Reader />
        <Note status="assigned" label="note-assigned" />
        <Note status="accepted" label="note-accepted" />
        <Note status="cancelled" label="note-cancelled" />
        {screen ? <Screen /> : null}
      </DriverLocationProvider>
    </ActiveTripProvider>
  )
}

function Reader() {
  useDriverLocation()
  return null
}

function Note({ status, label }: { status: string; label: string }) {
  const { noteTripStatus } = useDriverLocation()
  return (
    <button type="button" onClick={() => noteTripStatus(status)}>
      {label}
    </button>
  )
}

describe('DriverLocationProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    resetSessionFamilyForTests()
    resetGpsNeedLogForTests()
    serviceCalls.length = 0
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
    delete window.vamulaGps
  })

  it('começa sem hidratação e só a confirma na primeira resposta desta família', async () => {
    const first = deferred<{ is_available: boolean }>()
    status.mockImplementation(() => first.promise)
    const view = render(<Harness screen />)
    expect(view.getByTestId('watch').textContent).toBe('no|off')
    expect(serviceCalls).toEqual([false])

    await waitFor(() => expect(status).toHaveBeenCalledWith('access-1'))
    await act(async () => {
      first.resolve({ is_available: true })
    })
    await waitFor(() => expect(view.getByTestId('watch').textContent).toBe('yes|on'))
    expect(serviceCalls).toEqual([false, true])
  })

  it('refresh do access token na mesma família não perde a hidratação', async () => {
    status.mockResolvedValue({ is_available: true })
    const view = render(<Harness screen />)
    await waitFor(() => expect(view.getByTestId('watch').textContent).toBe('yes|on'))
    const callsBefore = serviceCalls.length

    auth.token = 'access-2'
    view.rerender(<Harness screen />)
    await act(async () => {
      await Promise.resolve()
    })

    expect(view.getByTestId('watch').textContent).toBe('yes|on')
    expect(serviceCalls.slice(callsBefore)).not.toContain(false)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000)
    })
    await waitFor(() => expect(status.mock.calls.at(-1)?.[0]).toBe('access-2'))
  })

  it('desmontar e remontar o ecrã conserva o estado e o cleanup ainda pára o serviço', async () => {
    status.mockResolvedValue({ is_available: true })
    const view = render(<Harness screen />)
    await waitFor(() => expect(serviceCalls.at(-1)).toBe(true))

    view.rerender(<Harness screen={false} />)
    expect(serviceCalls.at(-1)).toBe(false)
    expect(view.getByTestId('watch').textContent).toBe('yes|on')

    view.rerender(<Harness screen />)
    await waitFor(() => expect(serviceCalls.at(-1)).toBe(true))
    expect(view.getByTestId('watch').textContent).toBe('yes|on')
  })

  it('troca de família limpa a disponibilidade anterior', async () => {
    status.mockResolvedValue({ is_available: true })
    const view = render(<Harness screen />)
    await waitFor(() => expect(view.getByTestId('watch').textContent).toBe('yes|on'))

    const next = deferred<{ is_available: boolean }>()
    status.mockImplementation(() => next.promise)
    act(() => {
      noteSessionFamily('family-b')
    })
    view.rerender(<Harness screen />)
    expect(view.getByTestId('watch').textContent).toBe('no|off')
    expect(serviceCalls.at(-1)).toBe(false)
  })

  it('descarta a resposta GET da família anterior', async () => {
    const previous = deferred<{ is_available: boolean }>()
    status.mockImplementation((token: string) => {
      if (token === 'access-1') return previous.promise
      return new Promise<{ is_available: boolean }>(() => { })
    })
    const view = render(<Harness screen />)
    await waitFor(() => expect(status).toHaveBeenCalledWith('access-1'))

    auth.token = 'access-b'
    act(() => {
      noteSessionFamily('family-b')
    })
    view.rerender(<Harness screen />)
    await act(async () => {
      previous.resolve({ is_available: true })
    })

    expect(view.getByTestId('watch').textContent).toBe('no|off')
    expect(serviceCalls).not.toContain(true)
  })

  it('Online e Offline locais continuam a ligar e a parar o serviço', async () => {
    status.mockResolvedValue({ is_available: false })
    const view = render(<Harness screen />)
    await waitFor(() => expect(view.getByTestId('watch').textContent).toBe('yes|off'))
    expect(serviceCalls).toEqual([false])

    await act(async () => {
      view.getByRole('button', { name: 'toggle' }).click()
    })
    expect(view.getByTestId('watch').textContent).toBe('yes|on')
    expect(serviceCalls.at(-1)).toBe(true)

    await act(async () => {
      view.getByRole('button', { name: 'toggle' }).click()
    })
    expect(view.getByTestId('watch').textContent).toBe('yes|off')
    expect(serviceCalls.at(-1)).toBe(false)
  })

  it('viagem confirmada com Offline local mantém a decisão e não chama a ponte', async () => {
    status.mockResolvedValue({ is_available: false })
    tripDetail.mockResolvedValue(trip('accepted'))
    const view = render(<TripHarness tripId="trip-1" screen />)
    await waitFor(() => expect(view.getByTestId('decision').textContent).toBe('need|confirmed|steady|accepted'))
    expect(view.getByTestId('watch').textContent).toBe('yes|off')
    expect(serviceCalls).toEqual([false])
  })

  it('viagem terminada com Offline local não autoriza GPS', async () => {
    tripDetail.mockResolvedValue(trip('completed'))
    const view = render(<TripHarness tripId="trip-1" />)
    await waitFor(() => expect(view.getByTestId('decision').textContent).toBe('idle|open|steady|completed'))
  })

  it('um id sem estado confirmado não autoriza GPS', async () => {
    tripDetail.mockImplementation(() => new Promise(() => { }))
    const view = render(<TripHarness tripId="trip-1" />)
    await waitFor(() => expect(tripDetail).toHaveBeenCalled())
    expect(view.getByTestId('decision').textContent).toBe('idle|open|steady|none')
    expect(serviceCalls).toEqual([])
  })

  it('falha de rede depois de uma viagem confirmada mantém a decisão', async () => {
    tripDetail.mockResolvedValue(trip('arriving'))
    const view = render(<TripHarness tripId="trip-1" />)
    await waitFor(() => expect(view.getByTestId('decision').textContent).toBe('need|confirmed|steady|arriving'))

    tripDetail.mockRejectedValue(Object.assign(new Error('network'), { status: 0 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    await waitFor(() => expect(view.getByTestId('decision').textContent).toBe('need|confirmed|recover|arriving'))
  })

  it('desmontar o ecrã não apaga a viagem confirmada', async () => {
    tripDetail.mockResolvedValue(trip('ongoing'))
    const view = render(<TripHarness tripId="trip-1" screen />)
    await waitFor(() => expect(view.getByTestId('decision').textContent).toBe('need|confirmed|steady|ongoing'))
    view.rerender(<TripHarness tripId="trip-1" />)
    expect(view.getByTestId('decision').textContent).toBe('need|confirmed|steady|ongoing')
  })

  it('troca de família não reutiliza a viagem anterior', async () => {
    tripDetail.mockResolvedValue(trip('accepted'))
    const view = render(<TripHarness tripId="trip-1" />)
    await waitFor(() => expect(view.getByTestId('decision').textContent).toBe('need|confirmed|steady|accepted'))

    act(() => {
      noteSessionFamily('family-b')
    })
    view.rerender(<TripHarness tripId="trip-1" />)
    expect(view.getByTestId('decision').textContent).toBe('idle|open|steady|none')
  })

  it('dois leitores não abrem um segundo poll', async () => {
    tripDetail.mockResolvedValue(trip('accepted'))
    render(<TripHarness tripId="trip-1" />)
    await waitFor(() => expect(tripDetail).toHaveBeenCalledTimes(1))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(tripDetail).toHaveBeenCalledTimes(2)
  })

  it('Online confirmado mantém a decisão numa lacuna curta e perde-a aos 15 s', async () => {
    status.mockResolvedValue({ is_available: true })
    const view = render(<TripHarness tripId={null} />)
    await waitFor(() => expect(view.getByTestId('decision').textContent).toMatch(/^need\|/))

    auth.token = null
    view.rerender(<TripHarness tripId={null} />)
    await waitFor(() => expect(view.getByTestId('decision').textContent).toMatch(/^need\|/))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    view.rerender(<TripHarness tripId={null} />)
    expect(view.getByTestId('decision').textContent).toMatch(/^need\|/)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    await waitFor(() => expect(view.getByTestId('decision').textContent).toMatch(/^idle\|/))
  })

  it('Offline com viagem confirmada mantém a decisão numa lacuna curta', async () => {
    status.mockResolvedValue({ is_available: false })
    tripDetail.mockResolvedValue(trip('ongoing'))
    const view = render(<TripHarness tripId="trip-1" />)
    await waitFor(() => expect(view.getByTestId('decision').textContent).toBe('need|confirmed|steady|ongoing'))

    auth.token = null
    view.rerender(<TripHarness tripId="trip-1" />)
    await waitFor(() => expect(view.getByTestId('decision').textContent).toMatch(/^need\|confirmed\|/))
  })

  it('Offline com id por confirmar não autoriza durante a lacuna', async () => {
    status.mockResolvedValue({ is_available: false })
    tripDetail.mockImplementation(() => new Promise(() => { }))
    const view = render(<TripHarness tripId="trip-1" />)
    await waitFor(() => expect(view.getByTestId('watch').textContent).toBe('yes|off'))
    expect(view.getByTestId('decision').textContent).toBe('idle|open|steady|none')

    auth.token = null
    view.rerender(<TripHarness tripId="trip-1" />)
    expect(view.getByTestId('decision').textContent).toBe('idle|open|steady|none')
  })

  it('serviço parado não arranca só porque o token desaparece', async () => {
    status.mockResolvedValue({ is_available: false })
    const view = render(<TripHarness tripId={null} />)
    await waitFor(() => expect(view.getByTestId('watch').textContent).toBe('yes|off'))
    expect(view.getByTestId('decision').textContent).toMatch(/^idle\|/)

    auth.token = null
    view.rerender(<TripHarness tripId={null} />)
    expect(view.getByTestId('decision').textContent).toMatch(/^idle\|/)
    expect(serviceCalls).toEqual([])
  })

  it('troca de família e logout param sem esperar pela lacuna', async () => {
    status.mockResolvedValue({ is_available: true })
    tripDetail.mockResolvedValue(trip('arriving'))
    const view = render(<TripHarness tripId="trip-1" />)
    await waitFor(() => expect(view.getByTestId('decision').textContent).toMatch(/^need\|/))

    act(() => {
      noteSessionFamily('family-b')
    })
    view.rerender(<TripHarness tripId="trip-1" />)
    expect(view.getByTestId('decision').textContent).toMatch(/^idle\|/)

    auth.token = 'access-1'
    noteSessionFamily('family-a')
    status.mockResolvedValue({ is_available: true })
    view.rerender(<TripHarness tripId={null} />)
    await waitFor(() => expect(view.getByTestId('decision').textContent).toMatch(/^need\|/))

    auth.token = null
    act(() => {
      noteSessionFamily(null)
    })
    view.rerender(<TripHarness tripId={null} />)
    expect(view.getByTestId('decision').textContent).toMatch(/^idle\|/)
  })

  it('viagem cancelada com Offline não autoriza', async () => {
    status.mockResolvedValue({ is_available: false })
    tripDetail.mockResolvedValue(trip('cancelled'))
    const view = render(<TripHarness tripId="trip-1" />)
    await waitFor(() => expect(view.getByTestId('decision').textContent).toBe('idle|open|steady|cancelled'))
  })

  it('só a resposta de aceitação confirma; o poll atrasado ou em erro não desfaz', async () => {
    status.mockResolvedValue({ is_available: false })
    const pending = deferred<{ status: string }>()
    tripDetail.mockImplementation(() => pending.promise)
    const view = render(<TripHarness tripId="trip-1" />)
    await waitFor(() => expect(tripDetail).toHaveBeenCalled())
    expect(view.getByTestId('decision').textContent).toBe('idle|open|steady|none')

    await act(async () => {
      view.getByRole('button', { name: 'note-assigned' }).click()
    })
    expect(view.getByTestId('decision').textContent).toBe('idle|open|steady|none')

    await act(async () => {
      view.getByRole('button', { name: 'note-accepted' }).click()
    })
    expect(view.getByTestId('decision').textContent).toBe('need|confirmed|steady|accepted')

    tripDetail.mockRejectedValue(Object.assign(new Error('network'), { status: 0 }))
    await act(async () => {
      pending.resolve(trip('accepted'))
    })
    expect(view.getByTestId('decision').textContent).toMatch(/^need\|confirmed\|/)

    await act(async () => {
      view.getByRole('button', { name: 'note-cancelled' }).click()
    })
    expect(view.getByTestId('decision').textContent).toMatch(/^idle\|/)
  })
})

describe('elegibilidade documental', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    resetSessionFamilyForTests()
    resetGpsNeedLogForTests()
    serviceCalls.length = 0
    status.mockReset()
    tripDetail.mockReset()
    auth.token = 'access-1'
    auth.sessionRole = 'driver'
    installBridge()
    noteSessionFamily('family-a')
    status.mockResolvedValue({ is_available: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    resetSessionFamilyForTests()
    delete window.vamulaGps
  })

  it('remount com Online confirmado mantém locationNeeded e não publica Offline', async () => {
    const view = render(<DocHarness eligibility="clear" />)
    await waitFor(() => expect(view.getByTestId('watch').textContent).toBe('yes|on'))
    await waitFor(() => expect(view.getByTestId('decision').textContent).toMatch(/^need\|/))

    view.rerender(<DocHarness eligibility="checking" />)
    expect(view.getByTestId('decision').textContent).toMatch(/^need\|/)
    expect(view.getByTestId('watch').textContent).toBe('yes|on')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000)
    })
    expect(view.getByTestId('decision').textContent).toMatch(/^need\|/)
    expect(view.getByTestId('watch').textContent).toBe('yes|on')
  })

  it('missing ainda não confirmado não publica Offline nem autoriza arranque', async () => {
    const view = render(<DocHarness eligibility="checking" />)
    await waitFor(() => expect(view.getByTestId('watch').textContent).toBe('yes|on'))
    expect(view.getByTestId('decision').textContent).toMatch(/^idle\|/)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000)
    })
    expect(view.getByTestId('watch').textContent).toBe('yes|on')
    expect(view.getByTestId('decision').textContent).toMatch(/^idle\|/)
  })

  it('checking preserva a mesma família e blocked pára, mesmo com viagem', async () => {
    tripDetail.mockResolvedValue(trip('accepted'))
    const view = render(<DocHarness eligibility="clear" tripId="trip-1" />)
    await waitFor(() => expect(view.getByTestId('decision').textContent).toMatch(/^need\|confirmed\|/))

    view.rerender(<DocHarness eligibility="checking" tripId="trip-1" />)
    expect(view.getByTestId('decision').textContent).toMatch(/^need\|confirmed\|/)

    view.rerender(<DocHarness eligibility="blocked" tripId="trip-1" />)
    expect(view.getByTestId('decision').textContent).toMatch(/^idle\|confirmed\|/)
    expect(view.getByTestId('watch').textContent).toBe('yes|on')
  })

  it('outra família e o logout não herdam a confirmação', async () => {
    const view = render(<DocHarness eligibility="clear" />)
    await waitFor(() => expect(view.getByTestId('decision').textContent).toMatch(/^need\|/))

    act(() => {
      noteSessionFamily('family-b')
    })
    view.rerender(<DocHarness eligibility="checking" />)
    await waitFor(() => expect(view.getByTestId('watch').textContent).toBe('yes|on'))
    expect(view.getByTestId('decision').textContent).toMatch(/^idle\|/)

    act(() => {
      noteSessionFamily(null)
    })
    auth.token = null
    view.rerender(<DocHarness eligibility="clear" />)
    expect(view.getByTestId('decision').textContent).toMatch(/^idle\|/)

    auth.token = 'access-1'
    noteSessionFamily('family-a')
    view.rerender(<DocHarness eligibility="checking" />)
    await waitFor(() => expect(view.getByTestId('watch').textContent).toBe('yes|on'))
    expect(view.getByTestId('decision').textContent).toMatch(/^idle\|/)
  })

  it('Offline explícito continua a parar', async () => {
    const view = render(<DocHarness eligibility="clear" />)
    await waitFor(() => expect(view.getByTestId('decision').textContent).toMatch(/^need\|/))
    await act(async () => {
      view.getByRole('button', { name: 'go-offline' }).click()
    })
    expect(view.getByTestId('watch').textContent).toBe('yes|off')
    expect(view.getByTestId('decision').textContent).toMatch(/^idle\|/)
  })
})
