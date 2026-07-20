/**
 * Trigger a browser file download from a Blob.
 * Appends the temporary <a> to the document and delays revokeObjectURL —
 * immediate revoke after a.click() can cancel the download (Firefox/Safari/Vivaldi).
 */
export function triggerBlobDownload(
  blob: Blob,
  filename: string,
  opts?: { revokeDelayMs?: number; documentRef?: Document }
): void {
  const doc = opts?.documentRef ?? document
  const revokeDelayMs = opts?.revokeDelayMs ?? 1000
  const typed =
    blob.type && blob.type.length > 0
      ? blob
      : new Blob([blob], { type: 'text/csv;charset=utf-8' })
  const objectUrl = URL.createObjectURL(typed)
  const a = doc.createElement('a')
  a.href = objectUrl
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  doc.body.appendChild(a)
  a.click()
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl)
    a.remove()
  }, revokeDelayMs)
}
