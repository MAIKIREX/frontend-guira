'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Search, Trash2, UserRound, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SupplierForm } from '@/features/payments/components/supplier-form'
import { cn, interactiveCardClassName } from '@/lib/utils'
import type { Supplier, PaymentRail, CreateSupplierPayload } from '@/types/supplier'

interface SuppliersSectionProps {
  userId: string
  suppliers: Supplier[]
  disabled?: boolean
  onCreateSupplier: (input: CreateSupplierPayload) => Promise<unknown>
  onUpdateSupplier: (supplierId: string, input: Partial<CreateSupplierPayload>) => Promise<unknown>
  onDeleteSupplier: (supplierId: string) => Promise<unknown>
}

const RAIL_LABELS: Record<PaymentRail, string> = {
  ach: '🇺🇸 ACH (USD)',
  wire: '🇺🇸 Wire (USD)',
  sepa: '🇪🇺 SEPA (EUR)',
  spei: '🇲🇽 SPEI (MXN)',
  pix: '🇧🇷 PIX (BRL)',
  bre_b: '🇨🇴 Bre-B (COP)',
  crypto: '₿ Crypto',
}

export function SuppliersSection({
  userId,
  suppliers,
  disabled,
  onCreateSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
}: SuppliersSectionProps) {
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [methodFilter, setMethodFilter] = useState<'all' | PaymentRail>('all')

  const filteredSuppliers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return suppliers.filter((supplier) => {
      const matchesFilter = methodFilter === 'all' || supplier.payment_rail === methodFilter
      const matchesSearch =
        normalizedSearch.length === 0 ||
        supplier.name.toLowerCase().includes(normalizedSearch) ||
        (supplier.contact_email ?? '').toLowerCase().includes(normalizedSearch) ||
        supplier.country.toLowerCase().includes(normalizedSearch)

      return matchesFilter && matchesSearch
    })
  }, [methodFilter, searchTerm, suppliers])

  async function handleSubmit(input: CreateSupplierPayload, supplierId?: string) {
    try {
      if (supplierId) {
        await onUpdateSupplier(supplierId, input)
        toast.success('Proveedor actualizado.')
      } else {
        await onCreateSupplier(input)
        toast.success('Proveedor creado exitosamente.')
      }

      setIsFormOpen(false)
      setEditingSupplier(null)
    } catch (error: any) {
      console.error('Failed to persist supplier', error)
      toast.error(error?.message || 'No se pudo guardar el proveedor.')
    }
  }

  async function handleDelete(supplier: Supplier) {
    if (!supplier.id || !confirm(`¿Eliminar a ${supplier.name}?`)) {
      return
    }

    try {
      await onDeleteSupplier(supplier.id)
      if (editingSupplier?.id === supplier.id) {
        setEditingSupplier(null)
      }
      toast.success('Proveedor eliminado.')
    } catch (error) {
      console.error('Failed to delete supplier', error)
      toast.error('No se pudo eliminar el proveedor.')
    }
  }

  function handleCreate() {
    setEditingSupplier(null)
    setIsFormOpen(true)
  }

  function handleEdit(supplier: Supplier) {
    setEditingSupplier(supplier)
    setIsFormOpen(true)
  }

  function handleBackToAgenda() {
    setIsFormOpen(false)
    setEditingSupplier(null)
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {isFormOpen ? (
        <SupplierForm
          disabled={disabled}
          editingSupplier={editingSupplier}
          key={editingSupplier?.id ?? 'new'}
          onBack={handleBackToAgenda}
          onSubmitSupplier={handleSubmit}
        />
      ) : (
        <>
          <section className="flex flex-col gap-4  p-6 ">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Proveedores</div>
                <h1 className="text-3xl font-semibold tracking-tight">Agenda de proveedores</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Administra tus destinatarios de pago y sus cuentas desde una sola agenda operativa.
                </p>
              </div>
              <Button disabled={disabled} onClick={handleCreate} size="lg" type="button">
                <Plus className="mr-2 h-4 w-4" />
                Agregar proveedor
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  className="h-10 pl-9" 
                  onChange={(event) => setSearchTerm(event.target.value)} 
                  placeholder="Buscar proveedores..." 
                  value={searchTerm} 
                />
              </div>
              <Select value={methodFilter} onValueChange={(value) => setMethodFilter(value as 'all' | PaymentRail)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {Object.entries(RAIL_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <Card className="border-border/70 bg-background ring-0">
            <CardHeader>
              <CardTitle>Destinatarios guardados</CardTitle>
              <CardDescription>
                Lista de todos los proveedores listos para recibir pagos a través de los diversos métodos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredSuppliers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                  {suppliers.length === 0
                    ? 'Aún no hay proveedores registrados. Usa el botón superior para crear el primero.'
                    : 'No encontramos proveedores con ese criterio de búsqueda.'}
                </div>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className={cn(
                      'flex flex-col gap-4 rounded-2xl border border-primary/20 bg-background/80 p-5 shadow-[inset_0_0_0_1px_hsl(var(--border)/0.55),0_0_0_4px_hsl(var(--primary)/0.04)] md:flex-row md:items-center md:justify-between',
                      interactiveCardClassName
                    )}
                  >
                    <div className="flex items-start gap-4 min-w-0 w-full md:w-auto">
                      <div className="flex size-11 flex-shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/30">
                        <UserRound className="size-5 text-muted-foreground" />
                      </div>
                      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:gap-8 md:items-center">
                        <div className="min-w-0">
                          <div className="truncate text-xl font-semibold">{supplier.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {supplier.bank_details?.bank_name as string ?? (supplier.payment_rail === 'crypto' ? 'Billetera Externa' : 'Cuenta Bancaria')}
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-2 shrink-0 md:flex-row md:items-center">
                          <Badge variant="outline">
                            {RAIL_LABELS[supplier.payment_rail] || supplier.payment_rail}
                          </Badge>
                          {supplier.bridge_external_account_id && (
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              En Bridge
                            </Badge>
                          )}
                        </div>
                        <div className="grid min-w-0 gap-1 text-sm text-muted-foreground md:border-l md:border-border/50 md:pl-8">
                          <div className="truncate">{supplier.country}</div>
                          {supplier.contact_email && <div className="truncate">{supplier.contact_email}</div>}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-end gap-2 md:mt-0">
                      <Button
                        className="text-muted-foreground hover:bg-primary/10 hover:text-primary cursor-pointer"
                        disabled={disabled}
                        onClick={() => handleEdit(supplier)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                        disabled={disabled}
                        onClick={() => handleDelete(supplier)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
