import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { PartnerDriverRow } from '../../../api/partner'
import { PartnerFleetDriversSection } from './PartnerFleetDriversSection'

const onTrip: PartnerDriverRow = {
  user_id: 'drv-on',
  partner_id: 'p1',
  status: 'approved',
  is_available: false,
  user: { name: 'Em Serviço', phone: null },
  last_location: null,
  active_trip_id: 'trip-1',
  active_trip_status: 'ongoing',
}

const idle: PartnerDriverRow = {
  user_id: 'drv-idle',
  partner_id: 'p1',
  status: 'approved',
  is_available: true,
  user: { name: 'Livre', phone: null },
  last_location: null,
  active_trip_id: null,
  active_trip_status: null,
}

describe('PartnerFleetDriversSection (PARTNER-FLEET-1A)', () => {
  it('mostra badge Em viagem só para motorista com trip activa', () => {
    render(
      <MemoryRouter>
        <PartnerFleetDriversSection
          filteredDrivers={[onTrip, idle]}
          driverFilter="all"
          onDriverFilterChange={vi.fn()}
          loading={false}
        />
      </MemoryRouter>
    )
    const badges = screen.getAllByTestId('partner-driver-on-trip-badge')
    expect(badges).toHaveLength(1)
    expect(badges[0]).toHaveTextContent('Em viagem')
    expect(screen.getByText('Em Serviço')).toBeInTheDocument()
    expect(screen.getByText('Livre')).toBeInTheDocument()
  })
})
