'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  AlertTriangle,
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
  X,
} from 'lucide-react'
import { GuiraLoadingInline } from '@/components/shared/guira-loading'
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
  fieldName?: string
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
        <GuiraLoadingInline />
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

const DRAFT_KEY = (id: string) => `guira_audit_draft_${id}`

function loadDraft(reviewId: string): { fieldObservations: Record<string, string>; reason: string } {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(reviewId))
    if (!raw) return { fieldObservations: {}, reason: '' }
    return JSON.parse(raw)
  } catch {
    return { fieldObservations: {}, reason: '' }
  }
}

function saveDraft(reviewId: string, fieldObservations: Record<string, string>, reason: string) {
  try {
    localStorage.setItem(DRAFT_KEY(reviewId), JSON.stringify({ fieldObservations, reason }))
  } catch {
    // localStorage no disponible
  }
}

function clearDraft(reviewId: string) {
  try {
    localStorage.removeItem(DRAFT_KEY(reviewId))
  } catch {
    // ignorar
  }
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

  // ── Audit Mode State — cargado desde borrador localStorage al montar ──
  const initialDraft = useMemo(() => loadDraft(reviewId), [reviewId])
  const [fieldObservations, setFieldObservations] = useState<Record<string, string>>(initialDraft.fieldObservations)
  const [auditGlobalReason, setAuditGlobalReason] = useState(initialDraft.reason)
  const [submittingAudit, setSubmittingAudit] = useState(false)
  const auditCount = Object.keys(fieldObservations).length

  const addObservation = useCallback((key: string, message: string) => {
    setFieldObservations(prev => {
      const next = { ...prev, [key]: message }
      saveDraft(reviewId, next, auditGlobalReason)
      return next
    })
  }, [reviewId, auditGlobalReason])

  const removeObservation = useCallback((key: string) => {
    setFieldObservations(prev => {
      const next = { ...prev }
      delete next[key]
      saveDraft(reviewId, next, auditGlobalReason)
      return next
    })
  }, [reviewId, auditGlobalReason])

  function handleReasonChange(value: string) {
    setAuditGlobalReason(value)
    saveDraft(reviewId, fieldObservations, value)
  }

  async function submitCorrections() {
    if (auditCount === 0) return
    setSubmittingAudit(true)
    try {
      const updatedRecord = await ComplianceAdminService.updateOnboardingStatus({
        actor,
        record,
        status: 'in_review',
        reason: auditGlobalReason.trim() || 'Se solicitan correcciones en los campos marcados.',
        fieldObservations,
      })
      toast.success('Solicitud de correcciones enviada.')
      clearDraft(reviewId)
      setFieldObservations({})
      setAuditGlobalReason('')
      onUpdated(updatedRecord)
    } catch (err) {
      console.error('Failed to submit corrections', err)
      toast.error('No se pudo enviar la solicitud de correcciones.')
    } finally {
      setSubmittingAudit(false)
    }
  }

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
          <TabsTrigger className="rounded-none px-4 py-3" value="review">Revisión</TabsTrigger>
        </TabsList>

        <TabsContent value="form-data" className="pt-6">
          <div className={`mx-auto max-w-4xl space-y-12 ${auditCount > 0 ? 'pb-40' : ''}`}>
            {sections.map((section) => (
              <SectionBlock
                key={section.title}
                section={section}
                fieldObservations={fieldObservations}
                onAddObservation={addObservation}
                onRemoveObservation={removeObservation}
              />
            ))}
          </div>
        </TabsContent>

        {record.previous_data && (
          <TabsContent value="diff-view" className="pt-6">
            <div className="mx-auto max-w-4xl space-y-12">
              {buildDiffSections(record, record.previous_data, data).map((section) => (
                <SectionDiffBlock key={section.title} section={section} />
              ))}
            </div>
          </TabsContent>
        )}

        <TabsContent value="documents" className="pt-6">
          <div className={`mx-auto max-w-4xl space-y-12 ${auditCount > 0 ? 'pb-40' : ''}`}>
            {mergedDocuments.length === 0 ? (
              <EmptyState message="No se encontraron documentos asociados a este expediente." />
            ) : (
              mergedDocuments.map((document, index) => (
                <DocumentBlock
                  key={`${document.doc_type}-${document.storage_path}-${index}`}
                  document={document}
                  caseTypeLabel={summary.caseTypeLabel}
                  fieldObservations={fieldObservations}
                  onAddObservation={addObservation}
                  onRemoveObservation={removeObservation}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="review" className="pt-6">
          <div className="mx-auto max-w-4xl">
            <ActivityTab reviewId={reviewId} record={record} actor={actor} onUpdated={onUpdated} />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Sticky Audit Action Bar ── */}
      {auditCount > 0 && (
        <div className="sticky bottom-0 z-50 -mx-6 mt-6 border-t border-amber-500/30 bg-background/95 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md sm:-mx-8">
          <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-4" />
              <span>{auditCount} {auditCount === 1 ? 'campo marcado' : 'campos marcados'}</span>
            </div>
            <input
              className="h-9 flex-1 rounded-lg border border-border/50 bg-background/80 px-3 text-[13px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              placeholder="Mensaje general al cliente (opcional)..."
              value={auditGlobalReason}
              onChange={(e) => handleReasonChange(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => { clearDraft(reviewId); setFieldObservations({}); setAuditGlobalReason('') }}
              >
                Descartar
              </Button>
              <Button
                disabled={submittingAudit}
                className="h-10 bg-amber-600 px-5 text-sm font-semibold text-white shadow-md hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
                onClick={submitCorrections}
              >
                {submittingAudit ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Send className="mr-2 size-4" />
                )}
                {submittingAudit ? 'Enviando...' : 'Solicitar Correcciones'}
              </Button>
            </div>
          </div>
        </div>
      )}
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
  onUpdated,
}: {
  reviewId: string
  record: StaffOnboardingRecord
  actor: StaffActor
  onUpdated: (record: StaffOnboardingRecord) => void
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
        <GuiraLoadingInline />
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {/* ── Bloque 1: Estado del expediente ── */}
      <div className="space-y-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-800 dark:text-cyan-400/90">
          Estado del expediente
        </div>
        <CompactInfoList
          rows={[
            { label: 'Estado KYC/KYB', value: record.status },
            { label: 'Fecha de envío', value: formatDate(record.created_at) },
            { label: 'Fecha de revisión', value: formatDate(record.updated_at) },
            { label: 'Comentarios del revisor', value: record.observations || 'Sin comentarios registrados' },
            { label: 'Bridge customer ID', value: record.bridge_customer_id || 'Pendiente' },
          ]}
        />
      </div>

      {/* ── Bloque 2: Acciones ── */}
      <div className="space-y-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-800 dark:text-cyan-400/90">
          Acciones
        </div>
        <div className="flex flex-wrap gap-2">
          <OnboardingActions actor={actor} onUpdated={onUpdated} record={record} />
        </div>
      </div>

      {/* ── Bloque 3: Historial de decisiones ── */}
      <div className="space-y-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-800 dark:text-cyan-400/90">
          Historial de decisiones
        </div>
        {events.length === 0 ? (
          <EmptyState message="No hay eventos registrados para este expediente." />
        ) : (
          <div className="divide-y divide-border/50">
            {events.map((event, idx) => (
              <div
                key={event.id ?? idx}
                className="flex gap-4 py-5"
              >
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-800/10 dark:bg-cyan-400/15">
                  <span className="text-[11px] font-bold text-sky-800 dark:text-cyan-400">{idx + 1}</span>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
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
                    <span className="text-[12px] text-slate-500 dark:text-slate-400">
                      {formatDate(event.created_at)}
                    </span>
                  </div>
                  {event.reason && (
                    <p className="text-[13.5px] leading-relaxed text-slate-900 dark:text-slate-100">{event.reason}</p>
                  )}
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-100 p-2.5 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                      {JSON.stringify(event.metadata, null, 2)}
                    </pre>
                  )}
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">
                    Actor: {event.actor_id?.slice(0, 8) ?? 'Desconocido'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bloque 4: Comentarios internos ── */}
      <div className="space-y-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-800 dark:text-cyan-400/90">
          Comentarios internos
        </div>

        {comments.length === 0 ? (
          <EmptyState message="No hay comentarios registrados." />
        ) : (
          <div className="divide-y divide-border/50">
            {comments.map((comment, idx) => (
              <div
                key={comment.id ?? idx}
                className="py-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13.5px] leading-relaxed text-slate-900 dark:text-slate-100">{comment.body}</p>
                  {comment.is_internal && (
                    <Badge variant="outline" className="shrink-0 border-sky-800/20 bg-sky-800/5 text-sky-800 text-[10px] dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-300">
                      Interno
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                  <span>Por: {comment.author_id?.slice(0, 8) ?? 'Desconocido'}</span>
                  <span>{formatDate(comment.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form para agregar comentario */}
        <div className="space-y-3 pt-2">
          <Textarea
            className="min-h-[80px] resize-none border-border/50 bg-background/60 focus-visible:ring-sky-800/30 dark:focus-visible:ring-cyan-400/30"
            placeholder="Escribe un comentario interno..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              disabled={!newComment.trim() || submitting}
              size="sm"
              className="bg-sky-800 text-white hover:bg-sky-900 dark:bg-cyan-500/20 dark:text-cyan-300 dark:hover:bg-cyan-500/30"
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
      </div>
    </div>
  )
}

// ── Section components ──────────────────────────────────────────────────────

type AuditProps = {
  fieldObservations?: Record<string, string>
  onAddObservation?: (key: string, message: string) => void
  onRemoveObservation?: (key: string) => void
}

function SectionBlock({ section, fieldObservations, onAddObservation, onRemoveObservation }: { section: DetailSection } & AuditProps) {
  return (
    <div className="space-y-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-800 dark:text-cyan-400/90">
        {section.title}
      </div>
      <div>
        {section.rows.length === 0 ? (
          <EmptyState message="No hay datos cargados en esta seccion." />
        ) : (
          <CompactInfoList
            rows={section.rows}
            fieldObservations={fieldObservations}
            onAddObservation={onAddObservation}
            onRemoveObservation={onRemoveObservation}
          />
        )}
      </div>
    </div>
  )
}

function CompactInfoList({ rows, fieldObservations = {}, onAddObservation, onRemoveObservation }: { rows: SummaryRow[] } & AuditProps) {
  return (
    <div className="divide-y divide-border/50">
      {rows.map((row) => (
        <AuditableRow
          key={row.label}
          fieldKey={row.fieldName ?? row.label}
          label={row.label}
          value={row.value}
          observation={fieldObservations[row.label]}
          onAdd={onAddObservation}
          onRemove={onRemoveObservation}
        />
      ))}
    </div>
  )
}

function AuditableRow({
  fieldKey,
  label,
  value,
  observation,
  onAdd,
  onRemove,
}: {
  fieldKey: string
  label: string
  value: string
  observation?: string
  onAdd?: (key: string, message: string) => void
  onRemove?: (key: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const isRejected = observation !== undefined
  const isAuditable = Boolean(onAdd && onRemove)

  function handleConfirm() {
    if (!draft.trim() || !onAdd) return
    onAdd(fieldKey, draft.trim())
    setDraft('')
    setEditing(false)
  }

  function handleCancel() {
    setDraft('')
    setEditing(false)
  }

  function handleRemove() {
    if (!onRemove) return
    onRemove(fieldKey)
    setEditing(false)
    setDraft('')
  }

  return (
    <div className={`group relative py-4 transition-colors ${isRejected ? 'rounded-lg bg-amber-500/5' : ''}`}>
      <div className="grid gap-4 md:grid-cols-[260px_1fr] md:items-center">
        <div className="text-[13.5px] font-medium text-slate-600 dark:text-slate-400">
          {label}
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex-1 text-[13.5px] font-semibold ${isRejected ? 'text-amber-800 dark:text-amber-300' : 'text-slate-900 dark:text-slate-100'}`}>
            {value}
          </div>
          {!isRejected && !editing && isAuditable && (
            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/40 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-600 group-hover:opacity-100 dark:hover:text-red-400"
              title="Marcar error en este campo"
              onClick={() => setEditing(true)}
            >
              <AlertTriangle className="size-3.5" />
            </button>
          )}
          {isRejected && isAuditable && (
            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-amber-600 transition-all hover:bg-red-500/10 hover:text-red-600 dark:text-amber-400"
              title="Quitar observación"
              onClick={handleRemove}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inline observation input */}
      {editing && !isRejected && (
        <div className="mt-3 flex items-center gap-2 pl-0 md:pl-[276px]">
          <input
            autoFocus
            className="h-8 flex-1 rounded-md border border-amber-400/40 bg-amber-50/50 px-3 text-[12.5px] text-slate-800 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 dark:bg-amber-900/20 dark:text-slate-200"
            placeholder="¿Por qué este campo necesita corrección?"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm() } if (e.key === 'Escape') handleCancel() }}
          />
          <Button size="sm" variant="ghost" className="h-8 text-[12px] text-muted-foreground" onClick={handleCancel}>Cancelar</Button>
          <Button size="sm" className="h-8 bg-amber-600 text-[12px] text-white hover:bg-amber-700" disabled={!draft.trim()} onClick={handleConfirm}>Marcar</Button>
        </div>
      )}

      {/* Show saved observation */}
      {isRejected && (
        <div className="mt-2 flex items-center gap-2 pl-0 md:pl-[276px]">
          <AlertTriangle className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-[12.5px] text-amber-700 dark:text-amber-400">{observation}</span>
        </div>
      )}
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
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-800 dark:text-cyan-400/90">
          {section.title}
        </div>
        {hasChanges && (
          <Badge variant="outline" className="border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300">
            Cambios detectados
          </Badge>
        )}
      </div>

      <div className="divide-y divide-border/50">
        {section.rows.map((row) => (
          <div key={row.label} className="grid gap-4 py-4 md:grid-cols-[260px_1fr] md:items-center">
            <div className="text-[13.5px] font-medium text-slate-600 dark:text-slate-400">
              {row.label}
            </div>
            <div className={`grid gap-4 ${row.isChanged ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
              {row.isChanged ? (
                <>
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-[13.5px] font-medium line-through text-destructive/80">
                    {row.oldValue || <span className="text-[12px] italic text-muted-foreground">Ninguno</span>}
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[13.5px] font-semibold text-emerald-800 dark:text-emerald-300">
                    {row.newValue || <span className="text-[12px] italic text-muted-foreground">Eliminado</span>}
                  </div>
                </>
              ) : (
                <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">
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

function DocumentBlock({
  document,
  caseTypeLabel,
  fieldObservations,
  onAddObservation,
  onRemoveObservation,
}: {
  document: InlineDocument
  caseTypeLabel: string
} & AuditProps) {
  const docKey = document.doc_type
  const observation = fieldObservations[docKey]
  const isRejected = observation !== undefined
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function handleConfirm() {
    if (!draft.trim()) return
    onAddObservation(docKey, draft.trim())
    setDraft('')
    setEditing(false)
  }

  return (
    <div className={`space-y-6 transition-colors ${isRejected ? 'rounded-xl bg-amber-500/5 p-4' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-2">
        <div className={`text-[11px] font-bold uppercase tracking-[0.2em] ${isRejected ? 'text-amber-700 dark:text-amber-400' : 'text-sky-800 dark:text-cyan-400/90'}`}>
          {formatDocumentLabel(document.doc_type)}
        </div>
        <div className="flex items-center gap-2">
          <Badge className="border-sky-800/20 bg-sky-800/5 text-sky-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-300" variant="outline">
            {document.source === 'documents' ? 'Tabla Documents' : 'Payload Onboarding'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_260px]">
        <div className="divide-y divide-border/50">
          <MetaRow icon={FileText} label="Tipo de documento" value={formatDocumentLabel(document.doc_type)} />
          <MetaRow icon={CalendarDays} label="Fecha de carga" value={formatDate(document.created_at)} />
          <MetaRow icon={Mail} label="Mime / Origen" value={document.mime_type ?? (document.source === 'documents' ? 'Registrado en documents' : 'Detectado desde payload')} />
          <MetaRow icon={ScanSearch} label="Caso asociado" value={caseTypeLabel} />
          <MetaRow icon={FileText} label="Ruta de almacenamiento" value={document.storage_path} breakValue />
        </div>

        <div className="space-y-3">
          <DocumentPreview document={document} />

          {/* Reject document button */}
          {!isRejected && !editing && (
            <button
              type="button"
              className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 text-[13px] font-medium text-amber-700 transition-colors hover:bg-amber-500/15 dark:text-amber-400"
              onClick={() => setEditing(true)}
            >
              <AlertTriangle className="size-3.5" />
              Rechazar documento
            </button>
          )}

          {editing && !isRejected && (
            <div className="space-y-2">
              <input
                autoFocus
                className="h-8 w-full rounded-md border border-amber-400/40 bg-amber-50/50 px-3 text-[12.5px] text-slate-800 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 dark:bg-amber-900/20 dark:text-slate-200"
                placeholder="¿Por qué se rechaza este documento?"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm() } if (e.key === 'Escape') { setEditing(false); setDraft('') } }}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="h-7 flex-1 text-[12px] text-muted-foreground" onClick={() => { setEditing(false); setDraft('') }}>Cancelar</Button>
                <Button size="sm" className="h-7 flex-1 bg-amber-600 text-[12px] text-white hover:bg-amber-700" disabled={!draft.trim()} onClick={handleConfirm}>Confirmar</Button>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="flex-1">
                <span className="text-[12.5px] text-amber-700 dark:text-amber-400">{observation}</span>
              </div>
              <button
                type="button"
                className="flex size-6 shrink-0 items-center justify-center rounded text-amber-600 hover:bg-red-500/10 hover:text-red-600 dark:text-amber-400"
                onClick={() => onRemoveObservation(docKey)}
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetaRow({
  icon: Icon,
  label,
  value,
  breakValue,
}: {
  icon: typeof FileText
  label: string
  value: string
  breakValue?: boolean
}) {
  return (
    <div className="grid gap-4 py-4 md:grid-cols-[220px_1fr] md:items-center">
      <div className="flex items-center gap-2 text-[13.5px] font-medium text-slate-600 dark:text-slate-400">
        <Icon className="size-4 opacity-70" />
        <span>{label}</span>
      </div>
      <div className={`text-[13.5px] font-semibold text-slate-900 dark:text-slate-100 ${breakValue ? 'break-all' : ''}`}>
        {value}
      </div>
    </div>
  )
}

function DocumentPreview({ document }: { document: InlineDocument }) {
  if (!document.signed_url) {
    return (
      <div className="flex min-h-[160px] w-full items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/5 p-4 text-center text-[13.5px] text-muted-foreground">
        Sin vista previa disponible
      </div>
    )
  }

  const lowerPath = document.storage_path.toLowerCase()
  const isImage = /\.(png|jpg|jpeg|webp)$/i.test(lowerPath)
  const isPdf = /\.pdf$/i.test(lowerPath)

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm transition-all hover:shadow-md">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={formatDocumentLabel(document.doc_type)} className="h-[180px] w-full object-cover" src={document.signed_url} />
        ) : isPdf ? (
          <iframe className="h-[180px] w-full" src={document.signed_url} title={formatDocumentLabel(document.doc_type)} />
        ) : (
          <div className="flex h-[180px] items-center justify-center text-[13.5px] text-muted-foreground">Vista previa no soportada</div>
        )}
      </div>
      <a
        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-sky-800 px-3 text-[13.5px] font-medium text-white transition-colors hover:bg-sky-900 dark:bg-cyan-500/20 dark:text-cyan-300 dark:hover:bg-cyan-500/30"
        href={document.signed_url}
        rel="noreferrer"
        target="_blank"
      >
        Ver archivo original
        <ExternalLink className="size-3.5" />
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
          row('Razon social', data.company_legal_name, 'legal_name'),
          row('Numero de registro', data.registration_number, 'registration_number'),
          row('NIT / Tax ID', data.tax_id, 'tax_id'),
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
          row('Direccion legal', data.business_street, 'address1'),
          row('Ciudad', data.business_city, 'city'),
          row('Pais', data.business_country, 'country'),
          row('Nombres representante', data.legal_rep_first_names, 'legal_rep_first_name'),
          row('Apellidos representante', data.legal_rep_last_names, 'legal_rep_last_name'),
          row('Cargo', data.legal_rep_position),
          row('Documento representante', data.legal_rep_id_number),
        ]),
      },
      {
        title: 'Perfil financiero',
        description: 'Motivo de uso, origen de fondos y volumen estimado declarado por el cliente.',
        rows: compactRows([
          row('Proposito de la cuenta', data.purpose, 'account_purpose'),
          row('Origen de fondos', data.source_of_funds, 'source_of_funds'),
          row('Volumen mensual estimado', data.estimated_monthly_volume, 'expected_monthly_payments_usd'),
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
        row('Nombres', data.first_names, 'first_name'),
        row('Segundo nombre', data.middle_name, 'middle_name'),
        row('Apellidos', data.last_names, 'last_name'),
        row('Fecha de nacimiento', data.dob, 'date_of_birth'),
        row('Nacionalidad', data.nationality, 'nationality'),
        row('Tipo de documento', data.id_document_type, 'id_type'),
        row('Numero de documento', data.id_number, 'id_number'),
        row('Vencimiento del documento', data.id_expiry, 'id_expiry_date'),
        row('Tax ID', data.tax_id),
        row('Telefono', data.phone),
      ]),
    },
    {
      title: 'Direccion declarada',
      description: 'Ubicacion residencial o de referencia cargada en el formulario.',
      rows: compactRows([
        row('Direccion', data.street, 'address1'),
        row('Direccion adicional', data.street2),
        row('Ciudad', data.city, 'city'),
        row('Estado / provincia', data.state_province, 'state'),
        row('Pais', data.country, 'country'),
        row('Codigo postal', data.postal_code, 'postal_code'),
        row('Pais de residencia', data.country_of_residence),
      ]),
    },
    {
      title: 'Perfil financiero',
      description: 'Motivo de uso, ocupacion, origen de fondos y volumen estimado.',
      rows: compactRows([
        row('Ocupacion', data.occupation, 'most_recent_occupation'),
        row('Estatus laboral', data.employment_status),
        row('Proposito de la cuenta', data.purpose, 'account_purpose'),
        row('Proposito (especificacion)', data.purpose_other),
        row('Origen de fondos', data.source_of_funds, 'source_of_funds'),
        row('Volumen mensual estimado', data.estimated_monthly_volume, 'expected_monthly_payments_usd'),
        row('Es PEP', data.is_pep != null ? (data.is_pep ? 'Sí' : 'No') : null),
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

function row(label: string, value: unknown, fieldName?: string): SummaryRow | null {
  if (value == null) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    return { label, value: trimmed, fieldName }
  }

  return { label, value: String(value), fieldName }
}

function compactRows(rows: Array<SummaryRow | null>) {
  return rows.filter((row): row is SummaryRow => Boolean(row))
}

function isStoragePath(value: string) {
  if (DOCUMENT_KEYS.has(value)) return false
  return value.includes('/') && /\.(pdf|png|jpg|jpeg|webp)$/i.test(value)
}
