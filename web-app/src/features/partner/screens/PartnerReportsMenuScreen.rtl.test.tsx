import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PartnerReportsMenuScreen } from './PartnerReportsMenuScreen'

const tripStats = {
  total: 1,
  ongoing: 0,
  completed: 1,
  cancelled: 0,
  failed: 0,
}

describe('PartnerReportsMenuScreen CSV feedback', () => {
  it('mostra erro visível quando o export falha', () => {
    render(
      <PartnerReportsMenuScreen
        metrics={null}
        tripStats={tripStats}
        onDownloadCsv={vi.fn()}
        csvExport={{
          exporting: false,
          error: 'Exportação CSV falhou.',
          success: null,
        }}
      />
    )
    expect(screen.getByTestId('partner-reports-csv-error')).toHaveTextContent(
      'Exportação CSV falhou.'
    )
  })

  it('desactiva o botão e mostra A exportar… enquanto exporta', () => {
    render(
      <PartnerReportsMenuScreen
        metrics={null}
        tripStats={tripStats}
        onDownloadCsv={vi.fn()}
        csvExport={{ exporting: true, error: null, success: null }}
      />
    )
    const btn = screen.getByTestId('partner-reports-csv-download')
    expect(btn).toBeDisabled()
    // Sem i18n init nos RTL: chave ou label PT.
    expect(btn.textContent?.toLowerCase()).toMatch(/exportingcsv|a exportar/)
  })

  it('chama onDownloadCsv no click', () => {
    const onDownloadCsv = vi.fn()
    render(
      <PartnerReportsMenuScreen
        metrics={null}
        tripStats={tripStats}
        onDownloadCsv={onDownloadCsv}
        csvExport={{ exporting: false, error: null, success: null }}
      />
    )
    fireEvent.click(screen.getByTestId('partner-reports-csv-download'))
    expect(onDownloadCsv).toHaveBeenCalledTimes(1)
  })
})
