type PartnerSettingsMenuScreenProps = {
  onRefresh: () => void
}

export function PartnerSettingsMenuScreen({ onRefresh }: PartnerSettingsMenuScreenProps) {
  return (
    <div className="space-y-4 text-sm text-foreground">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Preferências do gestor de frota. Conta e sessão estão em{' '}
        <span className="font-medium text-foreground/90">Perfil</span> no menu principal.
      </p>
      <p className="text-xs text-muted-foreground">
        Tema e modo de visualização seguem as definições globais da app (ícone no header em rotas
        sem shell compacto).
      </p>
      <button
        type="button"
        onClick={onRefresh}
        className="w-full min-h-11 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation"
      >
        Actualizar vista
      </button>
    </div>
  )
}
