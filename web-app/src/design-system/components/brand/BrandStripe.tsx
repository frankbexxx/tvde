/**
 * BrandStripe — barra fina horizontal com 3 segmentos de acento bandeira PT.
 *
 * Proporção 60/30/10:
 *  - 60% verde (cor primária do tema — continua a dominar).
 *  - 30% vermelho bandeira (tempero de identidade).
 *  - 10% amarelo bandeira (tempero final, sinal de calor).
 *
 * As cores vêm de variáveis CSS do tema activo, pelo que o stripe adapta-se
 * automaticamente a qualquer tema (portugal, dev, minimal, neon). No tema
 * minimal, por exemplo, `--color-flag-red` não está definido e o segmento
 * herda fallback transparente (o browser ignora background-color: hsl()
 * com variável em falta). Ver discussão em docs/meta/THEME_REFACTOR_2026-04-20.md.
 *
 * Uso típico: topo de `AppHeaderBar`, topo de cards de autenticação.
 * É um elemento decorativo puro → `aria-hidden=true` por defeito.
 */
interface BrandStripeProps {
  /** Altura em pixels. Default 3 (visível mas muito subtil). */
  heightPx?: number
  className?: string
}

export function BrandStripe({ heightPx = 3, className = '' }: BrandStripeProps) {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      className={`flex w-full overflow-hidden ${className}`}
      style={{ height: `${heightPx}px` }}
    >
      <span style={{ flex: '60', backgroundColor: 'hsl(var(--color-primary))' }} />
      <span style={{ flex: '30', backgroundColor: 'hsl(var(--color-flag-red, 355 75% 48%))' }} />
      <span style={{ flex: '10', backgroundColor: 'hsl(var(--color-flag-yellow, 42 100% 54%))' }} />
    </div>
  )
}
