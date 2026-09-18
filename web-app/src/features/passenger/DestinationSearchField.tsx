import { useEffect, useId, useRef, useState } from 'react'
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
  /**
   * Notifica o shell (map sheet) quando o modo pesquisa está activo
   * (focus + texto / lista) para expandir o painel e esconder o CTA.
   */
  onSearchActiveChange?: (active: boolean) => void
  /**
   * Suggestion already chosen (candidate/location set). Suppresses list +
   * search mode until the user edits the query again.
   */
  selectionCommitted?: boolean
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
  onSearchActiveChange,
  selectionCommitted = false,
}: DestinationSearchFieldProps) {
  const { t } = useTranslation('passenger')
  const resolvedLabel = label ?? t('search.destinationLabel')
  const resolvedPlaceholder = placeholder ?? t('search.destinationPlaceholder')
  const id = useId()
  const listId = `${id}-list`
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  const showList =
    !disabled &&
    !selectionCommitted &&
    suggestions.length > 0 &&
    query.trim().length >= 2
  /** Map mode vs search mode — typing or open suggestions while focused. */
  const searchActive =
    !disabled &&
    !selectionCommitted &&
    focused &&
    (query.trim().length > 0 || showList)

  useEffect(() => {
    onSearchActiveChange?.(searchActive)
  }, [searchActive, onSearchActiveChange])

  useEffect(() => {
    return () => onSearchActiveChange?.(false)
  }, [onSearchActiveChange])

  useEffect(() => {
    if (!suggestions.length || !onDismissSuggestions) return
    const fn = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onDismissSuggestions()
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [suggestions.length, onDismissSuggestions])

  // Expand suggestion list against visual viewport (keyboard-aware).
  useEffect(() => {
    const el = wrapRef.current
    if (!el || !searchActive) {
      el?.style.removeProperty('--dest-suggest-max-h')
      return
    }
    const apply = () => {
      const vv = window.visualViewport
      const vh = vv?.height ?? window.innerHeight
      // Prefer several suggestion rows; CTA may hide while searching.
      const capped = Math.max(160, Math.min(360, Math.round(vh * 0.48)))
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
  }, [searchActive, showList])

  const ensureFieldVisible = () => {
    requestAnimationFrame(() => {
      wrapRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    })
  }

  const handleSelect = (s: GeocodeSuggestion) => {
    onSelect(s)
    setFocused(false)
    inputRef.current?.blur()
    onSearchActiveChange?.(false)
  }

  return (
    <div
      ref={wrapRef}
      className="relative space-y-1.5"
      data-testid="destination-search-field"
      data-search-active={searchActive ? 'true' : 'false'}
    >
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
        onFocus={() => {
          setFocused(true)
          ensureFieldVisible()
        }}
        onBlur={() => {
          // Allow suggestion mousedown to fire before collapsing.
          window.setTimeout(() => setFocused(false), 180)
        }}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        data-testid="destination-search-input"
        // Explicit 16px — Tailwind rem can look <16 on some Android zoom/root setups.
        style={{ fontSize: 16, WebkitTextSizeAdjust: '100%' }}
        className={`h-11 min-h-11 ${BTN_SECONDARY_RADIUS} border-border bg-background text-[16px] leading-normal`}
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
          className={
            searchActive
              ? `relative z-10 w-full overflow-y-auto overscroll-contain ${BTN_SECONDARY_RADIUS} border border-border bg-popover text-popover-foreground shadow-md py-1 max-h-[var(--dest-suggest-max-h,45dvh)]`
              : `absolute z-30 top-full left-0 right-0 mt-1 overflow-y-auto overscroll-contain ${BTN_SECONDARY_RADIUS} border border-border bg-popover text-popover-foreground shadow-lg py-1 max-h-[min(11rem,var(--dest-suggest-max-h,28dvh))]`
          }
        >
          {suggestions.map((s) => (
            <li key={s.id} role="presentation">
              <button
                type="button"
                role="option"
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s)}
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
