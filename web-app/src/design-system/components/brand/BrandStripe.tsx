/**
 * BrandStripe — barra fina horizontal com 3 segmentos de acento bandeira PT.
 *
 * Proporção 35 / 5 / 60 (verde · amarelo · vermelho), alinhada ao guião de produto
 * (faixa verde à esquerda, faixa amarela estreita ao centro, vermelho dominante à direita).
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
      <span style={{ flex: '35', backgroundColor: 'hsl(var(--color-primary))' }} />
      <span style={{ flex: '5', backgroundColor: 'hsl(var(--color-flag-yellow, 42 100% 54%))' }} />
      <span style={{ flex: '60', backgroundColor: 'hsl(var(--color-flag-red, 355 75% 48%))' }} />
    </div>
  )
}
