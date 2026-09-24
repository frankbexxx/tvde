import { describe, expect, it, vi, beforeEach } from 'vitest'
import '../../i18n'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ComplaintAttachmentsPanel, validateAttachmentChoice } from './ComplaintAttachmentsPanel'

const listMy = vi.fn()
const uploadMy = vi.fn()
const listAdmin = vi.fn()
const uploadAdmin = vi.fn()
const download = vi.fn()

vi.mock('../../api/complaints', async () => {
  const actual = await vi.importActual<typeof import('../../api/complaints')>('../../api/complaints')
  return {
    ...actual,
    listMyComplaintAttachments: (...args: unknown[]) => listMy(...args),
    uploadMyComplaintAttachment: (...args: unknown[]) => uploadMy(...args),
    listAdminComplaintAttachments: (...args: unknown[]) => listAdmin(...args),
    uploadAdminComplaintAttachment: (...args: unknown[]) => uploadAdmin(...args),
    downloadComplaintAttachment: (...args: unknown[]) => download(...args),
  }
})

function file(name: string, size = 10): File {
  return new File([new Uint8Array(size)], name, { type: 'application/octet-stream' })
}

describe('complaint attachments UI', () => {
  beforeEach(() => {
    listMy.mockResolvedValue([])
    listAdmin.mockResolvedValue([])
    uploadMy.mockResolvedValue({
      id: 'a1',
      original_file_name: 'note.pdf',
      mime_type: 'application/pdf',
      size_bytes: 10,
      created_at: '2026-09-24T12:00:00Z',
      uploaded_by_user_id: 'user-1',
    })
    uploadAdmin.mockResolvedValue({
      id: 'a2',
      original_file_name: 'admin.png',
      mime_type: 'image/png',
      size_bytes: 10,
      created_at: '2026-09-24T12:00:00Z',
    })
    download.mockResolvedValue(undefined)
  })

  it('accepts pdf/jpg/jpeg/png and rejects other types, size, and a sixth file', () => {
    expect(validateAttachmentChoice(file('a.pdf'), 0)).toBeNull()
    expect(validateAttachmentChoice(file('a.jpg'), 0)).toBeNull()
    expect(validateAttachmentChoice(file('a.jpeg'), 0)).toBeNull()
    expect(validateAttachmentChoice(file('a.png'), 0)).toBeNull()
    expect(validateAttachmentChoice(file('a.html'), 0)).toBe('type')
    expect(validateAttachmentChoice(file('a.svg'), 0)).toBe('type')
    expect(validateAttachmentChoice(file('a.pdf', 5 * 1024 * 1024 + 1), 0)).toBe('size')
    expect(validateAttachmentChoice(file('a.pdf'), 5)).toBe('count')
  })

  it('lists legacy empty attachments and uploads then downloads', async () => {
    render(
      <ComplaintAttachmentsPanel
        token="tok"
        publicReference="CMP-1"
        status="received"
        mode="user"
      />
    )
    expect(await screen.findByText('Sem anexos.')).toBeInTheDocument()
    const input = screen.getByLabelText('Adicionar anexo')
    expect(input).toHaveAttribute('accept', '.pdf,.jpg,.jpeg,.png')
    fireEvent.change(input, { target: { files: [file('note.pdf')] } })
    expect(await screen.findByText('note.pdf')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Descarregar' }))
    await waitFor(() => expect(download).toHaveBeenCalled())
  })

  it('hides the selector when the complaint is closed', async () => {
    render(
      <ComplaintAttachmentsPanel
        token="tok"
        publicReference="CMP-1"
        status="closed"
        mode="user"
      />
    )
    expect(await screen.findByText(/fechada/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Adicionar anexo')).not.toBeInTheDocument()
  })

  it('shows admin detail fields for an existing attachment', async () => {
    listAdmin.mockResolvedValue([
      {
        id: 'a9',
        original_file_name: 'legacy-none.pdf',
        mime_type: 'application/pdf',
        size_bytes: 42,
        created_at: '2026-09-24T12:00:00Z',
        uploaded_by_user_id: 'admin-1',
      },
    ])
    render(
      <ComplaintAttachmentsPanel
        token="tok"
        publicReference="CMP-EXT"
        status="received"
        mode="admin"
      />
    )
    expect(await screen.findByText('legacy-none.pdf')).toBeInTheDocument()
    expect(screen.getByText('application/pdf')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('admin-1')).toBeInTheDocument()
  })
})
