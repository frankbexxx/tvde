import { MAP_DISMISS_BTN_ERROR, MAP_HINT_WARNING, MAP_TOAST_ERROR } from '../../components/layout/infoBoxTemplate'

/**
 * O contentor começa abaixo do cabeçalho. O cabeçalho já aplica o inset
 * superior, por isso o aviso não soma a barra de estado outra vez.
 */
export const PASSENGER_MAP_FRAME_CLASS = 'relative flex min-h-0 flex-1 flex-col overflow-hidden'

export function PassengerMapNotices({
  error,
  historyPollFault,
  onDismissError,
}: {
  error: string | null
  historyPollFault: boolean
  onDismissError: () => void
}) {
  if (!error && !historyPollFault) return null
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-2 z-30 mx-3 flex flex-col gap-2"
      data-testid="passenger-map-notices"
    >
      {error ? (
        <div
          className={`pointer-events-auto ${MAP_TOAST_ERROR} pr-14 text-base`}
          data-testid="passenger-error-notice"
        >
          <button
            type="button"
            className={`${MAP_DISMISS_BTN_ERROR} min-h-11 min-w-11`}
            aria-label="Fechar mensagem de erro"
            onClick={onDismissError}
          >
            ×
          </button>
          <p className="leading-snug">{error}</p>
        </div>
      ) : null}
      {historyPollFault ? (
        <div
          className={`pointer-events-auto ${MAP_HINT_WARNING}`}
          data-testid="passenger-history-notice"
        >
          Não foi possível actualizar o histórico. Voltamos a tentar — verifica a ligação se o aviso persistir.
        </div>
      ) : null}
    </div>
  )
}
