import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../../i18n'
import { PartnerFleetDiscoverSection } from './screens/PartnerFleetDiscoverSection'
import { PartnerFleetMap } from './PartnerFleetMap'
import { PartnerMessagesSection } from './PartnerMessagesSection'
import { PartnerTripsExportScreen } from './screens/PartnerTripsExportScreen'
import { PartnerTripsSection } from './screens/PartnerTripsSection'

vi.mock('../../maps/MapView', () => ({
  MapView: () => <div data-testid="partner-map-stub" />,
}))

const postPartnerMessage = vi.fn(async (_payload: unknown) => undefined)

vi.mock('../../api/partner', () => ({
  fetchPartnerInboxMessages: vi.fn(async () => []),
  markPartnerMessageRead: vi.fn(async () => undefined),
  postPartnerMessage: (payload: unknown) => postPartnerMessage(payload),
}))

describe('partner UX copy', () => {
  beforeEach(async () => {
    postPartnerMessage.mockClear()
    await i18n.changeLanguage('pt')
  })

  it('describes associating an existing driver and keeps the same submit', () => {
    const onAdd = vi.fn()
    render(
      <PartnerFleetDiscoverSection
        discoverQuery="Ana"
        onDiscoverQueryChange={() => undefined}
        discoverLoading={false}
        discoverRows={[
          {
            user_id: 'drv-1',
            name: 'Ana',
            phone: '+351900000000',
            status: 'approved',
            partner_id: 'fleet-1',
          },
        ]}
        discoverSearched
        discoverAlreadyInFleet={false}
        onSearch={() => undefined}
        onAddToFleet={onAdd}
      />,
    )
    expect(screen.getByText(/não cria uma conta nova/i)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/UUID|Default|conta nova criada/i)
    fireEvent.click(screen.getByRole('button', { name: 'Associar à frota' }))
    expect(onAdd).toHaveBeenCalledExactlyOnceWith('drv-1')
  })

  it('uses human map legend labels', () => {
    render(
      <MemoryRouter>
        <PartnerFleetMap drivers={[]} trips={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Disponível, sem viagem em curso')).toBeInTheDocument()
    expect(screen.getByText('Em viagem')).toBeInTheDocument()
    expect(screen.getByText(/O número abre a viagem/)).toBeInTheDocument()
    expect(screen.getByText(/sem posição há mais de 15 minutos/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/GPS antigo|link detalhe|offline/i)
  })

  it('says the notice goes to the whole fleet before send and keeps the same payload', async () => {
    render(
      <MemoryRouter>
        <PartnerMessagesSection />
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Aviso a toda a frota' }))
    expect(screen.getByPlaceholderText('Mensagem para todos os motoristas')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('Título do aviso'), { target: { value: 'Pausa' } })
    fireEvent.change(screen.getByPlaceholderText('Mensagem para todos os motoristas'), {
      target: { value: 'Parem 10 minutos.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a toda a frota' }))
    await waitFor(() => expect(postPartnerMessage).toHaveBeenCalledOnce())
    expect(postPartnerMessage).toHaveBeenCalledWith({
      title: 'Pausa',
      body: 'Parem 10 minutos.',
      priority: 'normal',
      driver_user_id: null,
    })
    expect(await screen.findByText('Aviso enviado a toda a frota.')).toBeInTheDocument()
  })

  it('names the trip download as CSV and keeps the same download action', () => {
    const onDownload = vi.fn()
    render(
      <MemoryRouter>
        <PartnerTripsSection
          filteredTrips={[]}
          drivers={[]}
          tripFilter="all"
          onTripFilterChange={() => undefined}
          tripDriverFilter=""
          onTripDriverFilterChange={() => undefined}
          tripDateFrom=""
          onTripDateFromChange={() => undefined}
          tripDateTo=""
          onTripDateToChange={() => undefined}
          loading={false}
          onDownloadCsv={onDownload}
          search=""
          onSearchChange={() => undefined}
        />
        <PartnerTripsExportScreen
          onDownloadCsv={onDownload}
          onDownloadAllCsv={() => undefined}
          filteredCount={2}
          totalCount={2}
        />
      </MemoryRouter>,
    )
    const downloads = screen.getAllByRole('button', { name: 'Exportar viagens (CSV)' })
    expect(downloads).toHaveLength(2)
    expect(screen.getByText('Descarrega um ficheiro CSV das viagens.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/trip_id|UTF-8|driver_id/)
    fireEvent.click(downloads[0])
    expect(onDownload).toHaveBeenCalledOnce()
  })
})
