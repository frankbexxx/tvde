import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

type FilePickerButtonProps = {
  accept?: string
  disabled?: boolean
  onFileSelected: (file: File) => void
  browseLabel?: string
  noFileLabel?: string
  className?: string
}

export function FilePickerButton({
  accept,
  disabled,
  onFileSelected,
  browseLabel,
  noFileLabel,
  className,
}: FilePickerButtonProps) {
  const { t } = useTranslation('driver')
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedName, setSelectedName] = useState<string | null>(null)

  return (
    <div className={className ?? 'flex flex-col gap-1.5'}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          setSelectedName(file.name)
          onFileSelected(file)
          e.target.value = ''
          setSelectedName(null)
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="min-h-8 w-fit rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-50 touch-manipulation"
      >
        {browseLabel ?? t('documents.browse')}
      </button>
      <p className="text-[11px] text-muted-foreground truncate" aria-live="polite">
        {selectedName
          ? t('documents.fileSelected', { name: selectedName })
          : (noFileLabel ?? t('documents.noFileSelected'))}
      </p>
    </div>
  )
}
