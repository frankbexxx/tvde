/** Official LRE / RAL consumer-rights links (L-25). No embedded browser. */

export const LRE_URL = 'https://www.livroreclamacoes.pt/'
export const CACCL_URL = 'https://www.centroarbitragemlisboa.pt/'
export const CNIACC_URL = 'https://www.cniacc.pt/'
export const CONSUMIDOR_GOV_URL = 'https://www.consumidor.gov.pt/'

type LegalConsumerRightsProps = {
  /** Compact footer for public pages (login / download). */
  compact?: boolean
  className?: string
  /** Test id prefix: passenger | driver | public */
  surface?: 'passenger' | 'driver' | 'public'
}

export function LegalConsumerRights({
  compact = false,
  className = '',
  surface = 'public',
}: LegalConsumerRightsProps) {
  const linkClass =
    'text-primary underline-offset-2 hover:underline break-all'

  if (compact) {
    return (
      <div
        className={`space-y-1.5 text-[0.7rem] text-muted-foreground leading-snug ${className}`}
        data-testid={`legal-consumer-rights-${surface}`}
      >
        <p>
          <a
            href={LRE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            data-testid={`lre-link-${surface}`}
          >
            Livro de Reclamações
          </a>
          {' · '}
          <a
            href={CACCL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            data-testid={`ral-caccl-link-${surface}`}
          >
            CACCL
          </a>
          {' · '}
          <a
            href={CNIACC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            data-testid={`ral-cniacc-link-${surface}`}
          >
            CNIACC
          </a>
        </p>
      </div>
    )
  }

  return (
    <section
      className={`space-y-3 border-t border-border/60 pt-3 ${className}`}
      data-testid={`legal-consumer-rights-${surface}`}
      aria-label="Ajuda e informação legal"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Ajuda / Legal
        </p>
        <p className="text-xs text-muted-foreground leading-snug mb-2">
          Distinto da reclamação interna VAMULÁ («Fazer reclamação» no histórico de
          viagem).
        </p>
        <a
          href={LRE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-sm font-medium ${linkClass}`}
          data-testid={`lre-link-${surface}`}
        >
          Livro de Reclamações (oficial)
        </a>
      </div>

      <div data-testid={`ral-section-${surface}`}>
        <p className="text-xs font-semibold text-foreground mb-1">
          Resolução Alternativa de Litígios
        </p>
        <p className="text-xs text-muted-foreground leading-snug mb-2">
          Em caso de litígio de consumo, o consumidor pode recorrer a uma entidade de
          resolução alternativa de litígios, conforme competência aplicável.
        </p>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">CACCL</span>
            <br />
            Centro de Arbitragem de Conflitos de Consumo de Lisboa
            <br />
            <a
              href={CACCL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
              data-testid={`ral-caccl-link-${surface}`}
            >
              {CACCL_URL}
            </a>
          </li>
          <li>
            <span className="font-medium text-foreground">CNIACC</span>
            <br />
            Centro Nacional de Informação e Arbitragem de Conflitos de Consumo
            <br />
            <a
              href={CNIACC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
              data-testid={`ral-cniacc-link-${surface}`}
            >
              {CNIACC_URL}
            </a>
          </li>
          <li>
            <a
              href={CONSUMIDOR_GOV_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
              data-testid={`ral-consumidor-gov-link-${surface}`}
            >
              Informação ao consumidor (consumidor.gov.pt)
            </a>
          </li>
        </ul>
      </div>
    </section>
  )
}
