import { List, MapPin, UserPlus } from 'lucide-react'
import type { PartnerMetrics } from '../../../api/partner'
import {
  PARTNER_HUB_CARD,
  PARTNER_KPI_CARD,
  PARTNER_SECTION_TITLE,
} from '../../../components/layout/infoBoxTemplate'

type PartnerFleetHubScreenProps = {
  metrics: PartnerMetrics | null
  onNavigate: (screen: 'fleet_list' | 'fleet_map' | 'fleet_add') => void
}

const FLEET_HUB_ITEMS = [
  {
    id: 'fleet_list' as const,
    testId: 'partner-fleet-hub-list',
    icon: List,
    title: 'Lista motoristas',
    subtitle: 'Frota completa, filtros e detalhe',
  },
  {
    id: 'fleet_map' as const,
    testId: 'partner-fleet-hub-map',
    icon: MapPin,
    title: 'Mapa live',
    subtitle: 'Posição GPS recente na frota',
  },
  {
    id: 'fleet_add' as const,
    testId: 'partner-fleet-hub-add',
    icon: UserPlus,
    title: 'Adicionar à frota',
    subtitle: 'Descobrir e associar motorista',
  },
]

export function PartnerFleetHubScreen({ metrics, onNavigate }: PartnerFleetHubScreenProps) {
  return (
    <div className="space-y-4 text-sm text-foreground" data-testid="partner-fleet-hub">
      {metrics ? (
        <section className="space-y-2">
          <p className={PARTNER_SECTION_TITLE}>Frota agora</p>
          <div className="grid grid-cols-2 gap-2">
            <div className={PARTNER_KPI_CARD}>
              <p className="text-[11px] text-muted-foreground">Motoristas (total)</p>
              <p className="text-lg font-semibold tabular-nums">{metrics.total_drivers}</p>
            </div>
            <div className={PARTNER_KPI_CARD}>
              <p className="text-[11px] text-muted-foreground">Com GPS recente</p>
              <p className="text-lg font-semibold tabular-nums">{metrics.active_drivers}</p>
            </div>
          </div>
        </section>
      ) : null}
      <section className="space-y-2">
        <p className={PARTNER_SECTION_TITLE}>Acções</p>
        {FLEET_HUB_ITEMS.map(({ id, testId, icon: Icon, title, subtitle }) => (
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
      </section>
    </div>
  )
}
