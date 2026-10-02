import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/** Shows the existing price lines only after the person asks. Does not compute a fare. */
export function PassengerPriceDetails({ children }: { children: ReactNode }) {
  const { t } = useTranslation('passenger')
  const panelId = useId()
  const [open, setOpen] = useState(false)

  return (
    <div data-testid="passenger-price-details">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 items-center justify-center px-3 text-sm font-medium text-foreground underline underline-offset-2 touch-manipulation"
        data-testid="passenger-price-details-toggle"
      >
        {t('priceFormula.detailsToggle')}
      </button>
      <div id={panelId} hidden={!open} data-testid="passenger-price-details-panel">
        {open ? children : null}
      </div>
    </div>
  )
}
