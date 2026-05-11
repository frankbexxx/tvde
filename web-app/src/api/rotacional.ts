import { apiFetch } from './client'

export type RotacionalItem = { text: string; source: string }

export type RotacionalMessagesResponse = { items: RotacionalItem[] }

/** Feed público para a linha rotativa do cabeçalho (sem auth). */
export async function fetchRotacionalMessages(): Promise<readonly string[]> {
  try {
    const res = await apiFetch<RotacionalMessagesResponse>('/rotacional/messages', {
      timeoutMs: 10_000,
      token: '',
    })
    return res.items.map((i) => i.text.trim()).filter((t) => t.length > 0)
  } catch {
    return []
  }
}
