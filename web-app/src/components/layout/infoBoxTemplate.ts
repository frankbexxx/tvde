/**
 * Receita visual única (dia 23) — cantos, bordas, sombras e densidade compacta.
 * cantos caixa = rounded-2xl · sec = rounded-xl · CTA = rounded-full
 */

export const SURFACE_RADIUS = 'rounded-2xl'
export const BTN_SECONDARY_RADIUS = 'rounded-xl'
export const BTN_PRIMARY_RADIUS = 'rounded-full'

export const BORDER_SURFACE = 'border border-border/80'
export const SHADOW_SURFACE = 'shadow-sm'
export const SHADOW_CARD = 'shadow-card'

/** Painel inferior sobre mapa — mapa full-bleed por trás. */
export const MAP_BOTTOM_SHEET = `pointer-events-auto mt-auto w-full shrink-0 overflow-hidden ${SURFACE_RADIUS} border border-border bg-background shadow-[0_-8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.35)]`

/** Sheet sizing — compacto obrigatório (Frank). */
export const MAP_SHEET_MAX_H_IDLE = 'max-h-[min(38dvh,280px)]'
export const MAP_SHEET_MAX_H_TRIP = 'max-h-[min(32dvh,240px)]'
export const MAP_SHEET_MAX_H_WAIT = 'max-h-[min(14dvh,100px)]'
export const MAP_SHEET_MAX_H_OFFER = 'max-h-[min(38dvh,280px)]'
export const MAP_SHEET_PADDING = 'px-2 py-1.5'
export const MAP_SHEET_GAP = 'space-y-1.5'
export const MAP_SHEET_CLASS = `${MAP_SHEET_PADDING} ${MAP_SHEET_GAP} overflow-y-auto`

/** Stack de avisos no topo do mapa — não comer o palco. */
export const MAP_BANNER_STACK =
  'pointer-events-auto min-h-0 max-h-[min(12dvh,80px)] shrink-0 overflow-y-auto overscroll-contain space-y-1 pr-1'

export const MAP_WARNING_BANNER = `${BTN_SECONDARY_RADIUS} bg-warning/20 border border-warning/50 border-l-4 px-2 py-1.5 text-xs text-warning`

/** Motorista — aceitar oferta / viagem activa. */
export const INFO_BOX_DRIVER_LARGE = `${SURFACE_RADIUS} ${BORDER_SURFACE} border-l-4 border-l-info bg-card ${SHADOW_CARD}`

/** Motorista — resumo em viagem compacto. */
export const INFO_BOX_DRIVER_COMPACT = `${SURFACE_RADIUS} ${BORDER_SURFACE} border-l-4 border-l-info bg-card/95 ${SHADOW_SURFACE}`

/** Passageiro — moldura (barra lateral vem do `tone` em InfoPanel). */
export const INFO_BOX_PASSENGER = `${SURFACE_RADIUS} ${BORDER_SURFACE} bg-card ${SHADOW_SURFACE}`

/** Pré-visualização recolha/destino dentro da sheet. */
export const INFO_BOX_PREVIEW = `${SURFACE_RADIUS} ${BORDER_SURFACE} bg-card p-2 ${MAP_SHEET_GAP}`

/** Aviso compacto sobre mapa (ex.: à espera de viagens). */
export const INFO_BOX_MAP_HINT = `${BTN_SECONDARY_RADIUS} border border-border/60 bg-muted/15`

/** Título / corpo — default e compacto. */
export const INFO_BOX_TITLE_SM = 'text-base font-semibold leading-snug'
export const INFO_BOX_TITLE_LG = 'text-lg font-semibold leading-snug'
export const INFO_BOX_TITLE_COMPACT = 'text-sm font-semibold leading-snug'
export const INFO_BOX_BODY_SM = 'text-sm text-foreground/80 leading-snug'
export const INFO_BOX_BODY_COMPACT = 'text-xs text-foreground/80 leading-snug'

export const BTN_COMPACT_HEIGHT = 'min-h-9 h-9'

/** Botão secundário (Voltar, Alterar, fechar). */
export const BTN_SECONDARY =
  `${BTN_COMPACT_HEIGHT} ${BTN_SECONDARY_RADIUS} border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-muted/50 disabled:opacity-50 touch-manipulation transition-colors`

/** Botão primário compacto inline (confirmar recolha, etc.). */
export const BTN_PRIMARY_COMPACT =
  `flex-1 ${BTN_COMPACT_HEIGHT} ${BTN_PRIMARY_RADIUS} bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 transition-opacity touch-manipulation`

/** Botão cancelar outline (dentro da caixa, lado a lado). */
export const BTN_DANGER_OUTLINE =
  `flex-1 min-w-0 ${BTN_COMPACT_HEIGHT} ${BTN_PRIMARY_RADIUS} border-2 border-destructive/70 bg-transparent text-destructive text-sm font-semibold hover:bg-destructive/10 disabled:border-border disabled:bg-muted/50 disabled:text-muted-foreground touch-manipulation`

/** Botão confirmar compacto dentro da caixa (verde outline em viagem). */
export const BTN_SUCCESS_OUTLINE =
  `flex-1 min-w-0 ${BTN_COMPACT_HEIGHT} ${BTN_PRIMARY_RADIUS} border-2 border-success/55 bg-success/10 text-success text-sm font-semibold hover:bg-success/15 disabled:opacity-50 touch-manipulation`
