import { useTheme, THEME_PREFERENCE_AUTO, type ThemePreference } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { AMBIANCE_OPTIONS, ambianceSwatchStyle } from '@/design-system/ambianceMeta'

function SwatchStrip({ swatch }: { swatch: (typeof AMBIANCE_OPTIONS)[0]['swatch'] }) {
  const style = ambianceSwatchStyle(swatch)
  return (
    <div
      className="flex h-8 w-full overflow-hidden rounded-lg border border-border/60"
      style={style}
      aria-hidden
    >
      <span
        className="h-full w-1/4"
        style={{ background: `hsl(${swatch.primary})` }}
      />
      <span
        className="h-full w-1/4 border-x border-[hsl(var(--swatch-sheet-border))]"
        style={{ background: `hsl(${swatch.sheetBg})` }}
      />
      <span
        className="h-full w-1/4"
        style={{ background: `hsl(${swatch.menuGradient} / 0.35)` }}
      />
      <span
        className="h-full w-1/4"
        style={{ background: `hsl(${swatch.sheetBorder})` }}
      />
    </div>
  )
}

function isActive(preference: ThemePreference, id: ThemePreference): boolean {
  return preference === id
}

export function ThemeSelector() {
  const [current, setTheme] = useTheme()

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <button
        type="button"
        data-testid="theme-preference-auto"
        onClick={() => setTheme(THEME_PREFERENCE_AUTO)}
        className={cn(
          'rounded-xl border px-4 py-3 text-left transition-all duration-200',
          'hover:scale-[1.01] active:scale-[0.99]',
          isActive(current, THEME_PREFERENCE_AUTO)
            ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
            : 'border-border bg-card hover:bg-muted/30',
        )}
      >
        <p className="text-sm font-semibold text-foreground">Automático (sistema)</p>
        <p className="mt-1 text-xs text-muted-foreground leading-snug">
          Segue claro/escuro do telemóvel → Portugal (claro) ou Dev (escuro).
        </p>
        {isActive(current, THEME_PREFERENCE_AUTO) ? (
          <p className="mt-2 text-[11px] font-medium text-primary">Activo</p>
        ) : null}
      </button>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {AMBIANCE_OPTIONS.map(({ id, label, description, swatch }) => {
          const active = isActive(current, id)
          return (
            <button
              key={id}
              type="button"
              data-testid={`theme-preference-${id}`}
              onClick={() => setTheme(id)}
              className={cn(
                'rounded-xl border px-3 py-3 text-left transition-all duration-200',
                'hover:scale-[1.01] active:scale-[0.99]',
                active
                  ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
                  : 'border-border bg-card hover:bg-muted/30',
              )}
            >
              <SwatchStrip swatch={swatch} />
              <p className="mt-2 text-sm font-semibold text-foreground">{label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{description}</p>
              {active ? (
                <p className="mt-1.5 text-[11px] font-medium text-primary">Activo</p>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
