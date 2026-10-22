import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AdminOrphanPaymentIntentsSection } from './AdminOrphanPaymentIntentsSection'
import type { OrphanPaymentIntentPreviewResponse } from '../../api/admin'
import * as adminApi from '../../api/admin'

vi.mock('../../api/admin', async (importOriginal) => {
  const mod = await importOriginal<typeof adminApi>()
  return {
    ...mod,
    getOrphanPaymentIntentsPreview: vi.fn(),
  }
})

const mockPreview = vi.mocked(adminApi.getOrphanPaymentIntentsPreview)

function baseResponse(
  overrides: Partial<OrphanPaymentIntentPreviewResponse> = {},
): OrphanPaymentIntentPreviewResponse {
  return {
    scan_run_id: '11111111-2222-3333-4444-555555555555',
    scanned_at: '2026-10-22T12:00:00+00:00',
    scan_status: 'ok',
    skipped: false,
    environment: 'staging',
    stripe_mode: 'test',
    window_days: 7,
    grace_minutes: 5,
    stripe_list_cap: 100,
    stripe_pages_fetched: 1,
    pis_listed: 0,
    pis_tvde_attributed: 0,
    ignored_external_count: 0,
    skipped_grace_count: 0,
    linked_count: 0,
    confirmed_orphans: [],
    inconclusive: [],
    errors: [],
    has_more: false,
    next_starting_after: null,
    ...overrides,
  }
}

describe('AdminOrphanPaymentIntentsSection (PR4 RTL)', () => {
  beforeEach(() => {
    mockPreview.mockReset()
  })

  it('não chama API ao montar (sem polling)', () => {
    render(<AdminOrphanPaymentIntentsSection token="tok" isSuperAdmin />)
    expect(mockPreview).not.toHaveBeenCalled()
  })

  it('botão desactivado para não super_admin', () => {
    render(<AdminOrphanPaymentIntentsSection token="tok" isSuperAdmin={false} />)
    expect(screen.getByTestId('orphan-pis-preview-btn')).toBeDisabled()
    expect(screen.getByText(/Requer papel super_admin/)).toBeInTheDocument()
  })

  it('super_admin: clique dispara uma única chamada', async () => {
    mockPreview.mockResolvedValue(baseResponse())
    render(<AdminOrphanPaymentIntentsSection token="tok" isSuperAdmin />)
    fireEvent.click(screen.getByTestId('orphan-pis-preview-btn'))
    await waitFor(() => expect(mockPreview).toHaveBeenCalledTimes(1))
    expect(mockPreview).toHaveBeenCalledWith('tok', {
      window_days: 7,
      grace_minutes: 5,
      limit: 100,
    })
  })

  it('loading desactiva botão e mostra texto A consultar', async () => {
    let resolve!: (v: OrphanPaymentIntentPreviewResponse) => void
    mockPreview.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r
        }),
    )
    render(<AdminOrphanPaymentIntentsSection token="tok" isSuperAdmin />)
    fireEvent.click(screen.getByTestId('orphan-pis-preview-btn'))
    const btn = screen.getByTestId('orphan-pis-preview-btn')
    expect(btn).toBeDisabled()
    expect(btn).toHaveTextContent('A consultar…')
    resolve(baseResponse())
    await waitFor(() => expect(btn).not.toBeDisabled())
  })

  it('resultado vazio mostra aviso de âmbito limitado', async () => {
    mockPreview.mockResolvedValue(baseResponse())
    render(<AdminOrphanPaymentIntentsSection token="tok" isSuperAdmin />)
    fireEvent.click(screen.getByTestId('orphan-pis-preview-btn'))
    await waitFor(() => expect(screen.getByTestId('orphan-pis-empty')).toBeInTheDocument())
    expect(screen.getByText(/não equivale a «zero órfãos globais»/)).toBeInTheDocument()
  })

  it('apresenta órfãos confirmados', async () => {
    mockPreview.mockResolvedValue(
      baseResponse({
        confirmed_orphans: [
          {
            payment_intent_id: 'pi_test_orphan1',
            stripe_status: 'requires_capture',
            orphan_class: 'open',
            finding_kind: 'confirmed_orphan',
            trip_id_metadata: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            trip_exists: true,
            payment_row_found: false,
          },
        ],
      }),
    )
    render(<AdminOrphanPaymentIntentsSection token="tok" isSuperAdmin />)
    fireEvent.click(screen.getByTestId('orphan-pis-preview-btn'))
    await waitFor(() => expect(screen.getByText(/Órfãos confirmados \(1\)/)).toBeInTheDocument())
    expect(screen.getByText(/pi_test_orphan1/)).toBeInTheDocument()
  })

  it('apresenta inconclusivos separados', async () => {
    mockPreview.mockResolvedValue(
      baseResponse({
        inconclusive: [
          {
            payment_intent_id: 'pi_incon',
            finding_kind: 'inconclusive_trip_not_found',
            detail: 'trip missing',
            trip_id_metadata: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          },
        ],
      }),
    )
    render(<AdminOrphanPaymentIntentsSection token="tok" isSuperAdmin />)
    fireEvent.click(screen.getByTestId('orphan-pis-preview-btn'))
    await waitFor(() => expect(screen.getByText(/Inconclusivos \(1\)/)).toBeInTheDocument())
    expect(screen.getByText(/inconclusive_trip_not_found/)).toBeInTheDocument()
  })

  it('resultado parcial indica paginação', async () => {
    mockPreview.mockResolvedValue(
      baseResponse({
        scan_status: 'partial',
        has_more: true,
        next_starting_after: 'pi_page_cursor',
      }),
    )
    render(<AdminOrphanPaymentIntentsSection token="tok" isSuperAdmin />)
    fireEvent.click(screen.getByTestId('orphan-pis-preview-btn'))
    await waitFor(() => expect(screen.getByText(/Resultados parciais/)).toBeInTheDocument())
    expect(screen.getByText(/starting_after=pi_page_cursor/)).toBeInTheDocument()
  })

  it('estado skipped MOCK', async () => {
    mockPreview.mockResolvedValue(
      baseResponse({
        skipped: true,
        skip_reason: 'stripe_mock',
        skip_message: 'STRIPE_MOCK=true',
        scan_status: 'skipped',
      }),
    )
    render(<AdminOrphanPaymentIntentsSection token="tok" isSuperAdmin />)
    fireEvent.click(screen.getByTestId('orphan-pis-preview-btn'))
    await waitFor(() => expect(screen.getByTestId('orphan-pis-skipped')).toBeInTheDocument())
    expect(screen.getByText(/stripe_mock/)).toBeInTheDocument()
  })

  it('erro de API', async () => {
    mockPreview.mockRejectedValue(new Error('stripe_rate_limit'))
    render(<AdminOrphanPaymentIntentsSection token="tok" isSuperAdmin />)
    fireEvent.click(screen.getByTestId('orphan-pis-preview-btn'))
    await waitFor(() => expect(screen.getByTestId('orphan-pis-error')).toHaveTextContent('stripe_rate_limit'))
  })

  it('erros Stripe na resposta', async () => {
    mockPreview.mockResolvedValue(
      baseResponse({
        scan_status: 'failed',
        errors: ['stripe_rate_limit', 'Too many requests'],
      }),
    )
    render(<AdminOrphanPaymentIntentsSection token="tok" isSuperAdmin />)
    fireEvent.click(screen.getByTestId('orphan-pis-preview-btn'))
    await waitFor(() => expect(screen.getByText('Too many requests')).toBeInTheDocument())
  })
})
