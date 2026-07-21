import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PartnerVehicleDocumentRow } from '../../../api/partner'
import i18n from '../../../i18n'
import { PartnerVehicleDocumentsPanel } from './PartnerVehicleDocumentsPanel'

const baseDoc = (
  overrides: Partial<PartnerVehicleDocumentRow> &
    Pick<PartnerVehicleDocumentRow, 'document_type' | 'computed_status'>
): PartnerVehicleDocumentRow => ({
  id: overrides.id ?? `doc-${overrides.document_type}`,
  vehicle_id: 'veh-1',
  partner_id: 'p1',
  document_type: overrides.document_type,
  status: overrides.status ?? 'approved',
  computed_status: overrides.computed_status,
  file_path: overrides.file_path ?? null,
  file_name: overrides.file_name ?? null,
  has_file: overrides.has_file ?? false,
  document_number: overrides.document_number ?? null,
  issuer: overrides.issuer ?? null,
  valid_from: overrides.valid_from ?? null,
  expires_at: overrides.expires_at ?? null,
  issued_at: overrides.issued_at ?? null,
  metadata: null,
  notes: overrides.notes ?? null,
  reviewed_by: null,
  reviewed_at: null,
  created_at: '2026-07-21T00:00:00Z',
  updated_at: '2026-07-21T00:00:00Z',
})

const api = vi.hoisted(() => ({
  fetchPartnerVehicleDocuments: vi.fn(),
  createPartnerVehicleDocument: vi.fn(),
  patchPartnerVehicleDocument: vi.fn(),
  deletePartnerVehicleDocument: vi.fn(),
  uploadPartnerVehicleDocument: vi.fn(),
  downloadPartnerVehicleDocumentFile: vi.fn(),
}))

vi.mock('../../../api/partner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/partner')>()
  return {
    ...actual,
    fetchPartnerVehicleDocuments: api.fetchPartnerVehicleDocuments,
    createPartnerVehicleDocument: api.createPartnerVehicleDocument,
    patchPartnerVehicleDocument: api.patchPartnerVehicleDocument,
    deletePartnerVehicleDocument: api.deletePartnerVehicleDocument,
    uploadPartnerVehicleDocument: api.uploadPartnerVehicleDocument,
    downloadPartnerVehicleDocumentFile: api.downloadPartnerVehicleDocumentFile,
  }
})

