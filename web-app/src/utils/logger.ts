const isDev = import.meta.env.DEV

/** Apenas em desenvolvimento — evita ruído em produção. */
export function log(...args: unknown[]): void {
  if (isDev) console.log(...args)
}

/** Preferir a `error` para falhas reais; avisos não críticos só em DEV. */
export function warn(...args: unknown[]): void {
  if (isDev) console.warn(...args)
}

/** Sempre registado (falhas que importam em produção). */
export function error(...args: unknown[]): void {
  console.error(...args)
}
