/** Limites do upload de documentos do motorista. Iguais ao backend (PDF/JPEG/PNG, 5 MiB). */

export const DRIVER_DOC_MAX_BYTES = 5 * 1024 * 1024
export const DRIVER_DOC_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'

const EXTS = new Set(['.pdf', '.jpg', '.jpeg', '.png'])
const MIMES = new Set(['application/pdf', 'image/jpeg', 'image/png'])

/** `null` quando o ficheiro pode seguir para o servidor. */
export function validateDriverDocumentFile(file: File): 'type' | 'size' | null {
  if (file.size > DRIVER_DOC_MAX_BYTES) return 'size'
  const name = file.name || ''
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : ''
  if (!EXTS.has(ext)) return 'type'
  const mime = (file.type || '').split(';')[0].trim().toLowerCase()
  if (mime && !MIMES.has(mime)) return 'type'
  return null
}
