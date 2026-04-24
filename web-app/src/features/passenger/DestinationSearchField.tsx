import { useEffect, useId, useRef } from 'react'
import { Input } from '@/components/ui/input'
import type { GeocodeSuggestion } from '@/services/geocoding'

export interface DestinationSearchFieldProps {
  query: string
  onQueryChange: (value: string) => void
  suggestions: GeocodeSuggestion[]
  loading: boolean
  onSelect: (s: GeocodeSuggestion) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  /** Sem chave MapTiler — mostrar aviso discreto. */
  geocodingUnavailable?: boolean
  /** Fechar lista ao clicar fora. */
  onDismissSuggestions?: () => void
}

export function DestinationSearchField({
  query,
  onQueryChange,
  suggestions,
  loading,
  onSelect,
  label = 'Destino da viagem',
  placeholder = 'Destino: rua, localidade, código postal…',
  disabled,
  geocodingUnavailable,
  onDismissSuggestions,
}: DestinationSearchFieldProps) {
  const id = useId()
  const listId = `${id}-list`
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!suggestions.length || !onDismissSuggestions) return
    const fn = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onDismissSuggestions()
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [suggestions.length, onDismissSuggestions])

  const showList = !disabled && suggestions.length > 0 && query.trim().length >= 2

  return (
    <div ref={wrapRef} className="relative space-y-1.5">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        id={id}
        type="search"
        autoComplete="off"
        enterKeyHint="search"
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        onChange={(e) => onQueryChange(e.target.value)}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        className="h-11 rounded-xl border-border bg-background text-base"
      />
      {geocodingUnavailable ? (
        <p className="text-xs text-muted-foreground leading-snug">
          Pesquisa por morada requer chave MapTiler. Podes continuar só com o mapa.
        </p>
      ) : null}
      {loading && query.trim().length >= 2 ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          A procurar…
        </p>
      ) : null}
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-lg py-1"
        >
          {suggestions.map((s) => (
            <li key={s.id} role="presentation">
              <button
                type="button"
                role="option"
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => onSelect(s)}
              >
                <span className="font-medium text-foreground block leading-snug">{s.primary}</span>
                {s.secondary ? (
                  <span className="text-xs text-muted-foreground block mt-0.5 leading-snug">
                    {s.secondary}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
