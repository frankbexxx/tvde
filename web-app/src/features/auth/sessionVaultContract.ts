/** Contrato da bridge. O login da WebView não importa este módulo. */

export interface PublicSession {
  accessToken: string
  familyId: string
  generation: number
  absoluteExpiresAt: string | null
  idleExpiresAt: string | null
  hasRefresh: boolean
}

export const SESSION_VAULT_PUBLIC_FIELDS = [
  'accessToken',
  'familyId',
  'generation',
  'absoluteExpiresAt',
  'idleExpiresAt',
  'hasRefresh',
] as const

/** Métodos Capacitor. A escrita com segredos não entra nesta lista. */
export const SESSION_VAULT_METHODS = ['read', 'clear'] as const

export const SESSION_VAULT_SAVE_BRIDGE = 'VamulaSessionVault'