describe('PartnerVehicleDocumentsPanel (PARTNER-FLEET-3B)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('pt')
    api.fetchPartnerVehicleDocuments.mockResolvedValue([])
  })

  it('mostra os 4 tipos P0 em falta quando a lista está vazia', async () => {
    render(<PartnerVehicleDocumentsPanel vehicleId="veh-1" />)
    await waitFor(() => {
      expect(screen.getByTestId('partner-vehicle-docs-panel')).toBeInTheDocument()
    })
    for (const type of [
      'vehicle_registration',
      'vehicle_insurance',
      'periodic_inspection',
      'tvde_sticker',
    ]) {
      expect(screen.getByTestId(`partner-vehicle-doc-slot-${type}`)).toBeInTheDocument()
      expect(screen.getByTestId(`partner-vehicle-doc-status-${type}`)).toHaveTextContent(/em falta/i)
    }
    expect(api.fetchPartnerVehicleDocuments).toHaveBeenCalledWith('veh-1')
  })

  it('cria metadata e faz upload quando há ficheiro', async () => {
    const created = baseDoc({
      id: 'doc-new',
      document_type: 'vehicle_insurance',
      computed_status: 'pending_review',
      status: 'pending_review',
    })
    const uploaded = {
      ...created,
      has_file: true,
      file_name: 'seguro.pdf',
      computed_status: 'pending_review',
    }
    api.createPartnerVehicleDocument.mockResolvedValue(created)
    api.uploadPartnerVehicleDocument.mockResolvedValue(uploaded)
    api.fetchPartnerVehicleDocuments
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([uploaded])

    render(<PartnerVehicleDocumentsPanel vehicleId="veh-1" />)
    await waitFor(() =>
      expect(screen.getByTestId('partner-vehicle-doc-add-vehicle_insurance')).toBeInTheDocument()
    )

    fireEvent.click(screen.getByTestId('partner-vehicle-doc-add-vehicle_insurance'))
    fireEvent.change(screen.getByTestId('partner-vehicle-doc-field-expires-vehicle_insurance'), {
      target: { value: '2027-12-31' },
    })
    const file = new File(['pdf-bytes'], 'seguro.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByTestId('partner-vehicle-doc-field-file-vehicle_insurance'), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByTestId('partner-vehicle-doc-save-vehicle_insurance'))

    await waitFor(() => {
      expect(api.createPartnerVehicleDocument).toHaveBeenCalledWith(
        'veh-1',
        expect.objectContaining({
          document_type: 'vehicle_insurance',
          expires_at: '2027-12-31T00:00:00Z',
        })
      )
    })
    await waitFor(() => {
      expect(api.uploadPartnerVehicleDocument).toHaveBeenCalledWith('veh-1', 'doc-new', file)
    })
    await waitFor(() => {
      expect(screen.getByTestId('partner-vehicle-doc-file-vehicle_insurance')).toHaveTextContent(
        'seguro.pdf'
      )
    })
  })

  it('repete o upload como edição quando a criação já foi persistida', async () => {
    const created = baseDoc({
      id: 'doc-new',
      document_type: 'vehicle_insurance',
      computed_status: 'pending_review',
      status: 'pending_review',
    })
    const uploaded = {
      ...created,
      has_file: true,
      file_name: 'seguro.pdf',
    }
    api.createPartnerVehicleDocument.mockResolvedValue(created)
    api.patchPartnerVehicleDocument.mockResolvedValue(created)
    api.uploadPartnerVehicleDocument
      .mockRejectedValueOnce({ status: 413, detail: 'file_too_large' })
      .mockResolvedValueOnce(uploaded)
    api.fetchPartnerVehicleDocuments
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([uploaded])

    render(<PartnerVehicleDocumentsPanel vehicleId="veh-1" />)
    await waitFor(() =>
      expect(screen.getByTestId('partner-vehicle-doc-add-vehicle_insurance')).toBeInTheDocument()
    )

    fireEvent.click(screen.getByTestId('partner-vehicle-doc-add-vehicle_insurance'))
    const file = new File(['pdf-bytes'], 'seguro.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByTestId('partner-vehicle-doc-field-file-vehicle_insurance'), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByTestId('partner-vehicle-doc-save-vehicle_insurance'))

    await waitFor(() => {
      expect(screen.getByTestId('partner-vehicle-docs-error')).toHaveTextContent(/5 MB/i)
      expect(screen.getByTestId('partner-vehicle-doc-edit-vehicle_insurance')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('partner-vehicle-doc-add-vehicle_insurance')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('partner-vehicle-doc-save-vehicle_insurance'))

    await waitFor(() => {
      expect(api.patchPartnerVehicleDocument).toHaveBeenCalledWith(
        'veh-1',
        'doc-new',
        expect.any(Object)
      )
      expect(api.createPartnerVehicleDocument).toHaveBeenCalledTimes(1)
      expect(api.uploadPartnerVehicleDocument).toHaveBeenCalledTimes(2)
    })
    await waitFor(() => {
      expect(screen.getByTestId('partner-vehicle-doc-file-vehicle_insurance')).toHaveTextContent(
        'seguro.pdf'
      )
    })
  })

  it('edita validade/status/notas via PATCH', async () => {
    const existing = baseDoc({
      document_type: 'periodic_inspection',
      computed_status: 'valid',
      status: 'approved',
      expires_at: '2027-01-01T00:00:00Z',
    })
    const patched = {
      ...existing,
      notes: 'Renovado',
      expires_at: '2028-06-01T00:00:00Z',
    }
    api.fetchPartnerVehicleDocuments
      .mockResolvedValueOnce([existing])
      .mockResolvedValueOnce([patched])
    api.patchPartnerVehicleDocument.mockResolvedValue(patched)

    render(<PartnerVehicleDocumentsPanel vehicleId="veh-1" />)
    await waitFor(() =>
      expect(screen.getByTestId('partner-vehicle-doc-edit-periodic_inspection')).toBeInTheDocument()
    )

    fireEvent.click(screen.getByTestId('partner-vehicle-doc-edit-periodic_inspection'))
    fireEvent.change(screen.getByTestId('partner-vehicle-doc-field-expires-periodic_inspection'), {
      target: { value: '2028-06-01' },
    })
    fireEvent.change(screen.getByTestId('partner-vehicle-doc-field-notes-periodic_inspection'), {
      target: { value: 'Renovado' },
    })
    fireEvent.change(screen.getByTestId('partner-vehicle-doc-field-status-periodic_inspection'), {
      target: { value: 'approved' },
    })
    fireEvent.click(screen.getByTestId('partner-vehicle-doc-save-periodic_inspection'))

    await waitFor(() => {
      expect(api.patchPartnerVehicleDocument).toHaveBeenCalledWith(
        'veh-1',
        existing.id,
        expect.objectContaining({
          expires_at: '2028-06-01T00:00:00Z',
          notes: 'Renovado',
          status: 'approved',
        })
      )
    })
  })

  it('descarrega ficheiro via download API', async () => {
    const existing = baseDoc({
      document_type: 'tvde_sticker',
      computed_status: 'valid',
      has_file: true,
      file_name: 'distico.pdf',
    })
    api.fetchPartnerVehicleDocuments.mockResolvedValue([existing])
    api.downloadPartnerVehicleDocumentFile.mockResolvedValue(new Blob(['x']))

    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    })

    render(<PartnerVehicleDocumentsPanel vehicleId="veh-1" />)
    await waitFor(() =>
      expect(screen.getByTestId('partner-vehicle-doc-download-tvde_sticker')).toBeInTheDocument()
    )
    fireEvent.click(screen.getByTestId('partner-vehicle-doc-download-tvde_sticker'))
    await waitFor(() => {
      expect(api.downloadPartnerVehicleDocumentFile).toHaveBeenCalledWith('veh-1', existing.id)
    })
    vi.unstubAllGlobals()
  })

  it('delete remove documento e volta a Em falta', async () => {
    const existing = baseDoc({
      document_type: 'vehicle_registration',
      computed_status: 'valid',
    })
    api.fetchPartnerVehicleDocuments
      .mockResolvedValueOnce([existing])
      .mockResolvedValueOnce([])
    api.deletePartnerVehicleDocument.mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<PartnerVehicleDocumentsPanel vehicleId="veh-1" />)
    await waitFor(() =>
      expect(screen.getByTestId('partner-vehicle-doc-delete-vehicle_registration')).toBeInTheDocument()
    )
    fireEvent.click(screen.getByTestId('partner-vehicle-doc-delete-vehicle_registration'))
    await waitFor(() => {
      expect(api.deletePartnerVehicleDocument).toHaveBeenCalledWith('veh-1', existing.id)
    })
    await waitFor(() => {
      expect(screen.getByTestId('partner-vehicle-doc-status-vehicle_registration')).toHaveTextContent(
        /em falta/i
      )
    })
  })

  it('mostra erro claro em 409 document_type_exists', async () => {
    api.createPartnerVehicleDocument.mockRejectedValue({
      status: 409,
      detail: 'document_type_exists',
    })
    render(<PartnerVehicleDocumentsPanel vehicleId="veh-1" />)
    await waitFor(() =>
      expect(screen.getByTestId('partner-vehicle-doc-add-vehicle_insurance')).toBeInTheDocument()
    )
    fireEvent.click(screen.getByTestId('partner-vehicle-doc-add-vehicle_insurance'))
    fireEvent.click(screen.getByTestId('partner-vehicle-doc-save-vehicle_insurance'))
    await waitFor(() => {
      expect(screen.getByTestId('partner-vehicle-docs-error')).toHaveTextContent(
        /já existe um documento deste tipo/i
      )
    })
  })

  it('mostra computed_status correctos', async () => {
    api.fetchPartnerVehicleDocuments.mockResolvedValue([
      baseDoc({
        document_type: 'vehicle_registration',
        computed_status: 'pending_review',
        status: 'pending_review',
      }),
      baseDoc({
        document_type: 'vehicle_insurance',
        computed_status: 'valid',
      }),
      baseDoc({
        document_type: 'periodic_inspection',
        computed_status: 'expiring_soon',
      }),
      baseDoc({
        document_type: 'tvde_sticker',
        computed_status: 'expired',
      }),
    ])
    render(<PartnerVehicleDocumentsPanel vehicleId="veh-1" />)
    await waitFor(() => {
      expect(screen.getByTestId('partner-vehicle-doc-status-vehicle_registration')).toHaveTextContent(
        /pendente/i
      )
    })
    expect(screen.getByTestId('partner-vehicle-doc-status-vehicle_insurance')).toHaveTextContent(
      /válido/i
    )
    expect(screen.getByTestId('partner-vehicle-doc-status-periodic_inspection')).toHaveTextContent(
      /expira em breve/i
    )
    expect(screen.getByTestId('partner-vehicle-doc-status-tvde_sticker')).toHaveTextContent(
      /expirado/i
    )
  })

  it('mostra rejected e file_too_large', async () => {
    api.fetchPartnerVehicleDocuments.mockResolvedValue([
      baseDoc({
        document_type: 'vehicle_insurance',
        computed_status: 'rejected',
        status: 'rejected',
      }),
    ])
    api.uploadPartnerVehicleDocument.mockRejectedValue({
      status: 413,
      detail: 'file_too_large',
    })
    api.patchPartnerVehicleDocument.mockResolvedValue(
      baseDoc({
        document_type: 'vehicle_insurance',
        computed_status: 'rejected',
        status: 'rejected',
      })
    )

    render(<PartnerVehicleDocumentsPanel vehicleId="veh-1" />)
    await waitFor(() => {
      expect(screen.getByTestId('partner-vehicle-doc-status-vehicle_insurance')).toHaveTextContent(
        /rejeitado/i
      )
    })
    fireEvent.click(screen.getByTestId('partner-vehicle-doc-edit-vehicle_insurance'))
    const file = new File(['x'], 'big.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByTestId('partner-vehicle-doc-field-file-vehicle_insurance'), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByTestId('partner-vehicle-doc-save-vehicle_insurance'))
    await waitFor(() => {
      expect(screen.getByTestId('partner-vehicle-docs-error')).toHaveTextContent(/5 MB/i)
    })
  })
})
