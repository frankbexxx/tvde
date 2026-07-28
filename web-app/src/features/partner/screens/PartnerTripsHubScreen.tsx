import { BarChart3, Download, List } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  PARTNER_HUB_CARD,
  PARTNER_SECTION_TITLE,
} from '../../../components/layout/infoBoxTemplate'

type PartnerTripsHubScreenProps = {
  onNavigate: (screen: 'trips_summary' | 'trips_list' | 'trips_export') => void
}

export function PartnerTripsHubScreen({ onNavigate }: PartnerTripsHubScreenProps) {
  const { t } = useTranslation('partner')

  const tripsHubItems = [
    {
      id: 'trips_summary' as const,
      testId: 'partner-trips-hub-summary',
      icon: BarChart3,
      title: t('trips.hub.summaryTitle'),
      subtitle: t('trips.hub.summarySubtitle'),
    },
    {
      id: 'trips_list' as const,
      testId: 'partner-trips-hub-list',
      icon: List,
      title: t('trips.hub.listTitle'),
      subtitle: t('trips.hub.listSubtitle'),
    },
    {
      id: 'trips_export' as const,
      testId: 'partner-trips-hub-export',
      icon: Download,
      title: t('trips.hub.exportTitle'),
      subtitle: t('trips.hub.exportSubtitle'),
    },
  ]

  return (
    <div className="space-y-2 text-sm text-foreground" data-testid="partner-trips-hub">
      <p className={PARTNER_SECTION_TITLE}>{t('trips.hubTitle')}</p>
      {tripsHubItems.map(({ id, testId, icon: Icon, title, subtitle }) => (
        <button
          key={id}
          type="button"
          data-testid={testId}
          onClick={() => onNavigate(id)}
          className={PARTNER_HUB_CARD}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">{title}</span>
            <span className="block text-xs text-muted-foreground truncate">{subtitle}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
