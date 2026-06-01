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
export const MAP_BOTTOM_SHEET = `pointer-events-auto mt-auto w-full shrink-0 overflow-hidden ${SURFACE_RADIUS} border border-[hsl(var(--color-chrome-sheet-border))] bg-[hsl(var(--color-chrome-sheet-bg))] shadow-[var(--shadow-chrome-sheet)]`

/** Sheet sizing — compacto obrigatório (Frank). */
export const MAP_SHEET_MAX_H_IDLE = 'max-h-[min(38dvh,280px)]'
export const MAP_SHEET_MAX_H_TRIP = 'max-h-[min(28dvh,220px)]'
export const MAP_SHEET_MAX_H_WAIT = 'max-h-[min(14dvh,100px)]'
export const MAP_SHEET_MAX_H_OFFER = 'max-h-[min(28dvh,220px)]'
export const MAP_SHEET_PADDING = 'px-2 py-1.5'
export const MAP_SHEET_GAP = 'space-y-1.5'
export const MAP_SHEET_CLASS = `${MAP_SHEET_PADDING} ${MAP_SHEET_GAP} overflow-y-auto`

/** Stack de avisos no topo do mapa — não comer o palco. */
export const MAP_BANNER_STACK =
  'pointer-events-auto min-h-0 max-h-[min(12dvh,80px)] shrink-0 overflow-y-auto overscroll-contain space-y-1 pr-1'

export const MAP_WARNING_BANNER = `${BTN_SECONDARY_RADIUS} bg-warning/20 border border-warning/50 border-l-4 px-2 py-1.5 text-xs text-warning`

/** Motorista — aceitar oferta / viagem activa. */
export const INFO_BOX_DRIVER_LARGE = `${SURFACE_RADIUS} ${BORDER_SURFACE} border-l-4 border-l-info bg-[hsl(var(--color-chrome-sheet-bg))] ${SHADOW_CARD}`

/** Motorista — resumo em viagem compacto. */
export const INFO_BOX_DRIVER_COMPACT = `${SURFACE_RADIUS} ${BORDER_SURFACE} border-l-4 border-l-info bg-[hsl(var(--color-chrome-sheet-bg)/0.95)] ${SHADOW_SURFACE}`

/** Passageiro — moldura (barra lateral vem do `tone` em InfoPanel). */
export const INFO_BOX_PASSENGER = `${SURFACE_RADIUS} ${BORDER_SURFACE} bg-[hsl(var(--color-chrome-sheet-bg))] ${SHADOW_SURFACE}`

/** Pré-visualização recolha/destino dentro da sheet. */
export const INFO_BOX_PREVIEW = `${SURFACE_RADIUS} ${BORDER_SURFACE} bg-[hsl(var(--color-chrome-panel-bg))] p-2 ${MAP_SHEET_GAP}`

/** Aviso compacto sobre mapa (ex.: à espera de viagens). */
export const INFO_BOX_MAP_HINT = `${BTN_SECONDARY_RADIUS} border border-border/60 bg-muted/15`

/** Título / corpo — default e compacto. */
export const INFO_BOX_TITLE_SM = 'text-base font-semibold leading-snug'
export const INFO_BOX_TITLE_LG = 'text-lg font-semibold leading-snug'
export const INFO_BOX_TITLE_COMPACT = 'text-sm font-semibold leading-snug'
export const INFO_BOX_BODY_SM = 'text-sm text-foreground/80 leading-snug'
export const INFO_BOX_BODY_COMPACT = 'text-xs text-foreground/80 leading-snug'

export const BTN_COMPACT_HEIGHT = 'min-h-9 h-9'

/** Elementos aninhados dentro de caixas (chips, dismiss, list items). */
export const INNER_RADIUS = 'rounded-lg'

/** Lista step1 motorista — compacta, não comer mapa. */
export const MAP_STEP1_LIST = `max-h-[min(28dvh,220px)] overflow-y-auto overscroll-contain ${BTN_SECONDARY_RADIUS} border border-[hsl(var(--color-chrome-sheet-border))] bg-[hsl(var(--color-chrome-sheet-bg))] px-2 py-2 shadow-sm`

export const MAP_HINT_WARNING_SM = `${BTN_SECONDARY_RADIUS} bg-warning/15 border border-warning/40 px-2 py-1.5 text-xs text-foreground`
export const MAP_HINT_WARNING = `${BTN_SECONDARY_RADIUS} bg-warning/15 border border-warning/40 px-3 py-2 text-sm text-foreground`

export const MAP_TOAST_WARNING = `relative ${BTN_SECONDARY_RADIUS} bg-warning/30 border border-warning/50 px-3 py-2 pr-12 text-warning text-sm animate-toast-enter touch-manipulation`
export const MAP_TOAST_ERROR = `relative ${BTN_SECONDARY_RADIUS} bg-destructive/10 border border-destructive/30 border-l-4 border-l-destructive px-3 py-2 pr-12 text-destructive text-sm touch-manipulation`

