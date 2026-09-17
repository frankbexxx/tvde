/** Papéis de utilizador alinhados com o JWT / backend. */
export type Role = 'passenger' | 'driver' | 'admin' | 'super_admin' | 'partner'

/** Conta de gestão: `super_admin` é o escalão máximo mas trata-se como admin em toda a shell. */
export function isBackofficeStaffRole(role: Role | string | undefined): boolean {
  return role === 'admin' || role === 'super_admin'
}
