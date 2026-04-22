'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MessageSquarePlus,
  ScanSearch,
  Send,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/stores/auth-store'
import { useProfileStore } from '@/stores/profile-store'
import { OnboardingActions } from '@/features/staff/components/staff-action-dialogs'
import { ComplianceAdminService } from '@/services/admin/compliance.admin.service'
import type { StaffActor, StaffDocumentRecord, StaffOnboardingDetail, StaffOnboardingRecord } from '@/types/staff'

type InlineDocument = {
  doc_type: string
  storage_path: string
  created_at?: string
  source: 'documents' | 'payload'
  signed_url?: string | null
  mime_type?: string | null
}

type SummaryRow = {
  label: string
  value: string
}

type DetailSection = {
  title: string
  description: string
  rows: SummaryRow[]
}

const DOCUMENT_LABELS: Record<string, string> = {
  id_front: 'Documento de identidad frente',
  id_back: 'Documento de identidad reverso',
  selfie: 'Selfie con documento',
  proof_of_address: 'Prueba de domicilio',
  legal_rep_id: 'Documento de representante legal',
  company_cert: 'Constitucion o registro de empresa',
  passport: 'Pasaporte UBO',
}

const PERSONAL_DOCUMENT_ORDER = ['id_front', 'id_back', 'selfie', 'proof_of_address'] as const
const COMPANY_DOCUMENT_ORDER = ['company_cert', 'legal_rep_id', 'proof_of_address'] as const

