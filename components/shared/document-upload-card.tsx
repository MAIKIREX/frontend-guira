'use client'

import { useEffect, useMemo } from 'react'
import Image from 'next/image'
import { FileText, FileUp, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileDropzone } from '@/components/shared/file-dropzone'
import { cn } from '@/lib/utils'

interface DocumentUploadCardProps {
  accept?: string
  className?: string
  description?: string
  disabled?: boolean
  emptyStateText?: string
  existingUrl?: string
  existingUrlLabel?: string
  file?: File | null
  helperText?: string
  label: string
  onFileChange: (file: File | null) => void
  onUpload?: () => void
  previewLinkLabel?: string
  selectedFileLinkLabel?: (fileName: string) => string
  uploading?: boolean
  uploadLabel?: string
}

export function DocumentUploadCard({
  accept,
  className,
  description,
  disabled,
  emptyStateText = 'Aun no seleccionaste un archivo.',
  existingUrl,
  existingUrlLabel = 'Ver archivo ya entregado',
  file,
  helperText = 'Arrastra el archivo o haz click para seleccionarlo.',
  label,
  onFileChange,
  onUpload,
  previewLinkLabel = 'Abrir',
  selectedFileLinkLabel = (fileName) => `Ver archivo que estas por subir: ${fileName}`,
  uploading,
  uploadLabel,
}: DocumentUploadCardProps) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  const isImage = Boolean(file?.type.startsWith('image/'))

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <div className={cn('rounded-[24px] border border-border/60 bg-background/75 p-4 text-left', className)}>
      <div className="mb-3 flex items-start gap-3">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-2 text-muted-foreground">
          <Upload className="size-4" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-[0.01em] text-foreground">{label}</div>
          {description ? <div className="text-sm leading-6 tracking-[0.01em] text-muted-foreground">{description}</div> : null}
        </div>
      </div>

      <FileDropzone
        accept={accept}
        disabled={disabled || uploading}
        file={file ?? null}
        helperText={helperText}
        onFileSelect={onFileChange}
      />

      {onUpload ? (
        <Button className="mt-3 w-full cursor-pointer" disabled={disabled || uploading} onClick={onUpload} size="sm" type="button" variant="outline">
          <FileUp />
          {uploading ? 'Subiendo...' : uploadLabel ?? `Subir ${label.toLowerCase()}`}
        </Button>
      ) : null}

      {!isImage || !file ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border/60 bg-muted/10 p-3">
          {file ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium tracking-[0.01em] text-foreground">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{Math.round(file.size / 1024)} KB</div>
                </div>
                <a className="text-sm font-medium text-primary underline-offset-4 hover:underline" href={previewUrl ?? '#'} rel="noreferrer" target="_blank">
                  {previewLinkLabel}
                </a>
              </div>
              {isImage && previewUrl ? (
                <Image
                  alt={file.name}
                  className="h-40 w-full rounded-xl border border-border/60 object-cover"
                  height={160}
                  src={previewUrl}
                  unoptimized
                  width={640}
                />
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
                  <FileText className="size-4" />
                  Vista previa disponible en una pestaña nueva.
                </div>
              )}
              <a className="flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline" href={previewUrl ?? '#'} rel="noreferrer" target="_blank">
                <FileText className="size-4" />
                {selectedFileLinkLabel(file.name)}
              </a>
              {existingUrl ? (
                <a className="flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline" href={existingUrl} rel="noreferrer" target="_blank">
                  <FileText className="size-4" />
                  {existingUrlLabel}
                </a>
              ) : null}
            </div>
          ) : existingUrl ? (
            <a className="flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline" href={existingUrl} rel="noreferrer" target="_blank">
              <FileText className="size-4" />
              {existingUrlLabel}
            </a>
          ) : (
            <div className="text-sm text-muted-foreground ">{emptyStateText}</div>
          )}
        </div>
      ) : null}
    </div>
  )
}
