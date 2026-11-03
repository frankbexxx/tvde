import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EmergencySosPanel } from './EmergencySosPanel'
import { SAFE_AREA_BOTTOM_CLASS, SAFE_AREA_TOP_CLASS } from '@/components/layout/safeAreaInsets'
import type { EmergencySnapshot } from './emergencyShare'

const snap: EmergencySnapshot = {
  trip_ref: 'VM-TEST',
  status: 'ongoing',
  origin_lat: 0,
  origin_lng: 0,
  destination_lat: 0,
  destination_lng: 0,
  vehicle_plate: null,
  driver_display_name: null,
  location: null,
  role_view: 'driver',
}

const sos = vi.hoisted(() => ({
  recordEmergencyEvent: vi.fn(async () => undefined),
  getEmergencySnapshot: vi.fn(),
  openEmergencyCall112: vi.fn(),
  shareEmergencyText: vi.fn(async () => 'copied' as const),
}))

vi.mock('./emergencyShare', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./emergencyShare')>()
  return {
    ...actual,
    recordEmergencyEvent: sos.recordEmergencyEvent,
    getEmergencySnapshot: sos.getEmergencySnapshot,
    openEmergencyCall112: sos.openEmergencyCall112,
    shareEmergencyText: sos.shareEmergencyText,
  }
})

function countToken(value: string, token: string): number {
  return value.split(token).length - 1
}

describe('EmergencySosPanel safe areas', () => {
  beforeEach(() => {
    sos.recordEmergencyEvent.mockClear()
    sos.getEmergencySnapshot.mockReset()
    sos.getEmergencySnapshot.mockResolvedValue(snap)
    sos.openEmergencyCall112.mockClear()
    sos.shareEmergencyText.mockClear()
    document.documentElement.style.removeProperty('--safe-area-inset-top')
    document.documentElement.style.removeProperty('--safe-area-inset-bottom')
  })

  it('aplica cada inset uma vez, fora do scroll, com os botões dentro da área rolável', async () => {
    document.documentElement.style.setProperty('--safe-area-inset-top', '48px')
    document.documentElement.style.setProperty('--safe-area-inset-bottom', '36px')
    render(<EmergencySosPanel tripId="trip-1" token="tok" open onClose={() => undefined} />)

    const overlay = screen.getByTestId('emergency-sos-panel')
    const frame = screen.getByTestId('emergency-sos-safe-frame')
    const scroller = screen.getByTestId('emergency-sos-scroll')

    expect(overlay.className).toContain('fixed')
    expect(overlay.className).toContain('inset-0')
    expect(overlay.className).not.toContain('safe-area-inset')
    expect(countToken(frame.className, SAFE_AREA_TOP_CLASS)).toBe(1)
    expect(countToken(frame.className, SAFE_AREA_BOTTOM_CLASS)).toBe(1)
    expect(frame.className).not.toContain('keyboard-inset')
    expect(scroller.className).toContain('overflow-y-auto')
    expect(scroller.className).toContain('max-h-full')
    expect(scroller.className).not.toContain('safe-area-inset')
    expect(frame).toContainElement(scroller)
    expect(scroller).toContainElement(screen.getByTestId('emergency-call-112'))
    expect(scroller).toContainElement(screen.getByTestId('emergency-share-trip'))
    expect(scroller).toContainElement(screen.getByTestId('emergency-sos-close'))
    for (const id of ['emergency-call-112', 'emergency-share-trip', 'emergency-sos-close']) {
      expect(screen.getByTestId(id).className).not.toContain('safe-area-inset')
    }
    expect(overlay.querySelector('input, textarea')).toBeNull()
    await waitFor(() => expect(screen.getByTestId('emergency-call-112')).toBeEnabled())
  })

  it('mantém os três controlos visíveis quando os insets do browser são zero', async () => {
    render(<EmergencySosPanel tripId="trip-1" token="tok" open onClose={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Ligar 112' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Partilhar dados da viagem' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeVisible()
    expect(document.documentElement.style.getPropertyValue('--safe-area-inset-top')).toBe('')
    expect(document.documentElement.style.getPropertyValue('--safe-area-inset-bottom')).toBe('')
    await waitFor(() => expect(sos.getEmergencySnapshot).toHaveBeenCalled())
  })

  it('liga, partilha e fecha pelas mesmas acções, sem chamada nem partilha reais', async () => {
    const onClose = vi.fn()
    render(<EmergencySosPanel tripId="trip-1" token="tok" open onClose={onClose} />)
    await waitFor(() => expect(screen.getByTestId('emergency-share-trip')).toBeEnabled())

    fireEvent.click(screen.getByTestId('emergency-call-112'))
    await waitFor(() => expect(sos.openEmergencyCall112).toHaveBeenCalledTimes(1))
    expect(sos.recordEmergencyEvent).toHaveBeenCalledWith('trip-1', 'tok', 'call_initiated')
    expect(sos.shareEmergencyText).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('emergency-share-trip'))
    await waitFor(() => expect(sos.shareEmergencyText).toHaveBeenCalledTimes(1))
    expect(sos.openEmergencyCall112).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('emergency-sos-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
