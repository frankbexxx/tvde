import { PARTNER_SECTION_TITLE } from '../../../components/layout/infoBoxTemplate'

type PartnerListSearchProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  testId?: string
}

/** NAV-P-02 B1: pesquisa só em ecrãs de lista (frota / viagens), não no home KPIs. */
export function PartnerListSearch({
  value,
  onChange,
  placeholder = 'Nome, telefone ou ID viagem',
  testId = 'partner-list-search',
}: PartnerListSearchProps) {
  return (
    <section className="space-y-2">
      <p className={PARTNER_SECTION_TITLE}>Filtrar lista</p>
      <label className="sr-only" htmlFor={testId}>
        Filtrar lista
      </label>
      <input
        id={testId}
        type="search"
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl border border-[hsl(var(--color-chrome-sheet-border))] bg-[hsl(var(--color-chrome-panel-bg))] text-foreground text-sm"
      />
    </section>
  )
}
