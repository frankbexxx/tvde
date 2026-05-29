import { useAuth } from '../../../context/AuthContext'
import { BetaAccountPanel } from '../../account/BetaAccountPanel'

export function PartnerProfileScreen() {
  const { sessionDisplayName, sessionPhone } = useAuth()

  return (
    <div className="space-y-4 text-sm text-foreground" data-testid="partner-menu-profile-screen">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Conta e preferências do gestor de frota (modo BETA).
      </p>
      <div className="rounded-xl border border-border bg-background px-3 py-3 space-y-1 text-xs">
        <p className="font-medium text-foreground">{sessionDisplayName ?? 'Gestor frota'}</p>
        <p className="text-muted-foreground">{sessionPhone ?? 'Telefone não disponível'}</p>
      </div>
      <BetaAccountPanel />
    </div>
  )
}
