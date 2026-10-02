import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { PartnerDriverRow } from '../../api/partner'
import i18n from '../../i18n'
import { PartnerDriverDetail } from './PartnerDriverDetail'

const api = vi.hoisted(() => ({
  fetchPartnerDriver: vi.fn(),
  fetchPartnerTrips: vi.fn(),
  fetchPartnerDriverZoneBudgetToday: vi.fn(),
  fetchPartnerDriverZoneSessionOpen: vi.fn(),
  patchPartnerDriverDocuments: vi.fn(),
}))

vi.mock('../../api/partner', async () => {
  const actual = await vi.importActual<typeof import('../../api/partner')>('../../api/partner')
  return {
    ...actual,
    fetchPartnerDriver: api.fetchPartnerDriver,
    fetchPartnerTrips: api.fetchPartnerTrips,
    fetchPartnerDriverZoneBudgetToday: api.fetchPartnerDriverZoneBudgetToday,
    fetchPartnerDriverZoneSessionOpen: api.fetchPartnerDriverZoneSessionOpen,
    patchPartnerDriverDocuments: api.patchPartnerDriverDocuments,
  }
})

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}))

function driver(documents: PartnerDriverRow['documents']): PartnerDriverRow {
  return {
    user_id: 'drv-1',
    partner_id: 'p1',
    status: 'approved',
    is_available: false,
    user: { name: 'Motorista Teste', phone: '+351900000000' },
    last_location: null,
    documents,
  }
}

describe('PartnerDriverDetail document rejection', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
    api.fetchPartnerTrips.mockResolvedValue([])
    api.fetchPartnerDriverZoneBudgetToday.mockRejectedValue(new Error('skip'))
    api.fetchPartnerDriverZoneSessionOpen.mockRejectedValue(new Error('skip'))
    api.patchPartnerDriverDocuments.mockReset()
    api.fetchPartnerDriver.mockResolvedValue(
      driver({
        carta_tvde: {
          status: 'pending_review',
          partner_note: 'nota-so-da-equipa-xyz',
          public_rejection_reason: '',
          file_path: 'x/carta.pdf',
        },
      }),
    )
  })

  it('separa o motivo para o motorista da nota interna e reabre os dois valores', async () => {
    api.patchPartnerDriverDocuments.mockImplementation(async (_userId: string, docs: Record<string, unknown>) =>
      driver({
        carta_tvde: {
          status: 'rejected',
          file_path: 'x/carta.pdf',
          ...(docs.carta_tvde as object),
        },
      }),
    )
    render(
      <MemoryRouter initialEntries={['/partner/drivers/drv-1']}>
        <Routes>
          <Route path="/partner/drivers/:userId" element={<PartnerDriverDetail />} />
        </Routes>
      </MemoryRouter>,
    )
    const reason = await screen.findByTestId('partner-doc-public-reason-carta_tvde')
    const note = await screen.findByTestId('partner-doc-internal-note-carta_tvde')
    expect(screen.getAllByText('Motivo para o motorista').length).toBeGreaterThan(0)
    expect(screen.getAllByText('O motorista verá este motivo.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Nota interna').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Só a equipa vê esta nota.').length).toBeGreaterThan(0)
    await waitFor(() => expect(note).toHaveValue('nota-so-da-equipa-xyz'))

    fireEvent.change(reason, { target: { value: 'Documento ilegível' } })
    fireEvent.change(note, { target: { value: 'visto no balcão' } })
    fireEvent.click(screen.getByTestId('partner-doc-status-carta_tvde-rejected'))

    await waitFor(() => expect(api.patchPartnerDriverDocuments).toHaveBeenCalledTimes(1))
    expect(api.patchPartnerDriverDocuments).toHaveBeenCalledWith('drv-1', {
      carta_tvde: {
        status: 'rejected',
        public_rejection_reason: 'Documento ilegível',
        partner_note: 'visto no balcão',
      },
    })
    expect(screen.getByTestId('partner-doc-public-reason-carta_tvde')).toHaveValue('Documento ilegível')
    expect(screen.getByTestId('partner-doc-internal-note-carta_tvde')).toHaveValue('visto no balcão')
  })
})
