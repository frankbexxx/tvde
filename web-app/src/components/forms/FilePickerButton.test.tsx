import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FilePickerButton } from './FilePickerButton'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { name?: string }) =>
      opts?.name ? `${key}:${opts.name}` : key,
  }),
}))

describe('FilePickerButton', () => {
  it('passa o accept e entrega o ficheiro escolhido', () => {
    const onFileSelected = vi.fn()
    render(<FilePickerButton accept=".pdf,image/png" onFileSelected={onFileSelected} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input.accept).toBe('.pdf,image/png')
    expect(input.multiple).toBe(false)
    const picked = new File(['%PDF'], 'carta.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [picked] } })
    expect(onFileSelected).toHaveBeenCalledWith(picked)
    expect(screen.getByTestId('file-picker-name')).toHaveTextContent('carta.pdf')
  })

  it('cancelar o picker não chama o callback nem parte a UI', () => {
    const onFileSelected = vi.fn()
    render(<FilePickerButton onFileSelected={onFileSelected} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(onFileSelected).not.toHaveBeenCalled()
    expect(screen.getByTestId('file-picker-name')).toHaveTextContent('documents.noFileSelected')
  })
})
