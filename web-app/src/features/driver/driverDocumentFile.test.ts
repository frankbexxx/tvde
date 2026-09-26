import { describe, expect, it } from 'vitest'
import { DRIVER_DOC_ACCEPT, validateDriverDocumentFile } from './driverDocumentFile'

function file(name: string, type: string, size = 12): File {
  const blob = new File([new Uint8Array(size)], name, { type })
  return blob
}

describe('validateDriverDocumentFile', () => {
  it('o accept fica limitado a PDF, JPEG e PNG', () => {
    expect(DRIVER_DOC_ACCEPT).toContain('.pdf')
    expect(DRIVER_DOC_ACCEPT).toContain('image/jpeg')
    expect(DRIVER_DOC_ACCEPT).toContain('image/png')
    expect(DRIVER_DOC_ACCEPT).not.toContain('image/*')
  })

  it('aceita pdf, jpg e png', () => {
    expect(validateDriverDocumentFile(file('carta.pdf', 'application/pdf'))).toBeNull()
    expect(validateDriverDocumentFile(file('foto.jpg', 'image/jpeg'))).toBeNull()
    expect(validateDriverDocumentFile(file('foto.png', 'image/png'))).toBeNull()
  })

  it('recusa tipo e tamanho acima de 5 MB', () => {
    expect(validateDriverDocumentFile(file('nota.txt', 'text/plain'))).toBe('type')
    expect(validateDriverDocumentFile(file('foto.webp', 'image/webp'))).toBe('type')
    expect(validateDriverDocumentFile(file('grande.pdf', 'application/pdf', 5 * 1024 * 1024 + 1))).toBe(
      'size'
    )
  })
})
