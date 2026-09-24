export const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png'
export const MAX_COMPLAINT_ATTACHMENTS = 5
export const MAX_COMPLAINT_ATTACHMENT_BYTES = 5 * 1024 * 1024

const ALLOWED = new Set(['pdf', 'jpg', 'jpeg', 'png'])

export function validateAttachmentChoice(
  file: File,
  already: number
): 'type' | 'size' | 'count' | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED.has(ext)) return 'type'
  if (file.size > MAX_COMPLAINT_ATTACHMENT_BYTES) return 'size'
  if (already >= MAX_COMPLAINT_ATTACHMENTS) return 'count'
  return null
}
