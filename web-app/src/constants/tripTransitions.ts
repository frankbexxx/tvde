/**
 * Transições de estado consideradas válidas no ciclo de vida (API / negócio).
 * Não substitui validação do servidor — só guardas e testes no cliente.
 */
const ALLOWED = new Set<string>([
  'requested->assigned',
  'requested->accepted',
  'requested->cancelled',
  'requested->failed',
  'assigned->accepted',
  'assigned->cancelled',
  'assigned->failed',
  'accepted->arriving',
  'accepted->cancelled',
  'accepted->failed',
  'arriving->ongoing',
  'arriving->cancelled',
  'arriving->failed',
  'ongoing->completed',
  'ongoing->failed',
  'ongoing->cancelled',
  'completed->completed',
  'cancelled->cancelled',
  'failed->failed',
])

export function isValidTripLifecycleTransition(from: string, to: string): boolean {
  return ALLOWED.has(`${from}->${to}`)
}