const DOCUMENT_KEYS = new Set([
  ...PERSONAL_DOCUMENT_ORDER,
  ...COMPANY_DOCUMENT_ORDER,
  'passport',
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
        // C3 FIX + C8: Ahora usa ComplianceAdminService (1 sola llamada REST).
        const nextDetail = await ComplianceAdminService.getOnboardingDetail(onboardingId)
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

  if (error || !detail || !user || !profile || (profile.role !== 'staff' && profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>No se pudo abrir el expediente</CardTitle>
          <CardDescription>{error ?? 'No tienes permisos o el registro ya no existe.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className="inline-flex items-center gap-2 text-sm font-medium hover:underline" href="/admin/onboarding">
            <ArrowLeft className="size-4" />
            Volver a onboarding
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
      reviewId={onboardingId}
      onUpdated={(record) => {
        setDetail((current) => (current ? { ...current, record } : current))
      }}
    />
  )
}

function OnboardingDetailScene({
  actor,
  detail,
  reviewId,
  onUpdated,
}: {
  actor: StaffActor
  detail: StaffOnboardingDetail
  reviewId: string
  onUpdated: (record: StaffOnboardingRecord) => void
}) {
  const { record, documents } = detail
  const data = useMemo(() => normalizeObject(record.data), [record.data])
  const summary = useMemo(() => buildCaseSummary(record), [record])
  const sections = useMemo(() => buildStructuredSections(record, data), [record, data])
  const mergedDocuments = useMemo(() => mergeDocuments(documents, data, record.created_at), [documents, data, record.created_at])

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-sky-700 dark:hover:text-cyan-300" href="/admin/onboarding">
          <ArrowLeft className="size-4" />
          Volver a onboarding
        </Link>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">Expediente de Verificacion</h1>
      </div>

      <Tabs className="gap-5" defaultValue="form-data">
        <TabsList variant="line" className="w-full flex-wrap justify-start rounded-none border-b border-border/70 bg-transparent p-0">
          <TabsTrigger className="rounded-none px-4 py-3" value="form-data">Formulario</TabsTrigger>
          {record.previous_data && (
            <TabsTrigger className="rounded-none px-4 py-3" value="diff-view">Cambios (Diff)</TabsTrigger>
          )}
          <TabsTrigger className="rounded-none px-4 py-3" value="documents">Documentos</TabsTrigger>
          <TabsTrigger className="rounded-none px-4 py-3" value="activity">Actividad</TabsTrigger>
          <TabsTrigger className="rounded-none px-4 py-3" value="decision">Decision</TabsTrigger>
        </TabsList>

        <TabsContent value="form-data">
          <div className="mx-auto max-w-5xl">
            <Card className="border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle>Formulario declarado</CardTitle>
                <CardDescription>
                  Lectura principal del expediente en formato mas ordenado. Recorre el formulario por secciones, con filas simples y sin cards repetidas por cada dato.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {sections.map((section) => (
                  <SectionBlock key={section.title} section={section} />
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {record.previous_data && (
          <TabsContent value="diff-view">
            <div className="mx-auto max-w-5xl">
              <Card className="border-border/70 bg-card/95">
                <CardHeader>
                  <CardTitle>Análisis de Cambios (Diff)</CardTitle>
                  <CardDescription>
                    Comparación entre la información actual provista por el usuario y los datos previos a la solicitud de corrección. Los campos marcados en verde son los que el cliente ha modificado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {buildDiffSections(record, record.previous_data, data).map((section) => (
                    <SectionDiffBlock key={section.title} section={section} />
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        <TabsContent value="documents">
          <div className="mx-auto max-w-6xl">
            <Card className="border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle>Evidencia documental</CardTitle>
                <CardDescription>
                  Cada documento aparece una sola vez con su metadata operativa, su origen y la vista previa cuando el sistema dispone de URL firmada.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mergedDocuments.length === 0 ? (
                  <EmptyState message="No se encontraron documentos asociados a este expediente." />
                ) : (
                  mergedDocuments.map((document, index) => (
                    <div key={`${document.doc_type}-${document.storage_path}-${index}`} className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                      <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-medium text-foreground">{formatDocumentLabel(document.doc_type)}</div>
                            <Badge className="border-border/70 bg-background/70 text-muted-foreground" variant="outline">
                              {document.source === 'documents' ? 'tabla documents' : 'payload onboarding'}
                            </Badge>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <MetaRow icon={FileText} label="Tipo de documento" value={formatDocumentLabel(document.doc_type)} />
                            <MetaRow icon={CalendarDays} label="Fecha de carga" value={formatDate(document.created_at)} />
                            <MetaRow icon={Mail} label="Mime / origen" value={document.mime_type ?? (document.source === 'documents' ? 'Registrado en documents' : 'Detectado desde payload')} />
                            <MetaRow icon={ScanSearch} label="Caso asociado" value={summary.caseTypeLabel} />
                          </div>
                          <div className="rounded-2xl border border-border/70 bg-card/80 p-3 text-xs text-muted-foreground">
                            <div className="mb-1 uppercase tracking-[0.18em] text-muted-foreground">Ruta</div>
                            <div className="break-all">{document.storage_path}</div>
                          </div>
                        </div>

                        <DocumentPreview document={document} />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* C9: Tab de Actividad — historial de eventos, comentarios y asignación */}
        <TabsContent value="activity">
          <div className="mx-auto max-w-5xl">
            <ActivityTab reviewId={reviewId} record={record} actor={actor} />
          </div>
        </TabsContent>

        <TabsContent value="decision">
          <div className="mx-auto max-w-4xl">
            <Card className="border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle>Estado y resolucion</CardTitle>
                <CardDescription>
                  Bloque formal para tomar la decision sin volver a recorrer todo el contenido del expediente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <CompactInfoList
                  rows={[
                    { label: 'Estado KYC/KYB', value: record.status },
                    { label: 'Fecha de envio', value: formatDate(record.created_at) },
                    { label: 'Fecha de revision', value: formatDate(record.updated_at) },
                    { label: 'Comentarios del revisor', value: record.observations || 'Sin comentarios registrados' },
                    { label: 'Bridge customer id', value: record.bridge_customer_id || 'Pendiente' },
                  ]}
                />
              </CardContent>
            </Card>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <OnboardingActions actor={actor} onUpdated={onUpdated} record={record} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── C9: Activity Tab ────────────────────────────────────────────────────────

interface ActivityEvent {
  id?: string
  decision?: string
  reason?: string
  actor_id?: string
  created_at?: string
  metadata?: Record<string, unknown>
}

interface ActivityComment {
  id?: string
  author_id?: string
  body?: string
  is_internal?: boolean
  created_at?: string
}

function ActivityTab({
  reviewId,
  record,
  actor,
}: {
  reviewId: string
  record: StaffOnboardingRecord
  actor: StaffActor
}) {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [comments, setComments] = useState<ActivityComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadActivity = useCallback(async () => {
    try {
      setLoading(true)
      const raw = await ComplianceAdminService.getReviewActivity(reviewId)
      setEvents(raw.events ?? [])
      setComments(raw.comments ?? [])
    } catch (err) {
      console.error('Failed to load activity', err)
    } finally {
      setLoading(false)
    }
  }, [reviewId])

  useEffect(() => {
    loadActivity()
  }, [loadActivity])

  async function handleAddComment() {
    if (!newComment.trim()) return
    setSubmitting(true)
    try {
      await ComplianceAdminService.addComment(reviewId, newComment.trim(), true)
      setNewComment('')
      toast.success('Comentario agregado.')
      await loadActivity()
    } catch (err) {
      console.error('Failed to add comment', err)
      toast.error('No se pudo agregar el comentario.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[20vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Timeline de eventos */}
      <Card className="border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="size-5 text-muted-foreground" />
            Historial de decisiones
          </CardTitle>
          <CardDescription>
            Registro inmutable de todas las acciones tomadas sobre este expediente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <EmptyState message="No hay eventos registrados para este expediente." />
          ) : (
            <div className="space-y-3">
              {events.map((event, idx) => (
                <div
                  key={event.id ?? idx}
                  className="flex gap-3 rounded-2xl border border-border/70 bg-background/40 p-4"
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/20">
                    <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          event.decision === 'APPROVED'
                            ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300'
                            : event.decision === 'REJECTED'
                              ? 'border-red-400/40 bg-red-400/10 text-red-700 dark:text-red-300'
                              : 'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300'
                        }
                      >
                        {event.decision ?? 'UNKNOWN'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(event.created_at)}
                      </span>
                    </div>
                    {event.reason && (
                      <p className="text-sm leading-relaxed text-foreground">{event.reason}</p>
                    )}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <pre className="mt-2 overflow-x-auto rounded-xl bg-muted/30 p-2 text-xs text-muted-foreground">
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    )}
                    <div className="text-[11px] text-muted-foreground/60">
                      Actor: {event.actor_id?.slice(0, 8) ?? 'Desconocido'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comentarios internos */}
      <Card className="border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquarePlus className="size-5 text-muted-foreground" />
            Comentarios internos
          </CardTitle>
          <CardDescription>
            Notas del equipo visibles solo para staff. Útiles para coordinar la revisión del expediente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.length === 0 ? (
            <EmptyState message="No hay comentarios registrados." />
          ) : (
            <div className="space-y-3">
              {comments.map((comment, idx) => (
                <div
                  key={comment.id ?? idx}
                  className="rounded-2xl border border-border/70 bg-background/40 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm leading-relaxed text-foreground">{comment.body}</p>
                    {comment.is_internal && (
                      <Badge variant="outline" className="shrink-0 border-border/70 bg-background/70 text-muted-foreground text-[10px]">
                        Interno
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground/60">
                    <span>Por: {comment.author_id?.slice(0, 8) ?? 'Desconocido'}</span>
                    <span>{formatDate(comment.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Form para agregar comentario */}
          <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
            <Textarea
              className="mb-3 min-h-[80px] resize-none border-border/70 bg-background/60"
              placeholder="Escribe un comentario interno..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                disabled={!newComment.trim() || submitting}
                size="sm"
                onClick={handleAddComment}
              >
                {submitting ? (
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                ) : (
                  <Send className="mr-2 size-3.5" />
                )}
                {submitting ? 'Enviando...' : 'Agregar comentario'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Section components ──────────────────────────────────────────────────────

function SectionBlock({ section }: { section: DetailSection }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/90 p-4">
      <div className="border-b border-border/70 pb-3">
        <div className="text-sm font-medium text-foreground">{section.title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{section.description}</div>
      </div>
      <div className="mt-3">
        {section.rows.length === 0 ? (
          <EmptyState message="No hay datos cargados en esta seccion." />
        ) : (
          <CompactInfoList rows={section.rows} />
        )}
      </div>
    </div>
  )
}

function CompactInfoList({ rows }: { rows: SummaryRow[] }) {
  return (
    <div className="divide-y divide-border/70 rounded-2xl border border-border/70 bg-background/40">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-2 px-4 py-3 md:grid-cols-[180px_1fr] md:items-start">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {row.label}
          </div>
          <div className="text-sm leading-6 text-foreground">{row.value}</div>
        </div>
      ))}
    </div>
  )
}

interface DiffRow {
  label: string
  oldValue: string | null
  newValue: string | null
  isChanged: boolean
}

interface DiffSection {
  title: string
  description: string
  rows: DiffRow[]
}

function SectionDiffBlock({ section }: { section: DiffSection }) {
  if (section.rows.length === 0) return null

  const hasChanges = section.rows.some((row) => row.isChanged)

  return (
    <div className="space-y-4 rounded-xl border border-border/50 bg-background/50 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
        </div>
        {hasChanges && (
          <Badge variant="outline" className="border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300">
            Cambios detectados
          </Badge>
        )}
      </div>

      <div className="mt-4 divide-y divide-border/70 rounded-2xl border border-border/70 bg-background/40">
        {section.rows.map((row) => (
          <div key={row.label} className="grid gap-2 px-4 py-3 md:grid-cols-[180px_1fr] md:items-start">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {row.label}
            </div>
            <div className={`grid gap-2 ${row.isChanged ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
              {row.isChanged ? (
                <>
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-sm line-through text-muted-foreground">
                    {row.oldValue || <span className="text-xs italic">Ninguno</span>}
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-sm text-foreground">
                    {row.newValue || <span className="text-xs italic">Eliminado</span>}
                  </div>
                </>
              ) : (
                <div className="text-sm leading-6 text-foreground">
                  {row.newValue}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
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
    <div className="rounded-2xl border border-border/70 bg-card/90 p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-2 text-sm text-foreground">{value}</div>
    </div>
  )
}

function DocumentPreview({ document }: { document: InlineDocument }) {
  if (!document.signed_url) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/15 p-4 text-center text-sm text-muted-foreground">
        Sin vista previa disponible
      </div>
    )
  }

  const lowerPath = document.storage_path.toLowerCase()
  const isImage = /\.(png|jpg|jpeg|webp)$/i.test(lowerPath)
  const isPdf = /\.pdf$/i.test(lowerPath)

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={formatDocumentLabel(document.doc_type)} className="h-[220px] w-full object-cover" src={document.signed_url} />
        ) : isPdf ? (
          <iframe className="h-[220px] w-full" src={document.signed_url} title={formatDocumentLabel(document.doc_type)} />
        ) : (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">Vista previa no soportada</div>
        )}
      </div>
      <a
        className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 text-sm font-medium text-sky-700 transition-colors hover:bg-cyan-400/16 dark:text-cyan-200"
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
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/15 p-5 text-sm text-muted-foreground">
      {message}
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildCaseSummary(record: StaffOnboardingRecord) {
  const data = normalizeObject(record.data)
  const firstName = readString(data.first_names) ?? readString(data.legal_rep_first_names)
  const lastName = readString(data.last_names) ?? readString(data.legal_rep_last_names)
  const profileName = readString(record.profiles?.full_name)
  const companyName = readString(data.company_legal_name)
  const displayName = record.type === 'company'
    ? companyName ?? profileName ?? 'Empresa sin nombre'
    : [firstName, lastName].filter(Boolean).join(' ').trim() || profileName || 'Usuario sin nombre'

  return {
    displayName,
    accountEmail: record.profiles?.email ?? 'No disponible',
    caseTypeLabel: record.type === 'company' ? 'Empresa' : 'Persona natural',
    profileStatus: record.profiles?.onboarding_status ?? record.status,
  }
}

function buildDiffSections(record: StaffOnboardingRecord, prevData: Record<string, unknown>, newData: Record<string, unknown>): DiffSection[] {
  const prevSections = buildStructuredSections(record, prevData)
  const newSections = buildStructuredSections(record, newData)

  return newSections.map((newSection, idx) => {
    const prevSection = prevSections[idx] || { rows: [] }
    const prevMap = new Map(prevSection.rows.map(r => [r.label, r.value]))
    
    const diffRows: DiffRow[] = newSection.rows.map(newRow => {
      const oldValue = prevMap.get(newRow.label) ?? null
      const newValue = newRow.value
      return {
        label: newRow.label,
        oldValue,
        newValue,
        isChanged: oldValue !== newValue
      }
    })

    const newMap = new Map(newSection.rows.map(r => [r.label, r.value]))
    prevSection.rows.forEach(prevRow => {
      if (!newMap.has(prevRow.label)) {
        diffRows.push({
          label: prevRow.label,
          oldValue: prevRow.value,
          newValue: null,
          isChanged: true
        })
      }
    })

    return {
      title: newSection.title,
      description: newSection.description,
      rows: diffRows.filter(r => r.oldValue !== null || r.newValue !== null)
    }
  })
}

function buildStructuredSections(record: StaffOnboardingRecord, data: Record<string, unknown>): DetailSection[] {
  if (record.type === 'company') {
    const ubos = Array.isArray(data.ubos) ? data.ubos : []

    return [
      {
        title: 'Cuenta base',
        description: 'Datos visibles del alta de cuenta y del perfil operativo usado por la plataforma.',
        rows: compactRows([
          row('Correo', record.profiles?.email),
          row('Nombre en profile', record.profiles?.full_name),
          row('Estado del perfil', record.profiles?.onboarding_status ?? record.status),
          row('Fecha de creacion del expediente', formatDate(record.created_at)),
        ]),
      },
      {
        title: 'Identidad societaria',
        description: 'Datos principales enviados en el registro empresarial.',
        rows: compactRows([
          row('Razon social', data.company_legal_name),
          row('Numero de registro', data.registration_number),
          row('NIT / Tax ID', data.tax_id),
          row('Tipo de entidad', data.entity_type),
          row('Fecha de constitucion', data.incorporation_date),
          row('Pais de constitucion', data.country_of_incorporation),
          row('Descripcion de actividad', data.business_description),
        ]),
      },
      {
        title: 'Direccion legal y representante',
        description: 'Datos operativos del domicilio empresarial y del representante legal.',
        rows: compactRows([
          row('Direccion legal', data.business_street),
          row('Ciudad', data.business_city),
          row('Pais', data.business_country),
          row('Nombres representante', data.legal_rep_first_names),
          row('Apellidos representante', data.legal_rep_last_names),
          row('Cargo', data.legal_rep_position),
          row('Documento representante', data.legal_rep_id_number),
        ]),
      },
      {
        title: 'Perfil financiero',
        description: 'Motivo de uso, origen de fondos y volumen estimado declarado por el cliente.',
        rows: compactRows([
          row('Proposito de la cuenta', data.purpose),
          row('Origen de fondos', data.source_of_funds),
          row('Volumen mensual estimado', data.estimated_monthly_volume),
        ]),
      },
      {
        title: 'Beneficiarios finales',
        description: 'Resumen de socios o UBOs declarados en la etapa final del onboarding.',
        rows: ubos.length === 0
          ? []
          : ubos.flatMap((ubo, index) => {
              const normalized = normalizeObject(ubo)
              return compactRows([
                row(`UBO ${index + 1} nombre`, joinName(normalized.first_names, normalized.last_names)),
                row(`UBO ${index + 1} participacion`, normalized.percentage),
                row(`UBO ${index + 1} nacionalidad`, normalized.nationality),
              ])
            }),
      },
    ]
  }

  return [
    {
      title: 'Cuenta base',
      description: 'Datos visibles del alta de cuenta y del perfil operativo usado por la plataforma.',
      rows: compactRows([
        row('Correo', record.profiles?.email),
        row('Nombre en profile', record.profiles?.full_name),
        row('Estado del perfil', record.profiles?.onboarding_status ?? record.status),
        row('Fecha de creacion del expediente', formatDate(record.created_at)),
      ]),
    },
    {
      title: 'Identidad personal',
      description: 'Informacion de identificacion enviada por el usuario en su onboarding.',
      rows: compactRows([
        row('Nombres', data.first_names),
        row('Apellidos', data.last_names),
        row('Fecha de nacimiento', data.dob),
        row('Nacionalidad', data.nationality),
        row('Tipo de documento', data.id_document_type),
        row('Numero de documento', data.id_number),
        row('Vencimiento del documento', data.id_expiry),
      ]),
    },
    {
      title: 'Direccion declarada',
      description: 'Ubicacion residencial o de referencia cargada en el formulario.',
      rows: compactRows([
        row('Direccion', data.street),
        row('Ciudad', data.city),
        row('Estado / provincia', data.state_province),
        row('Pais', data.country),
        row('Codigo postal', data.postal_code),
      ]),
    },
    {
      title: 'Perfil financiero',
      description: 'Motivo de uso, ocupacion, origen de fondos y volumen estimado.',
      rows: compactRows([
        row('Ocupacion', data.occupation),
        row('Proposito de la cuenta', data.purpose),
        row('Origen de fondos', data.source_of_funds),
        row('Volumen mensual estimado', data.estimated_monthly_volume),
      ]),
    },
  ]
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

function formatDocumentLabel(value: string) {
  const normalized = stripUboPrefix(value)
  return DOCUMENT_LABELS[normalized] ?? humanizeKey(value)
}

function stripUboPrefix(value: string) {
  return value.replace(/^ubo_\d+_/, '')
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

function joinName(first: unknown, last: unknown) {
  const full = [readString(first), readString(last)].filter(Boolean).join(' ').trim()
  return full || 'No disponible'
}

function row(label: string, value: unknown): SummaryRow | null {
  if (value == null) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    return { label, value: trimmed }
  }

  return { label, value: String(value) }
}

function compactRows(rows: Array<SummaryRow | null>) {
  return rows.filter((row): row is SummaryRow => Boolean(row))
}

function isStoragePath(value: string) {
  if (DOCUMENT_KEYS.has(value)) return false
  return value.includes('/') && /\.(pdf|png|jpg|jpeg|webp)$/i.test(value)
}
