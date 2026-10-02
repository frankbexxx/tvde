import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AdminTabAgora } from './tabs/AdminTabAgora'
import { AdminTabHealth } from './tabs/AdminTabHealth'
import { adminDocStatusLabel, adminHealthStatusLabel, adminSessionRoleLabel } from './adminCopy'

describe('admin copy', () => {
  it('a sessão põe o papel humano antes do identificador', () => {
    expect(adminSessionRoleLabel('super_admin')).toEqual({
      primary: 'Administrador principal',
      technical: 'super_admin',
    })
    expect(adminSessionRoleLabel('admin').primary).toBe('Administrador')
    expect(adminSessionRoleLabel('super_admin').primary).not.toMatch(/JWT/)
  })

  it('os estados de saúde têm palavra e mantêm o valor técnico', () => {
    expect(adminHealthStatusLabel('ok')).toEqual({ primary: 'Operacional', technical: 'ok' })
    expect(adminHealthStatusLabel('degraded')).toEqual({
      primary: 'Com problema',
      technical: 'degraded',
    })
    expect(adminHealthStatusLabel('unavailable')).toEqual({
      primary: 'Indisponível',
      technical: 'unavailable',
    })
    expect(adminHealthStatusLabel(null).primary).toBe('Desconhecido')
    expect(adminHealthStatusLabel('mystery')).toEqual({
      primary: 'Desconhecido',
      technical: 'mystery',
    })
  })

  it('os estados de documento leem-se em português e o valor interno fica', () => {
    expect(adminDocStatusLabel('pending_review')).toBe('Por rever')
    expect(adminDocStatusLabel('approved')).toBe('Aprovado')
    expect(adminDocStatusLabel('rejected')).toBe('Recusado')
    expect(adminDocStatusLabel('missing')).toBe('Em falta')
  })

  it('Agora mostra rótulos humanos e os mesmos números', () => {
    render(
      <AdminTabAgora
        activeTrips={[]}
        adminAlerts={{ zero_drivers_available: false, zero_trips_today: true }}
        countHealthSignalRows={() => 2}
        health={{
          status: 'degraded',
          warnings: [],
          stuck_payments: [{ trip_id: 't1' }],
          trips_accepted_too_long: [],
          trips_ongoing_too_long: [],
          drivers_unavailable_too_long: [],
        } as never}
        metrics={{
          active_trips: 4,
          drivers_available: 7,
          drivers_busy: 1,
          trips_requested: 2,
          trips_ongoing: 3,
          trips_completed_today: 9,
          trips_created_total: 10,
          trips_accepted_total: 8,
          trips_completed_total: 6,
        }}
        onRefresh={vi.fn(async () => 'ok')}
        pending={[{ phone: '1', requested_role: 'driver' }, { phone: '2', requested_role: 'driver' }]}
        syncAdminUrl={vi.fn()}
      />,
    )
    expect(screen.getByText(/Serviço:/)).toHaveTextContent('Com problema')
    expect(screen.getByText(/Serviço:/)).toHaveTextContent('degraded')
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText(/Pessoas à espera de aprovação/)).toBeInTheDocument()
    expect(screen.getByText(/Viagens em curso/)).toBeInTheDocument()
    expect(screen.getByText(/Nenhuma viagem criada hoje \(hora UTC\)/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Saúde API|stuck|SP-D|JWT/)
  })

  it('Saúde mostra operacional, com problema e o estado técnico', () => {
    const { rerender } = render(
      <AdminTabHealth
        fetchHealth={vi.fn()}
        health={{
          status: 'ok',
          warnings: [],
          stuck_payments: [],
          trips_accepted_too_long: [],
          trips_ongoing_too_long: [],
          drivers_unavailable_too_long: [],
          missing_payment_records: [],
          inconsistent_financial_state: [],
        }}
        syncAdminUrl={vi.fn()}
      />,
    )
    expect(screen.getByTestId('admin-health-status')).toHaveTextContent('Operacional')
    expect(screen.getByTestId('admin-health-status')).toHaveTextContent('ok')

    rerender(
      <AdminTabHealth
        fetchHealth={vi.fn()}
        health={{
          status: 'degraded',
          warnings: [],
          stuck_payments: [],
          trips_accepted_too_long: [{ trip_id: 't1' }],
          trips_ongoing_too_long: [],
          drivers_unavailable_too_long: [],
          missing_payment_records: [],
          inconsistent_financial_state: [],
        }}
        syncAdminUrl={vi.fn()}
      />,
    )
    expect(screen.getByTestId('admin-health-status')).toHaveTextContent('Com problema')
    expect(screen.getByTestId('admin-health-status')).toHaveTextContent('degraded')
    expect(screen.getByText(/Viagens aceites há muito tempo/)).toBeInTheDocument()
  })
})
