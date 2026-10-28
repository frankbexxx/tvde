import { createRoot } from 'react-dom/client'
import '@/index.css'
import '@/i18n'
import { PrimaryActionButton } from '@/components/layout/PrimaryActionButton'
import { MAP_BANNER_STACK, MAP_BOTTOM_SHEET } from '@/components/layout/infoBoxTemplate'
import { DriverGpsOfferBanner } from '@/features/driver/DriverGpsOfferBanner'
import {
  INITIAL_GPS_OFFER_NOTICE,
  reduceGpsOfferNotice,
} from '@/features/driver/driverGpsOfferNotice'

const stale = {
  is_available: true,
  matching_eligible: false,
  gps_fix_age_seconds: 70,
  location_stale_for_matching: true,
  matching_ineligible_reason: 'location_stale',
} as const

const recovered = {
  is_available: true,
  matching_eligible: true,
  gps_fix_age_seconds: 2,
  location_stale_for_matching: false,
  matching_ineligible_reason: null,
} as const

const mode = new URLSearchParams(window.location.search).get('mode')
const afterStale = reduceGpsOfferNotice(INITIAL_GPS_OFFER_NOTICE, {
  type: 'status',
  status: stale,
})
const notice =
  mode === 'recovered'
    ? reduceGpsOfferNotice(afterStale, { type: 'status', status: recovered })
    : afterStale

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <div className="flex h-dvh w-full flex-col bg-muted/40 text-foreground">
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 flex flex-col p-2">
          <div className={MAP_BANNER_STACK}>
            <DriverGpsOfferBanner offline={false} notice={notice} />
          </div>
          <div className={`${MAP_BOTTOM_SHEET} p-3`} data-testid="driver-trip-controls">
            <p className="text-xs font-medium">Viagem activa</p>
            <div className="mt-2 flex gap-2">
              <PrimaryActionButton variant="confirm" size="compact" className="flex-1" onClick={() => undefined}>
                Cheguei
              </PrimaryActionButton>
              <PrimaryActionButton variant="confirm" size="compact" className="flex-1" onClick={() => undefined}>
                Iniciar viagem
              </PrimaryActionButton>
            </div>
          </div>
        </div>
      </div>
    </div>,
  )
}
