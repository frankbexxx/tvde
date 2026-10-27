import { useTranslation } from 'react-i18next'
import { MAP_WARNING_BANNER } from '../../components/layout/infoBoxTemplate'
import type { GpsOfferNoticeState } from './driverGpsOfferNotice'

/** Aviso compacto no topo do mapa. Não cobre os controlos da viagem. */
export function DriverGpsOfferBanner({
  offline,
  notice,
}: {
  offline: boolean
  notice: GpsOfferNoticeState
}) {
  const { t } = useTranslation('driver')
  if (offline) return null

  if (notice.visibleReason) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={MAP_WARNING_BANNER}
        data-testid="driver-gps-offer-notice"
        data-gps-reason={notice.visibleReason}
        data-status-unconfirmed={notice.fetchFailed ? 'true' : 'false'}
      >
        {t('mapHome.gpsOfferUnavailable')}
      </div>
    )
  }

  if (notice.fetchFailed) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={MAP_WARNING_BANNER}
        data-testid="driver-gps-offer-status-unknown"
      >
        {t('mapHome.gpsOfferStatusUnknown')}
      </div>
    )
  }

  return null
}
