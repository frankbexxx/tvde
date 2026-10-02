import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { PartnerDriverRow, PartnerTripRow } from '../../api/partner'
import i18n from '../../i18n'
import { PartnerTripsSection } from './screens/PartnerTripsSection'
import { PartnerTripsSummaryScreen } from './screens/PartnerTripsSummaryScreen'
import { partnerTripHumanTitle } from './partnerTripIdentity'

const TRIP_ID = '98af7123-1111-4111-8111-111111111111'
const PASSENGER_ID = '2481222c-50f6-403f-aa59-8d386f1cd00a'

function trip(overrides: Partial<PartnerTripRow> = {}): PartnerTripRow {
  return {
    trip_id: TRIP_ID,
    status: 'ongoing',
    passenger_id: PASSENGER_ID,
    driver_id: 'drv-1',
    origin_lat: 38.72,
    origin_lng: -9.14,
    destination_lat: 38.73,
    destination_lng: -9.13,
    estimated_price: 12.5,
    final_price: null,
    created_at: '2026-07-23T08:00:00Z',
    started_at: null,
    completed_at: null,
    updated_at: '2026-07-23T08:05:00Z',
    vehicle_plate: '00-AA-00',
    ...overrides,
  }
}

function driver(name: string | null): PartnerDriverRow {
  return {
    user_id: 'drv-1',
    partner_id: 'p1',
    status: 'approved',
    is_available: true,
    user: { name, phone: null },
    last_location: null,
  }
}

function renderList(
  rows: PartnerTripRow[],
  drivers: PartnerDriverRow[],
  onSearchChange = vi.fn(),
) {
  return render(
    <MemoryRouter>
      <PartnerTripsSection
        filteredTrips={rows}
        drivers={drivers}
        tripFilter="all"
        onTripFilterChange={() => undefined}
        tripDriverFilter=""
        onTripDriverFilterChange={() => undefined}
        tripDateFrom=""
        onTripDateFromChange={() => undefined}
        tripDateTo=""
        onTripDateToChange={() => undefined}
        loading={false}
        onDownloadCsv={() => undefined}
        search=""
        onSearchChange={onSearchChange}
      />
    </MemoryRouter>,
  )
}

describe('partner trip identity', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
  })

  it('lista com nome, matrícula, estado e data; o id fica secundário', () => {
    renderList(
      [trip()],
      [driver('Maria do Carmo Albuquerque da Silva Pereira')],
    )
    const title = screen.getByTestId(`partner-trip-title-${TRIP_ID}`)
    expect(title).toHaveTextContent('Maria do Carmo Albuquerque da Silva Pereira · 00-AA-00')
    expect(screen.getByRole('link')).toHaveTextContent('Em curso')
    expect(screen.getByText(/Criada:/)).toBeInTheDocument()
    expect(screen.getByTestId(`partner-trip-ref-${TRIP_ID}`)).toHaveTextContent(TRIP_ID)
    expect(title).not.toHaveTextContent(TRIP_ID)
    expect(title).not.toHaveTextContent(PASSENGER_ID)
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      `/partner/trips/${encodeURIComponent(TRIP_ID)}`,
    )
  })

  it('sem origem, nome nem matrícula não mostra undefined e deixa o id secundário', () => {
    renderList(
      [trip({ vehicle_plate: 'null', driver_id: 'drv-1' })],
      [driver('undefined')],
    )
    const title = screen.getByTestId(`partner-trip-title-${TRIP_ID}`)
    expect(title.textContent).not.toMatch(/undefined|null/)
    expect(title).not.toHaveTextContent(TRIP_ID.slice(0, 8))
    expect(title).not.toHaveTextContent(PASSENGER_ID)
    expect(screen.getByRole('link')).toHaveTextContent('Em curso')
    expect(screen.getByTestId(`partner-trip-ref-${TRIP_ID}`)).toHaveTextContent(
      `Referência ${TRIP_ID}`,
    )
  })

  it('só a matrícula identifica a viagem quando não há nome', () => {
    renderList([trip({ vehicle_plate: '12-AB-34', driver_id: null })], [])
    expect(screen.getByTestId(`partner-trip-title-${TRIP_ID}`)).toHaveTextContent('12-AB-34')
    expect(screen.getByTestId(`partner-trip-title-${TRIP_ID}`)).not.toHaveTextContent(PASSENGER_ID)
  })

  it('a pesquisa diz motorista ou referência e envia o texto tal como foi escrito', () => {
    const onSearchChange = vi.fn()
    renderList([], [], onSearchChange)
    const field = screen.getByTestId('partner-trips-list-search')
    expect(field).toHaveAttribute('placeholder', 'Pesquisar por motorista ou referência')
    fireEvent.change(field, { target: { value: 'Maria 12-AB-34' } })
    expect(onSearchChange).toHaveBeenCalledExactlyOnceWith('Maria 12-AB-34')
  })

  it('o resumo usa o mesmo título humano', () => {
    render(
      <MemoryRouter>
        <PartnerTripsSummaryScreen
          tripStats={{ total: 1, ongoing: 1, completed: 0, cancelled: 0, failed: 0 }}
          recentTrips={[trip()]}
          drivers={[driver('João Silva')]}
        />
      </MemoryRouter>,
    )
    expect(screen.getByTestId(`partner-trip-title-${TRIP_ID}`)).toHaveTextContent(
      'João Silva · 00-AA-00',
    )
    expect(screen.getByTestId(`partner-trip-title-${TRIP_ID}`)).not.toHaveTextContent(
      `${TRIP_ID.slice(0, 8)}…`,
    )
  })

  it('o título do detalhe prefere percurso e ignora ids', () => {
    expect(
      partnerTripHumanTitle({
        originLabel: 'Rossio',
        destinationLabel: 'Aeroporto',
        driverName: 'João Silva',
        vehiclePlate: '12-AB-34',
        createdAtLabel: '23/07/2026',
      }),
    ).toBe('Rossio → Aeroporto')
    expect(
      partnerTripHumanTitle({
        originLabel: null,
        destinationLabel: 'undefined',
        driverName: ' ',
        vehiclePlate: null,
        createdAtLabel: '23/07/2026, 09:00',
      }),
    ).toBe('23/07/2026, 09:00')
  })
})
