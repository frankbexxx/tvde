import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../../i18n'
import i18n from '../../i18n'
import { DriverDocumentRejectionLine } from './DriverDocumentRejectionLine'

describe('DriverDocumentRejectionLine', () => {
  it('mostra o motivo público e omite a nota interna', async () => {
    await i18n.changeLanguage('pt')
    render(
      <DriverDocumentRejectionLine
        status="rejected"
        publicReason="Documento ilegível"
        testId="driver-doc-rejection-carta_tvde"
      />,
    )
    const line = screen.getByTestId('driver-doc-rejection-carta_tvde')
    expect(line).toHaveTextContent('Documento recusado')
    expect(line).toHaveTextContent('Motivo: Documento ilegível')
    expect(line).not.toHaveTextContent('nota-so-da-equipa')
  })

  it('usa o fallback quando o motivo público falta', async () => {
    await i18n.changeLanguage('pt')
    render(
      <DriverDocumentRejectionLine
        status="rejected"
        publicReason="  "
        testId="driver-doc-rejection-empty"
      />,
    )
    expect(screen.getByTestId('driver-doc-rejection-empty')).toHaveTextContent(
      'Documento recusado. Revê o documento e envia novamente.',
    )
  })

  it('não mostra rejeição noutro estado', () => {
    render(
      <DriverDocumentRejectionLine
        status="approved"
        publicReason="Documento ilegível"
        testId="driver-doc-rejection-approved"
      />,
    )
    expect(screen.queryByTestId('driver-doc-rejection-approved')).not.toBeInTheDocument()
  })
})
