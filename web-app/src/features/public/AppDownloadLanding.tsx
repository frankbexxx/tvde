import { Link } from 'react-router-dom'

/**
 * Ponto de entrada para QR / materiais impressos: mesmo domínio que a app,
 * sem necessidade de `VITE_APP_DOWNLOAD_URL`. `/dl` e `/app` redireccionam para aqui.
 */
export function AppDownloadLanding() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 bg-background px-6 py-10 text-center">
      <div className="max-w-sm space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TVDE</p>
        <h1 className="text-xl font-bold text-foreground leading-snug">Continua na app web</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Usa a app no telemóvel ou no computador para pedir viagens. Se já tens sessão iniciada, vais direto ao painel.
        </p>
      </div>
      <Link
        to="/passenger"
        className="inline-flex min-h-[52px] min-w-[12rem] items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent px-8 text-lg font-bold text-primary-foreground shadow-floating hover:from-primary/95 hover:to-accent/95 transition-all"
      >
        Entrar
      </Link>
      <p className="text-xs text-muted-foreground max-w-xs">
        Quando houver página de download nas lojas, define{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-[10px]">VITE_APP_DOWNLOAD_URL</code> no
        deploy para o QR abrir esse destino.
      </p>
    </div>
  )
}
