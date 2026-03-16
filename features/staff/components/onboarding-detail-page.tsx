'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleAlert,
  ExternalLink,
  FileBadge2,
  FileText,
  Loader2,
  Mail,
  ScanSearch,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/stores/auth-store'
import { useProfileStore } from '@/stores/profile-store'
import { OnboardingActions } from '@/features/staff/components/staff-action-dialogs'
import { StaffService } from '@/services/staff.service'
import type { StaffActor, StaffDocumentRecord, StaffOnboardingDetail, StaffOnboardingRecord } from '@/types/staff'

type InlineDocument = {
  doc_type: string
  storage_path: string
  created_at?: string
  source: 'documents' | 'payload'
  signed_url?: string | null
  mime_type?: string | null
}

const DOCUMENT_LABELS: Record<string, string> = {
  id_front: 'Documento identidad frente',
  id_back: 'Documento identidad reverso',
  selfie: 'Selfie',
  proof_of_address: 'Prueba de domicilio',
  legal_rep_id: 'Documento representante legal',
  company_cert: 'Certificado de empresa',
  passport: 'Pasaporte UBO',
}

const DOCUMENT_KEYS = new Set([
  'id_front',
  'id_back',
  'selfie',
  'proof_of_address',
  'legal_rep_id',
  'company_cert',
])

const EXCLUDED_PERSONAL_KEYS = new Set([
  ...Array.from(DOCUMENT_KEYS),
  'ubos',
])

export function OnboardingDetailPage({ onboardingId }: { onboardingId: string }) {
  const { user } = useAuthStore()
  const { profile } = useProfileStore()
  const [detail, setDetail] = useState<StaffOnboardingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadDetail() {
      setLoading(true)
      setError(null)

      try {
        const nextDetail = await StaffService.getOnboardingDetail(onboardingId)
        if (mounted) {
          setDetail(nextDetail)
        }
      } catch (loadError) {
        console.error('Failed to load onboarding detail', loadError)
        if (mounted) {
          setError('No se pudo cargar el expediente de onboarding.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadDetail()
    return () => {
      mounted = false
    }
  }, [onboardingId])

  if (loading) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !detail || !user || !profile || (profile.role !== 'staff' && profile.role !== 'admin')) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>No se pudo abrir el expediente</CardTitle>
          <CardDescription>{error ?? 'No tienes permisos o el registro ya no existe.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className="inline-flex items-center gap-2 text-sm font-medium hover:underline" href="/admin">
            <ArrowLeft className="size-4" />
            Volver al panel
          </Link>
        </CardContent>
      </Card>
    )
  }

  const actor: StaffActor = { userId: user.id, role: profile.role }

  return (
    <OnboardingDetailScene
      actor={actor}
      detail={detail}
      onUpdated={(record) => {
        setDetail((current) => (current ? { ...current, record } : current))
      }}
    />
  )
}

