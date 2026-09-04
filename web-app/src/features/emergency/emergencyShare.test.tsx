import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  buildEmergencyShareText,
  isDriverEmergencyStatus,
  isPassengerEmergencyStatus,
  EMERGENCY_TEL_HREF,
  shareEmergencyText,
  type EmergencySnapshot,
} from './emergencyShare'
import { EmergencySosButton, EmergencySosPanel } from './EmergencySosPanel'

const baseSnap = (over: Partial<EmergencySnapshot> = {}): EmergencySnapshot => ({
  trip_ref: 'VM-ABCDEF12',
  status: 'ongoing',
  origin_lat: 38.72,
  origin_lng: -9.14,
  destination_lat: 38.74,
  destination_lng: -9.15,
  vehicle_plate: '12-AB-34',
  driver_display_name: 'João',
  location: {
    lat: 38.73,
    lng: -9.145,
    updated_at: '2026-09-04T12:00:00+00:00',
    map_link: 'https://maps.google.com/?q=38.730000,-9.145000',
  },
  role_view: 'passenger',
  ...over,
})

describe('emergencyShare helpers', () => {
  it('passenger statuses include assigned', () => {
    expect(isPassengerEmergencyStatus('assigned')).toBe(true)
    expect(isPassengerEmergencyStatus('requested')).toBe(false)
    expect(isPassengerEmergencyStatus('completed')).toBe(false)
  })

  it('driver statuses exclude assigned', () => {
    expect(isDriverEmergencyStatus('assigned')).toBe(false)
    expect(isDriverEmergencyStatus('accepted')).toBe(true)
    expect(isDriverEmergencyStatus('ongoing')).toBe(true)
  })

  it('share text omits internal ids and includes plate/driver for passenger', () => {
    const text = buildEmergencyShareText(baseSnap())
    expect(text).toContain('VM-ABCDEF12')
    expect(text).toContain('12-AB-34')
    expect(text).toContain('Motorista: João')
    expect(text).toContain('maps.google.com')
    expect(text).not.toContain('passenger_id')
    expect(text).not.toContain('driver_id')
  })

  it('driver share text omits driver_display_name even if present', () => {
    const text = buildEmergencyShareText(
      baseSnap({ role_view: 'driver', driver_display_name: 'ShouldHide' })
    )
    expect(text).not.toContain('ShouldHide')
    expect(text).not.toContain('Motorista:')
  })

  it('location unavailable line when no location', () => {
    const text = buildEmergencyShareText(baseSnap({ location: null }))
    expect(text).toContain('Localização actual: indisponível')
  })

  it('tel:112 constant', () => {
    expect(EMERGENCY_TEL_HREF).toBe('tel:112')
  })

  it('clipboard fallback when share missing', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    // ensure share absent
    // @ts-expect-error test
    navigator.share = undefined
    const result = await shareEmergencyText('hello')
    expect(result).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('hello')
  })
})

describe('EmergencySosButton', () => {
  it('renders SOS button', () => {
    const onClick = vi.fn()
    render(<EmergencySosButton onClick={onClick} />)
    fireEvent.click(screen.getByTestId('emergency-sos-button'))
    expect(onClick).toHaveBeenCalled()
  })
})

describe('EmergencySosPanel', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/events')) {
          return new Response(JSON.stringify({ ok: true, recorded: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        if (url.includes('/snapshot')) {
          return new Response(JSON.stringify(baseSnap({ location: null })), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response('{}', { status: 404 })
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens panel, shows unavailable location, and call button works', async () => {
    render(
      <EmergencySosPanel
        tripId="11111111-1111-1111-1111-111111111111"
        token="tok"
        open
        onClose={() => undefined}
      />
    )

    expect(screen.getByTestId('emergency-sos-panel')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByTestId('emergency-location-unavailable')).toBeInTheDocument()
    })
    expect(screen.getByText('VM-ABCDEF12')).toBeInTheDocument()
    expect(screen.queryByText(/passenger_id/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('emergency-call-112'))
    await waitFor(() => {
      const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls
      expect(calls.some((c) => String(c[0]).includes('/events'))).toBe(true)
    })
  })

  it('closed when open=false', () => {
    const { container } = render(
      <EmergencySosPanel tripId="t" token="tok" open={false} onClose={() => undefined} />
    )
    expect(container.querySelector('[data-testid="emergency-sos-panel"]')).toBeNull()
  })
})
