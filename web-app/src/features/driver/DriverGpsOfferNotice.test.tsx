import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import { MAP_BANNER_STACK } from '../../components/layout/infoBoxTemplate'
import { DriverGpsOfferBanner } from './DriverGpsOfferBanner'
import {
  INITIAL_GPS_OFFER_NOTICE,
  reduceGpsOfferNotice,
  type GpsOfferNoticeState,
} from './driverGpsOfferNotice'

const COPY = 'Localização indisponível — não estás a receber novas ofertas.'

function notice(reason: 'location_missing' | 'location_stale', fetchFailed = false): GpsOfferNoticeState {
  return {
    ...INITIAL_GPS_OFFER_NOTICE,
    visibleReason: reason,
    hasReading: true,
    fetchFailed,
  }
}

function PhoneWithTripControls({
  offline,
  state,
}: {
  offline: boolean
  state: GpsOfferNoticeState
}) {
  return (
    <div className="flex h-[700px] w-[390px] flex-col">
      <div className={MAP_BANNER_STACK}>
        <DriverGpsOfferBanner offline={offline} notice={state} />
      </div>
      <div className="mt-auto flex gap-2 p-2">
        <button type="button">Cheguei</button>
        <button type="button">Iniciar viagem</button>
      </div>
    </div>
  )
}

describe('DriverGpsOfferBanner', () => {
  it('mostra o texto e distingue o motivo no atributo', () => {
    const { rerender } = render(
      <DriverGpsOfferBanner offline={false} notice={notice('location_stale')} />,
    )
    const banner = screen.getByTestId('driver-gps-offer-notice')
    expect(banner).toHaveTextContent(COPY)
    expect(banner).toHaveAttribute('data-gps-reason', 'location_stale')

    rerender(<DriverGpsOfferBanner offline={false} notice={notice('location_missing')} />)
    expect(screen.getByTestId('driver-gps-offer-notice')).toHaveAttribute(
      'data-gps-reason',
      'location_missing',
    )
  })

  it('offline esconde o aviso de ofertas', () => {
    render(<DriverGpsOfferBanner offline notice={notice('location_stale')} />)
    expect(screen.queryByTestId('driver-gps-offer-notice')).not.toBeInTheDocument()
  })

  it('falha sem leitura mostra estado explícito e não o aviso de GPS', () => {
    const failed = reduceGpsOfferNotice(INITIAL_GPS_OFFER_NOTICE, { type: 'fetch_failed' })
    render(<DriverGpsOfferBanner offline={false} notice={failed} />)
    expect(screen.queryByTestId('driver-gps-offer-notice')).not.toBeInTheDocument()
    expect(screen.getByTestId('driver-gps-offer-status-unknown')).toHaveTextContent(
      'Não foi possível confirmar se estás a receber novas ofertas.',
    )
  })

  it('numa viagem activa o aviso fica no topo e os controlos continuam presentes', () => {
    render(
      <PhoneWithTripControls
        offline={false}
        state={notice('location_stale')}
      />,
    )
    expect(screen.getByTestId('driver-gps-offer-notice')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cheguei' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar viagem' })).toBeInTheDocument()
  })
})