function OnboardingDetailScene({
  actor,
  detail,
  onUpdated,
}: {
  actor: StaffActor
  detail: StaffOnboardingDetail
  onUpdated: (record: StaffOnboardingRecord) => void
}) {
  const { record, documents } = detail
  const data = useMemo(() => normalizeObject(record.data), [record.data])
  const summary = useMemo(() => buildSummary(record), [record])
  const personalFields = useMemo(() => buildPersonalFields(data), [data])
  const mergedDocuments = useMemo(() => mergeDocuments(documents, data, record.created_at), [documents, data, record.created_at])

  // Intent: staff/admin necesita revisar un expediente KYC completo sin perder contexto ni ocultar contenido en un modal.
  // Palette/depth: piedra, papel y senales de verificacion con capas suaves para una lectura operativa rapida.
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-stone-200/80 bg-[linear-gradient(135deg,rgba(250,245,235,0.95),rgba(255,255,255,0.98))] shadow-[0_24px_80px_-48px_rgba(87,54,14,0.45)]">
        <div className="grid gap-6 border-b border-stone-200/80 px-5 py-5 md:px-7 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <Link className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-500 transition-colors hover:text-stone-900" href="/admin">
              <ArrowLeft className="size-4" />
              Volver a onboarding
            </Link>
            <div className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700">Mesa de verificacion</div>
              <div className="flex flex-wrap items-start gap-3">
                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-stone-950">{summary.displayName}</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                    Vista dedicada para revisar identidad, documentos y estado del proceso sin depender del modal anterior.
                  </p>
                </div>
                <StatusBadge value={record.status} />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <MetricCard icon={record.type === 'company' ? Building2 : UserRound} label="Tipo" value={record.type === 'company' ? 'Empresa' : 'Persona'} />
            <MetricCard icon={CalendarDays} label="Actualizado" value={formatDate(record.updated_at)} />
            <MetricCard icon={FileBadge2} label="Documentos" value={String(mergedDocuments.length)} />
          </div>
        </div>

        <div className="grid gap-4 px-5 py-5 md:px-7 xl:grid-cols-[1fr_0.9fr]">
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryCard icon={UserRound} label="Nombre" value={summary.firstName} />
            <SummaryCard icon={UserRound} label="Apellido" value={summary.lastName} />
            <SummaryCard icon={CalendarDays} label="Nacimiento" value={summary.birthDate} />
          </div>
          <div className="rounded-2xl border border-stone-200/80 bg-white/85 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Accion visible</div>
                <div className="mt-1 text-sm text-stone-700">
                  Las decisiones siguen disponibles dentro del expediente para que la revision no pierda contexto.
                </div>
              </div>
              <ShieldCheck className="size-5 text-emerald-700" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <OnboardingActions actor={actor} onUpdated={onUpdated} record={record} />
            </div>
          </div>
        </div>
      </section>

      <Tabs className="gap-5" defaultValue="personal">
        <TabsList variant="line" className="w-full flex-wrap justify-start rounded-none border-b border-stone-200 bg-transparent p-0">
          <TabsTrigger className="rounded-none px-4 py-3" value="personal">Informacion personal</TabsTrigger>
          <TabsTrigger className="rounded-none px-4 py-3" value="documents">Documentos</TabsTrigger>
          <TabsTrigger className="rounded-none px-4 py-3" value="verification">Verificacion</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="border-stone-200/80 bg-white/90">
              <CardHeader>
                <CardTitle>Informacion principal</CardTitle>
                <CardDescription>Datos solo lectura recuperados desde la base y listos para escaneo rapido.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {summary.rows.map((field) => (
                  <FieldCard key={field.label} label={field.label} value={field.value} />
                ))}
              </CardContent>
            </Card>

            <Card className="border-stone-200/80 bg-stone-50/80">
              <CardHeader>
                <CardTitle>Campos adicionales</CardTitle>
                <CardDescription>Todos los demas campos de `onboarding.data` se muestran en modo lectura dentro de un layout de dos columnas.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {personalFields.length === 0 ? (
                  <EmptyState message="No hay mas campos personales o de empresa para mostrar." />
                ) : (
                  personalFields.map((field) => (
                    <FieldCard key={field.label} label={field.label} value={field.value} />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-stone-200/80 bg-white/90">
              <CardHeader>
                <CardTitle>Documentos cargados</CardTitle>
                <CardDescription>Cada bloque muestra tipo, numero de documento, fecha y vista previa cuando hay URL firmada.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mergedDocuments.length === 0 ? (
                  <EmptyState message="No se encontraron documentos asociados a este expediente." />
                ) : (
                  mergedDocuments.map((document, index) => (
                    <div key={`${document.doc_type}-${document.storage_path}-${index}`} className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4">
                      <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-medium text-stone-950">{formatDocumentLabel(document.doc_type)}</div>
                            <Badge className="border-stone-200 bg-white text-stone-700" variant="outline">
                              {document.source === 'documents' ? 'tabla documents' : 'payload onboarding'}
                            </Badge>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <MetaRow icon={FileText} label="Tipo de documento" value={formatDocumentLabel(document.doc_type)} />
                            <MetaRow icon={ScanSearch} label="Numero de documento" value={summary.documentNumber} />
                            <MetaRow icon={CalendarDays} label="Fecha de carga" value={formatDate(document.created_at)} />
                            <MetaRow icon={Mail} label="Mime / origen" value={document.mime_type ?? (document.source === 'documents' ? 'Registrado en documents' : 'Detectado desde payload')} />
                          </div>
                          <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-3 text-xs text-stone-600">
                            <div className="mb-1 uppercase tracking-[0.18em] text-stone-500">Ruta</div>
                            <div className="break-all">{document.storage_path}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <OnboardingActions actor={actor} onUpdated={onUpdated} record={record} />
                          </div>
                        </div>

                        <DocumentPreview document={document} />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.95),rgba(255,255,255,0.98))]">
              <CardHeader>
                <CardTitle>Contexto de revision</CardTitle>
                <CardDescription>La UI deja visibles las acciones administrativas, pero el backend actual sigue operando a nivel de onboarding.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ReviewNote icon={ShieldCheck} title="Aprobar documento" body="Usa la aprobacion cuando el expediente completo sea consistente con la evidencia presentada." />
                <ReviewNote icon={CircleAlert} title="Solicitar cambios" body="El dialogo ya permite registrar motivo para pedir correcciones al usuario." />
                <ReviewNote icon={FileBadge2} title="Rechazar documento" body="La decision queda trazada y sincroniza el estado general del onboarding." />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="verification">
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="border-stone-200/80 bg-white/90">
              <CardHeader>
                <CardTitle>Estado actual</CardTitle>
                <CardDescription>Resumen del KYC/KYB con fechas y comentarios del revisor.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <FieldCard label="Estado KYC/KYB" value={record.status} />
                <FieldCard label="Fecha de envio" value={formatDate(record.created_at)} />
                <FieldCard label="Fecha de revision" value={formatDate(record.updated_at)} />
                <FieldCard label="Comentarios del revisor" value={record.observations || 'Sin comentarios registrados'} />
                <FieldCard label="Bridge customer id" value={record.bridge_customer_id || 'Pendiente'} />
              </CardContent>
            </Card>

            <Card className="border-stone-200/80 bg-stone-950 text-stone-50">
              <CardHeader>
                <CardTitle>Lectura operativa</CardTitle>
                <CardDescription className="text-stone-300">{getVerificationCopy(record.status)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ReviewNoteDark icon={ShieldCheck} title="Historial disponible" body="Los cambios de estado quedan en auditoria; esta vista se concentra en el expediente y la accion inmediata." />
                <ReviewNoteDark icon={ScanSearch} title="Revision guiada" body="Primero identidad, luego evidencia documental y al final decision de verificacion." />
                <ReviewNoteDark icon={CircleAlert} title="Comentarios visibles" body="Las observaciones del onboarding se mantienen expuestas para que staff no pierda el hilo del caso." />
                <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
                  <OnboardingActions actor={actor} onUpdated={onUpdated} record={record} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white/88 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-stone-500">
        <Icon className="size-4" />
        {label}
      </div>
      <div className="mt-2 text-base font-medium text-stone-950">{value}</div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white/85 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-stone-500">
        <Icon className="size-4" />
        {label}
      </div>
      <div className="mt-2 text-lg font-medium text-stone-950">{value}</div>
    </div>
  )
}

function FieldCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white/85 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500">{label}</div>
      <div className="mt-2 text-sm text-stone-900">{value}</div>
    </div>
  )
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white/85 p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-stone-500">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-2 text-sm text-stone-800">{value}</div>
    </div>
  )
}

function ReviewNote({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldCheck
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white/85 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-stone-900">
        <Icon className="size-4" />
        {title}
      </div>
      <div className="mt-2 text-sm leading-6 text-stone-600">{body}</div>
    </div>
  )
}

function ReviewNoteDark({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldCheck
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4" />
        {title}
      </div>
      <div className="mt-2 text-sm leading-6 text-stone-300">{body}</div>
    </div>
  )
}

function DocumentPreview({ document }: { document: InlineDocument }) {
  if (!document.signed_url) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-stone-300/80 bg-white/75 p-4 text-center text-sm text-stone-500">
        Sin vista previa disponible
      </div>
    )
  }

  const lowerPath = document.storage_path.toLowerCase()
  const isImage = /\.(png|jpg|jpeg|webp)$/i.test(lowerPath)
  const isPdf = /\.pdf$/i.test(lowerPath)

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={formatDocumentLabel(document.doc_type)} className="h-[220px] w-full object-cover" src={document.signed_url} />
        ) : isPdf ? (
          <iframe className="h-[220px] w-full" src={document.signed_url} title={formatDocumentLabel(document.doc_type)} />
        ) : (
          <div className="flex h-[220px] items-center justify-center text-sm text-stone-500">Vista previa no soportada</div>
        )}
      </div>
      <a
        className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-100"
        href={document.signed_url}
        rel="noreferrer"
        target="_blank"
      >
        Abrir archivo
        <ExternalLink className="size-4" />
      </a>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300/80 bg-white/75 p-5 text-sm text-stone-500">
      {message}
    </div>
  )
}

