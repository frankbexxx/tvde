import { isBackofficeStaffRole } from '../context/authRoles'

export type GuardArea = 'passenger' | 'driver' | 'partner' | 'admin'

/** Destino quando a área não pertence a este papel. `null` significa que a rota abre. */
export function guardRedirect(area: GuardArea, sessionRole: string | undefined): string | null {
  if (area === 'passenger') return null
  if (area === 'driver') {
    if (sessionRole === 'driver') return null
    return homeForRole(sessionRole)
  }
  if (area === 'partner') {
    if (sessionRole === 'partner') return null
    return homeForRole(sessionRole)
  }
  if (isBackofficeStaffRole(sessionRole)) return null
  return homeForRole(sessionRole)
}

function homeForRole(sessionRole: string | undefined): string {
  if (isBackofficeStaffRole(sessionRole)) return '/admin'
  if (sessionRole === 'partner') return '/partner'
  if (sessionRole === 'driver') return '/driver'
  return '/passenger'
}
