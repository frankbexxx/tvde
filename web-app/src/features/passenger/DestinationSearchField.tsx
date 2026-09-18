import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import type { GeocodeSuggestion } from '@/services/geocoding'
import { BTN_SECONDARY_RADIUS } from '../../components/layout/infoBoxTemplate'

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
  label,
  placeholder,
  disabled,
  geocodingUnavailable,
  onDismissSuggestions,
}: DestinationSearchFieldProps) {
  const { t } = useTranslation('passenger')
  const resolvedLabel = label ?? t('search.destinationLabel')
  const resolvedPlaceholder = placeholder ?? t('search.destinationPlaceholder')
  const id = useId()
  const listId = `${id}-list`
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!suggestions.length || !onDismissSuggestions) return
    const fn = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onDismissSuggestions()
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [suggestions.length, onDismissSuggestions])

  const showList = !disabled && suggestions.length > 0 && query.trim().length >= 2

  // Cap suggestion list when the visual viewport shrinks (mobile keyboard).
  useEffect(() => {
    const el = wrapRef.current
    if (!el || !showList) {
      el?.style.removeProperty('--dest-suggest-max-h')
      return
    }
    const apply = () => {
      const vv = window.visualViewport
      const vh = vv?.height ?? window.innerHeight
      // Leave room for field + CTA below inside the map sheet.
      const capped = Math.max(96, Math.min(176, Math.round(vh * 0.28)))
      el.style.setProperty('--dest-suggest-max-h', `${capped}px`)
    }
    apply()
    const vv = window.visualViewport
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)
    return () => {
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
      el.style.removeProperty('--dest-suggest-max-h')
    }
  }, [showList])

  const ensureFieldVisible = () => {
    requestAnimationFrame(() => {
      wrapRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      const sheet = wrapRef.current?.closest('[data-testid="map-bottom-sheet"]')
      if (sheet instanceof HTMLElement) {
        // Keep search near the top of the sheet so CTA under the list stays scrollable.
        sheet.scrollTop = Math.max(0, sheet.scrollTop - 8)
      }
    })
  }

  return (
    <div ref={wrapRef} className="relative space-y-1.5">
      <label htmlFor={id} className="sr-only">
        {resolvedLabel}
      </label>
      <Input
        ref={inputRef}
        id={id}
        type="search"
        autoComplete="off"
        enterKeyHint="search"
        placeholder={resolvedPlaceholder}
        value={query}
        disabled={disabled}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={ensureFieldVisible}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        // text-base (>=16px) evita zoom iOS/Android; não sobrescrever com text-sm.
        className={`h-10 ${BTN_SECONDARY_RADIUS} border-border bg-background text-base`}
      />
      {geocodingUnavailable ? (
        <p className="text-xs text-muted-foreground leading-snug">
          {t('search.geocodingUnavailable')}
        </p>
      ) : null}
      {loading && query.trim().length >= 2 ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {t('search.searching')}
        </p>
      ) : null}
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          data-testid="destination-suggestions"
          className={`absolute z-30 top-full left-0 right-0 mt-1 overflow-y-auto overscroll-contain ${BTN_SECONDARY_RADIUS} border border-border bg-popover text-popover-foreground shadow-lg py-1 max-h-[min(11rem,var(--dest-suggest-max-h,28dvh))]`}
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