function StatusBadge({ value }: { value: string }) {
  const className = getStatusClasses(value)
  return <Badge className={className}>{value}</Badge>
}

function getStatusClasses(value: string) {
  if (value === 'verified') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (value === 'rejected') return 'border-red-200 bg-red-50 text-red-700'
  if (value === 'needs_changes') return 'border-amber-200 bg-amber-50 text-amber-800'
  return 'border-stone-200 bg-white text-stone-700'
}

function buildSummary(record: StaffOnboardingRecord) {
  const data = normalizeObject(record.data)
  const fullName = record.profiles?.full_name?.trim() ?? ''
  const split = splitName(fullName)
  const firstName = readString(data.first_names) ?? readString(data.legal_rep_first_names) ?? split.firstName ?? 'No disponible'
  const lastName = readString(data.last_names) ?? readString(data.legal_rep_last_names) ?? split.lastName ?? 'No disponible'
  const birthDate = readString(data.dob) ?? 'No disponible'
  const documentNumber = readString(data.id_number) ?? readString(data.legal_rep_id_number) ?? 'No disponible'
  const companyName = readString(data.company_legal_name) ?? fullName
  const personalName = [firstName, lastName].filter((value) => value !== 'No disponible').join(' ').trim() || fullName
  const displayName = record.type === 'company'
    ? companyName || 'Empresa sin nombre'
    : personalName || 'Usuario sin nombre'

  return {
    displayName,
    firstName,
    lastName,
    birthDate,
    documentNumber,
    rows: [
      { label: 'Nombre', value: firstName },
      { label: 'Apellido', value: lastName },
      { label: 'Fecha de nacimiento', value: birthDate },
      { label: 'Email', value: record.profiles?.email ?? 'No disponible' },
      { label: 'Numero de documento', value: documentNumber },
      { label: 'Estado del perfil', value: record.profiles?.onboarding_status ?? record.status },
      { label: 'Tipo de onboarding', value: record.type },
      { label: 'Creado', value: formatDate(record.created_at) },
    ],
  }
}