export const MAP_DISMISS_BTN_WARNING = `absolute right-2 top-2 min-h-9 min-w-9 inline-flex items-center justify-center ${INNER_RADIUS} border border-warning/50 bg-background/80 text-warning text-xl font-medium leading-none hover:bg-background touch-manipulation`
export const MAP_DISMISS_BTN_ERROR = `absolute right-2 top-2 min-h-9 min-w-9 inline-flex items-center justify-center ${INNER_RADIUS} border border-destructive/40 bg-background/80 text-destructive text-xl font-medium leading-none hover:bg-background touch-manipulation`

export const MAP_CHIP_OVERLAY = `${INNER_RADIUS} border border-[hsl(var(--color-chrome-chip-border))] bg-[hsl(var(--color-chrome-chip-bg)/0.92)] px-2 py-1.5 text-[11px] text-foreground/75 shadow-sm backdrop-blur-sm`
export const MAP_CHIP_OVERLAY_FLAT = `${INNER_RADIUS} border border-[hsl(var(--color-chrome-chip-border))] bg-[hsl(var(--color-chrome-chip-bg)/0.88)] px-2 py-1.5 text-[11px] text-foreground/75`

export const INFO_BOX_DRIVER_MENU = `${SURFACE_RADIUS} border border-[hsl(var(--color-chrome-sheet-border))] bg-[hsl(var(--color-chrome-panel-bg))] p-4 shadow-card`
export const MAP_CARD_FRAME = `relative overflow-hidden ${SURFACE_RADIUS} border border-[hsl(var(--color-chrome-sheet-border))] bg-[hsl(var(--color-chrome-sheet-bg))] shadow-card`
export const MAP_IDLE_PLACEHOLDER = `flex flex-col items-center justify-center gap-2 ${BTN_SECONDARY_RADIUS} border border-border bg-muted/20 py-3`
export const MAP_EMPTY_STATE = `py-8 text-center ${BTN_SECONDARY_RADIUS} border border-border`

export const BTN_DRIVER_STEP1 = `relative w-full ${BTN_COMPACT_HEIGHT} ${BTN_SECONDARY_RADIUS} bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 touch-manipulation`
export const BTN_SECONDARY_SM = `min-h-9 ${BTN_SECONDARY_RADIUS} border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted/50 touch-manipulation`
export const BTN_SECONDARY_MD = `min-h-9 shrink-0 ${BTN_SECONDARY_RADIUS} border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted/50 touch-manipulation`
export const BTN_SECONDARY_FULL_SM = `min-h-9 w-full ${BTN_SECONDARY_RADIUS} border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted/50 touch-manipulation`

export const MENU_PANEL = `${BTN_SECONDARY_RADIUS} border border-border bg-background px-3 py-3 space-y-2`
export const MENU_CARD = `${INNER_RADIUS} border border-border/70 bg-card px-3 py-2`
export const MENU_BTN = `min-h-9 w-full ${INNER_RADIUS} border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/50 touch-manipulation`
export const MENU_BTN_SM = `min-h-9 ${INNER_RADIUS} border border-border bg-background px-2 text-xs font-semibold text-foreground hover:bg-muted/50 touch-manipulation`
export const MENU_SURFACE = `${SURFACE_RADIUS} border border-border bg-gradient-to-b from-[hsl(var(--color-chrome-menu-gradient-from)/0.14)] to-transparent px-4 py-4`
export const MENU_ROW_BTN = `w-full min-h-9 ${BTN_SECONDARY_RADIUS} border border-border bg-card px-4 text-left text-sm font-semibold text-foreground hover:bg-[hsl(var(--color-chrome-menu-row-hover))] touch-manipulation flex items-center gap-3`

/** Partner — KPI tile (dashboard). */
export const PARTNER_KPI_CARD = `${BTN_SECONDARY_RADIUS} border border-[hsl(var(--color-chrome-sheet-border))] bg-[hsl(var(--color-chrome-panel-bg))] p-3 shadow-sm`

/** Partner — hub entry card (ícone + título + subtítulo). */
export const PARTNER_HUB_CARD = `w-full min-h-[56px] ${BTN_SECONDARY_RADIUS} border border-[hsl(var(--color-chrome-sheet-border))] bg-[hsl(var(--color-chrome-panel-bg))] px-4 py-3 text-left hover:bg-[hsl(var(--color-chrome-menu-row-hover))] touch-manipulation flex items-center gap-3 shadow-sm transition-colors`

export const PARTNER_SECTION_TITLE = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

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
