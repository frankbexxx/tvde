/**
 * Converte `detail` de respostas HTTP (FastAPI: string, lista de erros de validação, objecto aninhado)
 * em texto legível para o ecrã.
 */
export function formatApiErrorDetail(detail: unknown): string {
  if (detail == null || detail === '') return ''
  if (typeof detail === 'string') return detail.trim()

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: unknown }).msg).trim()
        }
        if (typeof item === 'string') return item.trim()
        try {
          return JSON.stringify(item)
        } catch {
          return ''
        }
      })
      .filter(Boolean)
      .join(' · ')
  }

  if (typeof detail === 'object') {
    const o = detail as Record<string, unknown>
    if ('detail' in o) return formatApiErrorDetail(o.detail)
    if (typeof o.message === 'string') return o.message.trim()
  }

  try {
    const s = JSON.stringify(detail)
    if (s.length <= 400) return s
    return `${s.slice(0, 400)}…`
  } catch {
    return 'Resposta de erro inesperada.'
  }
}

/** Aceita `ApiError` completo ou só o campo `detail`. */
export function formatApiErrorFromUnknown(errOrDetail: unknown): string {
  if (errOrDetail && typeof errOrDetail === 'object' && 'detail' in errOrDetail) {
    const d = formatApiErrorDetail((errOrDetail as { detail: unknown }).detail)
    const rid = (errOrDetail as { request_id?: string }).request_id
    if (rid && d && !d.includes(rid)) {
      return `${d} (ref: ${rid})`
    }
    return d
  }
  return formatApiErrorDetail(errOrDetail)
}
