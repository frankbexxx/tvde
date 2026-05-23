/**
 * Receita visual única (dia 23) — cantos, bordas e sombras partilhados.
 * Cantos caixas = rounded-2xl · botões secundários = rounded-xl · CTA pill = rounded-full
 */

export const SURFACE_RADIUS = 'rounded-2xl'
export const BTN_SECONDARY_RADIUS = 'rounded-xl'
export const BTN_PRIMARY_RADIUS = 'rounded-full'

export const BORDER_SURFACE = 'border border-border/80'
export const SHADOW_SURFACE = 'shadow-sm'
export const SHADOW_CARD = 'shadow-card'

/** Painel inferior sobre mapa — sem scroll no conteúdo curto. */
export const MAP_BOTTOM_SHEET = `pointer-events-auto mt-auto w-full shrink-0 overflow-hidden ${SURFACE_RADIUS} border border-border bg-background shadow-[0_-8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.35)]`

/** Motorista — aceitar oferta / viagem activa. */
export const INFO_BOX_DRIVER_LARGE = `${SURFACE_RADIUS} ${BORDER_SURFACE} border-l-4 border-l-info bg-card ${SHADOW_CARD}`

/** Motorista — resumo em viagem compacto. */
export const INFO_BOX_DRIVER_COMPACT = `${SURFACE_RADIUS} ${BORDER_SURFACE} border-l-4 border-l-info bg-card/95 ${SHADOW_SURFACE}`

/** Passageiro — moldura (barra lateral vem do `tone` em InfoPanel). */
export const INFO_BOX_PASSENGER = `${SURFACE_RADIUS} ${BORDER_SURFACE} bg-card ${SHADOW_SURFACE}`

/** Aviso compacto sobre mapa (ex.: à espera de viagens). */
export const INFO_BOX_MAP_HINT = `${BTN_SECONDARY_RADIUS} border border-border/60 bg-muted/15`

/** Título / corpo compactos (passageiro). */
export const INFO_BOX_TITLE_SM = 'text-base font-semibold leading-snug'
export const INFO_BOX_TITLE_LG = 'text-lg font-semibold leading-snug'
export const INFO_BOX_BODY_SM = 'text-sm text-foreground/80 leading-snug'

/** Botão secundário (Voltar, Alterar, fechar). */
export const BTN_SECONDARY =
  `min-h-10 ${BTN_SECONDARY_RADIUS} border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted/50 disabled:opacity-50 touch-manipulation transition-colors`

/** Botão cancelar outline (dentro da caixa, lado a lado). */
export const BTN_DANGER_OUTLINE =
  `flex-1 min-w-0 min-h-10 h-10 ${BTN_PRIMARY_RADIUS} border-2 border-destructive/70 bg-transparent text-destructive text-sm font-semibold hover:bg-destructive/10 disabled:border-border disabled:bg-muted/50 disabled:text-muted-foreground touch-manipulation`

/** Botão confirmar compacto dentro da caixa (verde outline em viagem). */
export const BTN_SUCCESS_OUTLINE =
  `flex-1 min-w-0 min-h-10 h-10 ${BTN_PRIMARY_RADIUS} border-2 border-success/55 bg-success/10 text-success text-sm font-semibold hover:bg-success/15 disabled:opacity-50 touch-manipulation`
