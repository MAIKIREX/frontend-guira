'use client'

import { useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'
import { useDropzone } from 'react-dropzone'
import { FileImage, FileText, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileDropzoneProps {
  accept?: string
  disabled?: boolean
  file?: File | null
  helperText?: string
  onFileSelect: (file: File | null) => void
}

export function FileDropzone({
  accept,
  disabled,
  file,
  helperText,
  onFileSelect,
}: FileDropzoneProps) {
  const prevUrlRef = useRef<string | null>(null)
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  // Solo revocar la URL anterior cuando el archivo cambia, no al desmontar
  useEffect(() => {
    if (prevUrlRef.current && prevUrlRef.current !== previewUrl) {
      URL.revokeObjectURL(prevUrlRef.current)
    }
    prevUrlRef.current = previewUrl
  }, [previewUrl])

  const dropzone = useDropzone({
    accept: normalizeAccept(accept),
    disabled,
    maxFiles: 1,
    multiple: false,
    onDrop: (acceptedFiles) => onFileSelect(acceptedFiles[0] ?? null),
  })

  const isImage = Boolean(file?.type.startsWith('image/'))

  return (
    <div className="space-y-3">
      {file && isImage && previewUrl ? (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/80">
          <div className="relative">
            <Image
              alt={file.name}
              className="h-56 w-full object-cover"
              height={224}
              src={previewUrl}
              unoptimized
              width={640}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
            <div className="absolute right-3 bottom-3 left-3 flex items-center justify-between gap-3">
              <div className="min-w-0 rounded-xl bg-black/45 px-3 py-2 text-white backdrop-blur-sm">
                <div className="truncate text-sm font-medium">{file.name}</div>
                <div className="text-xs text-white/75">{Math.round(file.size / 1024)} KB</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  className="inline-flex h-9 items-center justify-center rounded-full border border-white/20 bg-white/12 px-4 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
                  href={previewUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Abrir
                </a>
                <button
                  className="inline-flex h-9 items-center justify-center rounded-full border border-white/20 bg-black/25 px-4 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-black/35"
                  onClick={() => onFileSelect(null)}
                  type="button"
                >
                  Borrar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          {...dropzone.getRootProps()}
          className={cn(
            'rounded-2xl border border-dashed border-border/70 bg-muted/15 p-5 transition duration-200',
            !disabled && 'cursor-pointer hover:border-primary/45 hover:bg-primary/5',
            dropzone.isDragActive && 'border-primary bg-primary/5',
            disabled && 'pointer-events-none opacity-60'
          )}
        >
          <input {...dropzone.getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-3 text-muted-foreground">
              <UploadCloud className="size-5" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-foreground">
                {dropzone.isDragActive ? 'Suelta el archivo aqui' : 'Arrastra un archivo o haz click para seleccionarlo'}
              </div>
              <div className="text-xs text-muted-foreground">
                {helperText ?? 'Acepta imagenes y PDF segun la configuracion del campo.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {file && !isImage ? (
        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-foreground">{file.name}</div>
              <div className="text-xs text-muted-foreground">{Math.round(file.size / 1024)} KB</div>
            </div>
            <button
              className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
              onClick={() => onFileSelect(null)}
              type="button"
            >
              Quitar
            </button>
          </div>

          {isImage && previewUrl ? (
            <Image alt={file.name} className="mt-3 h-40 w-full rounded-xl border border-border/60 object-cover" height={160} src={previewUrl} unoptimized width={640} />
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
              {isImage ? <FileImage className="size-4" /> : <FileText className="size-4" />}
              Archivo listo para subir.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function normalizeAccept(accept?: string) {
  if (!accept) return undefined

  return accept.split(',').reduce<Record<string, string[]>>((acc, entry) => {
    const trimmed = entry.trim()
    if (!trimmed) return acc

    if (trimmed.startsWith('.')) {
      acc['application/octet-stream'] = [...(acc['application/octet-stream'] ?? []), trimmed]
      return acc
    }

    acc[trimmed] = []
    return acc
  }, {})
}
