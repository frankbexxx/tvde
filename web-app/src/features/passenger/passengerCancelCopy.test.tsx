import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { humanizeCancelError } from '../../i18n/apiErrors'
import { tripCancelReasonForApi } from '../../constants/tripCancelReasons'
import { PassengerCancelPanel } from './PassengerCancelPanel'
import { passengerCancelNoticeKey } from './passengerCancelCopy'

const NO_FEE = 'Podes cancelar esta viagem sem taxa.'
const PILOT =
  'A regra de cancelamento regista uma taxa de 3,00 €, mas durante o piloto este valor não é cobrado.'

function renderPanel(status: string, onConfirm = vi.fn()) {
  render(
    <PassengerCancelPanel
      status={status}
      presets={[
        { value: '', label: 'Não indicar motivo' },
        { value: 'Alteração de planos', label: 'Alteração de planos' },
      ]}
      preset="Alteração de planos"
      other=""
      cancelling={false}
      onPreset={() => undefined}
      onOther={() => undefined}
      onConfirm={onConfirm}
      onBack={() => undefined}
    />,
  )
  return onConfirm
}

describe('passenger cancellation copy', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt')
  })

  it.each(['requested', 'assigned'] as const)('%s diz que não há taxa e não menciona 3,00 €', (status) => {
    renderPanel(status)
    expect(screen.getByTestId('passenger-cancel-notice')).toHaveTextContent(NO_FEE)
    expect(screen.getByTestId('passenger-cancel-panel').textContent).not.toMatch(/3,00/)
    expect(passengerCancelNoticeKey(status)).toBe('cancelFlow.noFee')
  })

  it.each(['accepted', 'arriving', 'ongoing'] as const)(
    '%s menciona 3,00 € e diz que no piloto não é cobrado',
    (status) => {
      renderPanel(status)
      const notice = screen.getByTestId('passenger-cancel-notice')
      expect(notice).toHaveTextContent(PILOT)
      expect(notice.textContent).toMatch(/3,00 €/)
      expect(notice.textContent).toMatch(/não é cobrado/)
      expect(notice.textContent).not.toMatch(/Serão cobrados|Nunca será|gratuitos/i)
    },
  )

  it('confirmar chama a mesma função com o motivo da API', () => {
    const onConfirm = vi.fn()
    renderPanel('accepted', onConfirm)
    fireEvent.click(screen.getByRole('button', { name: /confirmar cancelamento/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(tripCancelReasonForApi('Alteração de planos', '')).toBe('Alteração de planos')
  })

  it('erro de rede não declara se a viagem foi cancelada ou continua activa', () => {
    const msg = humanizeCancelError({ status: 0, detail: 'timeout' })
    expect(msg).toBe(
      'Não foi possível confirmar o cancelamento. Verifica o estado da viagem antes de tentar novamente.',
    )
    expect(msg).not.toMatch(/foi cancelada|continua activa|cancelada com sucesso/i)
    expect(i18n.t('passenger:cancelFlow.networkError')).toBe(msg)
  })
})
