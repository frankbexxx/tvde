import { useTranslation } from 'react-i18next'
import type { PartnerDriverDiscoveryItem } from '../../../api/partner'

type PartnerFleetDiscoverSectionProps = {
  discoverQuery: string
  onDiscoverQueryChange: (value: string) => void
  discoverLoading: boolean
  discoverRows: PartnerDriverDiscoveryItem[]
  discoverSearched: boolean
  discoverAlreadyInFleet: boolean
  onSearch: () => void
  onAddToFleet: (userId: string) => void
}

export function PartnerFleetDiscoverSection({
  discoverQuery,
  onDiscoverQueryChange,
  discoverLoading,
  discoverRows,
  discoverSearched,
  discoverAlreadyInFleet,
  onSearch,
  onAddToFleet,
}: PartnerFleetDiscoverSectionProps) {
  const { t } = useTranslation('partner')

  return (
    <div className="bg-card border border-border rounded-2xl px-4 py-4 shadow-card space-y-3">
      <h3 className="font-medium text-foreground">{t('fleet.discoverTitle')}</h3>
      <p className="text-sm text-foreground/75">
        {t('fleet.discoverSearchHint')}
      </p>
      <div className="flex gap-2">
        <input
          type="search"
          value={discoverQuery}
          onChange={(e) => onDiscoverQueryChange(e.target.value)}
          placeholder={t('fleet.discoverPlaceholder')}
          className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm"
        />
        <button
          type="button"
          onClick={onSearch}
          disabled={discoverLoading || discoverQuery.trim().length < 2}
          className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {discoverLoading ? '…' : t('fleet.search')}
        </button>
      </div>
      {discoverRows.length > 0 ? (
        <ul className="space-y-2">
          {discoverRows.map((r) => (
            <li
              key={r.user_id}
              className="rounded-xl border border-border bg-background/30 p-3 text-sm flex items-start justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{r.name ?? '—'}</p>
                <p className="text-muted-foreground">{r.phone ?? '—'}</p>
              </div>
              <button
                type="button"
                onClick={() => onAddToFleet(r.user_id)}
                className="shrink-0 min-h-11 px-3 rounded-lg bg-card border border-border text-foreground/90 text-xs font-semibold hover:bg-muted/40 touch-manipulation"
              >
                {t('fleet.addToFleet')}
              </button>
            </li>
          ))}
        </ul>
      ) : discoverSearched && discoverAlreadyInFleet ? (
        <p className="text-sm text-muted-foreground">{t('fleet.alreadyInFleet')}</p>
      ) : discoverSearched ? (
        <p className="text-sm text-muted-foreground">
          {t('fleet.discoverHint')}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('fleet.searchHint')}
        </p>
      )}
    </div>
  )
}
