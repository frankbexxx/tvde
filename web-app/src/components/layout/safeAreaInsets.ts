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
