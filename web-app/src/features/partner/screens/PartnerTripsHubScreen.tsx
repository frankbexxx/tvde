import { BarChart3, Download, List } from 'lucide-react'
import {
  PARTNER_HUB_CARD,
  PARTNER_SECTION_TITLE,
} from '../../../components/layout/infoBoxTemplate'

type PartnerTripsHubScreenProps = {
  onNavigate: (screen: 'trips_summary' | 'trips_list' | 'trips_export') => void
}

const TRIPS_HUB_ITEMS = [
  {
    id: 'trips_summary' as const,
    testId: 'partner-trips-hub-summary',
    icon: BarChart3,
    title: 'Resumo',
    subtitle: 'Totais e indicadores de viagens',
  },
  {
    id: 'trips_list' as const,
    testId: 'partner-trips-hub-list',
    icon: List,
    title: 'Lista (filtros)',
    subtitle: 'Pesquisa, estado e intervalo de datas',
  },
  {
    id: 'trips_export' as const,
    testId: 'partner-trips-hub-export',
    icon: Download,
    title: 'Exportar CSV',
    subtitle: 'Descarregar viagens filtradas',
  },
]

export function PartnerTripsHubScreen({ onNavigate }: PartnerTripsHubScreenProps) {
  return (
    <div className="space-y-2 text-sm text-foreground" data-testid="partner-trips-hub">
      <p className={PARTNER_SECTION_TITLE}>Viagens</p>
      {TRIPS_HUB_ITEMS.map(({ id, testId, icon: Icon, title, subtitle }) => (
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
