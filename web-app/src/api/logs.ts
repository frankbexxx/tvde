import { apiFetch } from './client'

export type LifecycleAction = 'app_start' | 'dormancy_enter' | 'dormancy_exit'

export async function logLifecycle(
  action: LifecycleAction,
  token: string | null
): Promise<void> {
  try {
    await apiFetch<{ status: string }>('/logs/lifecycle', {
      method: 'POST',
      body: JSON.stringify({ action }),
      token,
    })
  } catch {
    // Fire-and-forget: never block app flow
  }
}
