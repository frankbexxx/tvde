import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PartnerTripsExportScreen } from './PartnerTripsExportScreen'

describe('PartnerTripsExportScreen CSV feedback', () => {
  it('mostra erro visível', () => {
    render(
      <PartnerTripsExportScreen
        onDownloadCsv={vi.fn()}
        onDownloadAllCsv={vi.fn()}
        filteredCount={1}
        totalCount={1}
        csvExport={{ exporting: false, error: 'Exportação CSV falhou. (0)', success: null }}
      />
    )
    expect(screen.getByTestId('partner-trips-export-csv-error')).toHaveTextContent(
      /exportação csv falhou/i
    )
  })

  it('desactiva botões enquanto exporta', () => {
    render(
      <PartnerTripsExportScreen
        onDownloadCsv={vi.fn()}
        onDownloadAllCsv={vi.fn()}
        filteredCount={1}
        totalCount={2}
        csvExport={{ exporting: true, error: null, success: null }}
      />
    )
    expect(screen.getByTestId('partner-trips-export-csv-download')).toBeDisabled()
    expect(screen.getByTestId('partner-trips-export-csv-download-all')).toBeDisabled()
  })

  it('mostra sucesso', () => {
    render(
      <PartnerTripsExportScreen
        onDownloadCsv={vi.fn()}
        onDownloadAllCsv={vi.fn()}
        filteredCount={1}
        totalCount={1}
        csvExport={{ exporting: false, error: null, success: 'CSV descarregado.' }}
      />
    )
    expect(screen.getByTestId('partner-trips-export-csv-success')).toHaveTextContent(
      /csv descarregado/i
    )
  })

  it('chama onDownloadCsv no click', () => {
    const onDownloadCsv = vi.fn()
    render(
      <PartnerTripsExportScreen
        onDownloadCsv={onDownloadCsv}
        onDownloadAllCsv={vi.fn()}
        filteredCount={1}
        totalCount={1}
        csvExport={{ exporting: false, error: null, success: null }}
      />
    )
    fireEvent.click(screen.getByTestId('partner-trips-export-csv-download'))
    expect(onDownloadCsv).toHaveBeenCalledTimes(1)
  })
})
