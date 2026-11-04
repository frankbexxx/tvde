/**
 * Contrato validado no menu lateral: o maior entre o inset do browser
 * (`env`) e o do Capacitor (`--safe-area-inset-*`). Nunca somar os dois.
 * Fallback 0px no browser, onde ambos são zero.
 */
export const SAFE_AREA_TOP_CLASS =
  'pt-[max(env(safe-area-inset-top,0px),var(--safe-area-inset-top,0px))]'

export const SAFE_AREA_BOTTOM_CLASS =
  'pb-[max(env(safe-area-inset-bottom,0px),var(--safe-area-inset-bottom,0px))]'

/** Classe CSS única do inset inferior. O valor está em index.css e não se soma ao env(). */
export const SAFE_AREA_PB_CLASS = 'safe-area-pb'

/** Altura mínima dos separadores mais o inset de sistema, uma vez. */
export const BOTTOM_NAV_CLEARANCE =
  'calc(52px+max(env(safe-area-inset-bottom,0px),var(--safe-area-inset-bottom,0px)))'

export const PARTNER_CONTENT_CLEARANCE_CLASS = `pb-[${BOTTOM_NAV_CLEARANCE}]`

export const PARTNER_ALERT_OFFSET_CLASS = `bottom-[${BOTTOM_NAV_CLEARANCE}]`

/** Folga de scroll do ecrã com barra fixa, mais o inset de sistema uma vez. */
export const SCREEN_SCROLL_CLEARANCE_CLASS =
  'pb-[calc(10rem+max(env(safe-area-inset-bottom,0px),var(--safe-area-inset-bottom,0px)))]'

export const SCREEN_INSET_SCROLL_CLEARANCE_CLASS =
  'pb-[calc(5rem+max(env(safe-area-inset-bottom,0px),var(--safe-area-inset-bottom,0px)))]'

/**
 * Padding de desenho e inset no mesmo lado: o maior dos dois, nunca a soma.
 * O fallback 0px mantém o desenho quando o browser e o Capacitor reportam zero.
 * O teclado não entra na fórmula: o viewport usa interactive-widget=resizes-content.
 */
export const SAFE_AREA_TOP_WITH_1REM =
  'pt-[max(1rem,env(safe-area-inset-top,0px),var(--safe-area-inset-top,0px))]'

export const SAFE_AREA_BOTTOM_WITH_1REM =
  'pb-[max(1rem,env(safe-area-inset-bottom,0px),var(--safe-area-inset-bottom,0px))]'

export const SAFE_AREA_BOTTOM_WITH_1_5REM =
  'pb-[max(1.5rem,env(safe-area-inset-bottom,0px),var(--safe-area-inset-bottom,0px))]'

/**
 * O sheet já traz p-6. Esta classe tem de aparecer inteira no código: o
 * scanner do Tailwind não gera `!pb-[…]` quando o `!` é concatenado.
 * O !important substitui só o padding-bottom, sem somar os 24 px ao inset.
 */
export const SAFE_AREA_SHEET_BOTTOM_CLASS =
  '!pb-[max(1.5rem,env(safe-area-inset-bottom,0px),var(--safe-area-inset-bottom,0px))]'

export const SAFE_AREA_SCROLL_PB_WITH_4_5REM =
  'scroll-pb-[max(4.5rem,env(safe-area-inset-bottom,0px),var(--safe-area-inset-bottom,0px))]'

/** Fundo do admin, abaixo do header. Sem inset superior: o header já o aplica. */
export const ADMIN_PAGE_CLASS = `mx-auto max-w-2xl px-4 pt-4 ${SAFE_AREA_BOTTOM_WITH_1REM}`
