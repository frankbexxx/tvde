/**
 * Receita visual InfoBox (smoke dia 22 / TW-05).
 * Moldura exterior com cantos arredondados; interior com barra azul à esquerda.
 */

/** Painel inferior sobre mapa — sem scroll no conteúdo curto. */
export const MAP_BOTTOM_SHEET =
  'pointer-events-auto mt-auto w-full shrink-0 overflow-hidden rounded-2xl border border-border bg-background shadow-[0_-8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.35)]'

/** Motorista — aceitar oferta (referência TVDE_6). */
export const INFO_BOX_DRIVER_LARGE =
  'rounded-2xl border border-border/80 border-l-4 border-l-info bg-card shadow-card'

/** Motorista — resumo em viagem compacto. */
export const INFO_BOX_DRIVER_COMPACT =
  'rounded-2xl border border-border/80 border-l-4 border-l-info bg-card/95 shadow-sm'

/** Passageiro — moldura (barra lateral vem do `tone` em InfoPanel). */
export const INFO_BOX_PASSENGER = 'rounded-2xl border border-border/80 bg-card shadow-sm'

/** Título / corpo compactos (passageiro). */
export const INFO_BOX_TITLE_SM = 'text-base font-semibold leading-snug'
export const INFO_BOX_TITLE_LG = 'text-lg font-semibold leading-snug'
export const INFO_BOX_BODY_SM = 'text-sm text-foreground/80 leading-snug'
