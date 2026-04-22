'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Pencil, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { RejectionTemplatesService, type RejectionTemplate } from '@/services/admin/rejection-templates.service'

const CATEGORIES = [
  { value: 'in_review', label: 'Solicitar Correcciones (Onboarding)' },
  { value: 'rejected', label: 'Rechazo (Onboarding)' },
  { value: 'approved', label: 'Aprobado (Onboarding)' },
  { value: 'failed', label: 'Fallo (Órdenes)' },
  { value: 'quote', label: 'Cotización (Órdenes)' },
  { value: 'sent', label: 'Enviado (Órdenes)' },
  { value: 'completed', label: 'Completado (Órdenes)' },
]

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<RejectionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ label: string; body: string; sort_order: number }>({ label: '', body: '', sort_order: 0 })

  async function fetchAll() {
    try {
      setLoading(true)
      const category = filterCategory === 'all' ? undefined : filterCategory
      const data = await RejectionTemplatesService.getAllTemplates(category)
      setTemplates(data)
    } catch {
      toast.error('No se pudieron cargar las plantillas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [filterCategory])

  function startEditing(t: RejectionTemplate) {
    setEditingId(t.id)
    setEditData({ label: t.label, body: t.body, sort_order: t.sort_order })
  }

  async function saveEdit(id: string) {
    try {
      await RejectionTemplatesService.updateTemplate(id, editData)
      toast.success('Plantilla actualizada.')
      setEditingId(null)
      fetchAll()
    } catch {
      toast.error('Error al actualizar.')
    }
  }

  async function toggleActive(t: RejectionTemplate) {
    try {
      await RejectionTemplatesService.updateTemplate(t.id, { is_active: !t.is_active })
      toast.success(t.is_active ? 'Plantilla desactivada.' : 'Plantilla activada.')
      fetchAll()
    } catch {
      toast.error('Error al cambiar estado.')
    }
  }

  const categoryLabel = (cat: string) => CATEGORIES.find(c => c.value === cat)?.label ?? cat

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plantillas de Respuesta</h1>
          <p className="text-sm text-muted-foreground">Gestiona los comentarios rápidos que el staff usa para acciones de onboarding y órdenes.</p>
        </div>
        <CreateTemplateDialog onCreated={fetchAll} />
      </div>

      {/* ── Filtro por categoría ── */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium">Categoría:</Label>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Tabla ── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
          No hay plantillas{filterCategory !== 'all' ? ` en la categoría "${categoryLabel(filterCategory)}"` : ''}. Crea una nueva con el botón de arriba.
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Categoría</th>
                <th className="px-4 py-3 text-left font-medium">Label</th>
                <th className="px-4 py-3 text-left font-medium">Texto</th>
                <th className="px-4 py-3 text-center font-medium w-[60px]">Orden</th>
                <th className="px-4 py-3 text-center font-medium w-[80px]">Activo</th>
                <th className="px-4 py-3 text-center font-medium w-[100px]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className={`border-b transition-colors ${!t.is_active ? 'opacity-50 bg-muted/20' : 'hover:bg-muted/30'}`}>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {editingId === t.id ? (
                      <Input value={editData.label} onChange={(e) => setEditData(p => ({ ...p, label: e.target.value }))} className="h-8" />
                    ) : (
                      <span className="font-medium">{t.label}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[300px]">
                    {editingId === t.id ? (
                      <Textarea value={editData.body} onChange={(e) => setEditData(p => ({ ...p, body: e.target.value }))} className="min-h-[60px]" />
                    ) : (
                      <span className="text-muted-foreground line-clamp-2">{t.body}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingId === t.id ? (
                      <Input type="number" value={editData.sort_order} onChange={(e) => setEditData(p => ({ ...p, sort_order: Number(e.target.value) }))} className="h-8 w-16 mx-auto text-center" />
                    ) : (
                      t.sort_order
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t)} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingId === t.id ? (
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEdit(t.id)}>
                          <Save className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEditing(t)}>
                        <Pencil className="size-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CreateTemplateDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ category: 'in_review', label: '', body: '', sort_order: 0 })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.label.trim() || !form.body.trim()) {
      toast.error('Label y texto son requeridos.')
      return
    }
    try {
      setLoading(true)
      await RejectionTemplatesService.createTemplate(form)
      toast.success('Plantilla creada.')
      setOpen(false)
      setForm({ category: 'in_review', label: '', body: '', sort_order: 0 })
      onCreated()
    } catch {
      toast.error('Error al crear la plantilla.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="default" />}>
        <Plus className="size-4 mr-2" />
        Nueva plantilla
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Plantilla</DialogTitle>
          <DialogDescription>Agrega una nueva plantilla de respuesta rápida para el staff.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Label (nombre corto)</Label>
            <Input value={form.label} onChange={(e) => setForm(p => ({ ...p, label: e.target.value }))} placeholder="Ej: Documento ilegible" />
          </div>
          <div className="space-y-2">
            <Label>Texto completo</Label>
            <Textarea value={form.body} onChange={(e) => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Ej: Documento de identidad ilegible, favor resubir en mejor resolución" />
          </div>
          <div className="space-y-2">
            <Label>Orden de visualización</Label>
            <Input type="number" value={form.sort_order} onChange={(e) => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