function buildPersonalFields(data: Record<string, unknown>) {
  return Object.entries(data)
    .filter(([key, value]) => !EXCLUDED_PERSONAL_KEYS.has(key) && !Array.isArray(value) && typeof value !== 'object' && value != null && String(value).trim() !== '')
    .map(([key, value]) => ({
      label: humanizeKey(key),
      value: String(value),
    }))
}

function mergeDocuments(documents: StaffDocumentRecord[], data: Record<string, unknown>, createdAt: string) {
  const normalizedDocuments: InlineDocument[] = documents.map((document) => ({
    doc_type: document.doc_type,
    storage_path: document.storage_path,
    created_at: document.created_at,
    source: 'documents',
    signed_url: document.signed_url ?? null,
    mime_type: document.mime_type ?? null,
  }))

  const paths = new Set(normalizedDocuments.map((document) => document.storage_path))

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && isStoragePath(value) && !paths.has(value)) {
      normalizedDocuments.push({
        doc_type: key,
        storage_path: value,
        created_at: createdAt,
        source: 'payload',
        signed_url: null,
        mime_type: null,
      })
      paths.add(value)
    }

    if (key === 'ubos' && Array.isArray(value)) {
      value.forEach((ubo, index) => {
        const entry = normalizeObject(ubo)
        for (const [uboKey, uboValue] of Object.entries(entry)) {
          if (typeof uboValue === 'string' && isStoragePath(uboValue) && !paths.has(uboValue)) {
            normalizedDocuments.push({
              doc_type: `ubo_${index + 1}_${uboKey}`,
              storage_path: uboValue,
              created_at: createdAt,
              source: 'payload',
              signed_url: null,
              mime_type: null,
            })
            paths.add(uboValue)
          }
        }
      })
    }
  }

  return normalizedDocuments
}

function getVerificationCopy(status: string) {
  if (status === 'verified') return 'El caso ya fue aprobado. La vista mantiene visibles la evidencia y el contexto de la decision.'
  if (status === 'needs_changes') return 'El usuario debe corregir informacion o volver a subir evidencia. Conviene dejar observaciones precisas.'
  if (status === 'rejected') return 'El expediente fue rechazado. La prioridad aqui es conservar trazabilidad y evidencia de soporte.'
  return 'El expediente sigue en revision. La pagina organiza lectura y accion para que staff avance con menos friccion.'
}

function formatDocumentLabel(value: string) {
  const normalized = value.replace(/^ubo_\d+_/, '')
  return DOCUMENT_LABELS[normalized] ?? humanizeKey(value)
}

function humanizeKey(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDate(value?: string) {
  if (!value) return 'No disponible'

  try {
    return format(new Date(value), 'dd/MM/yyyy HH:mm')
  } catch {
    return value
  }
}

function normalizeObject(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function splitName(value: string) {
  const parts = value.split(' ').filter(Boolean)
  if (parts.length === 0) return { firstName: null, lastName: null }
  if (parts.length === 1) return { firstName: parts[0], lastName: null }

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  }
}

function isStoragePath(value: string) {
  if (DOCUMENT_KEYS.has(value)) return false
  return value.includes('/') && /\.(pdf|png|jpg|jpeg|webp)$/i.test(value)
}
