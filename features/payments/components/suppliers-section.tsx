'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Search, Trash2, UserRound, CheckCircle2, Bitcoin } from 'lucide-react'
import Flag from 'react-world-flags'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GuiraButton } from '@/components/shared/guira-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SupplierForm } from '@/features/payments/components/supplier-form'
import { cn } from '@/lib/utils'
import type { Supplier, PaymentRail, CreateSupplierPayload } from '@/types/supplier'

interface SuppliersSectionProps {
  userId: string
  suppliers: Supplier[]
  disabled?: boolean
  onCreateSupplier: (input: CreateSupplierPayload) => Promise<unknown>
  onUpdateSupplier: (supplierId: string, input: Partial<CreateSupplierPayload>) => Promise<unknown>
  onDeleteSupplier: (supplierId: string) => Promise<unknown>
}

export interface AddingRailTo {
  email: string
  name: string
  usedRails: string[]
  usedNetworks: string[]
}

const RAIL_LABELS: Record<PaymentRail, string> = {
  ach: 'ACH (USD)',
  wire: 'Wire (USD)',
  sepa: 'SEPA (EUR)',
  spei: 'SPEI (MXN)',
  pix: 'PIX (BRL)',
  bre_b: 'Bre-B (COP)',
  co_bank_transfer: 'CO Bank Transfer (COP)',
  faster_payments: 'Faster Payments (GBP)',
  crypto: 'Crypto',
}

const RAIL_FLAG_CODES: Record<PaymentRail, string | null> = {
  ach: 'US',
  wire: 'US',
  sepa: 'EU',
  spei: 'MX',
  pix: 'BR',
  bre_b: 'CO',
  co_bank_transfer: 'CO',
  faster_payments: 'GB',
  crypto: null,
}

interface SupplierGroup {
  key: string
  name: string
  email?: string
  country: string
  rails: Supplier[]
}

function RailChip({
  supplier,
  disabled,
  onEdit,
  onDelete,
}: {
  supplier: Supplier
  disabled?: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const isCrypto = supplier.payment_rail === 'crypto'
  const network = isCrypto ? (supplier.bank_details?.wallet_network as string) : null
  const currency = isCrypto ? (supplier.bank_details?.wallet_currency as string)?.toUpperCase() : null
  const flagCode = RAIL_FLAG_CODES[supplier.payment_rail]

  return (
    <div className="group/chip flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/20 px-3 py-1.5 text-sm transition-colors hover:border-border hover:bg-muted/40">
      <span className="flex size-4 shrink-0 items-center justify-center">
        {isCrypto ? (
          <Bitcoin className="size-3.5 text-primary" />
        ) : flagCode ? (
          <Flag code={flagCode} className="h-full w-full rounded-sm object-cover" />
        ) : (
          <UserRound className="size-3.5 text-muted-foreground" />
        )}
      </span>
      <span className="font-medium">
        {isCrypto
          ? `${network ? network.charAt(0).toUpperCase() + network.slice(1) : 'Crypto'} · ${currency ?? 'USDC'}`
          : RAIL_LABELS[supplier.payment_rail]}
      </span>
      {supplier.bridge_external_account_id && (
        <CheckCircle2 className="size-3 text-emerald-500" />
      )}
      <div className="ml-0.5 hidden items-center gap-0.5 group-hover/chip:flex">
        <button
          type="button"
          disabled={disabled}
          onClick={onEdit}
          className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
          title="Editar"
        >
          <Pencil className="size-3" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          title="Eliminar"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  )
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
  const [addingRailTo, setAddingRailTo] = useState<AddingRailTo | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [methodFilter, setMethodFilter] = useState<'all' | PaymentRail>('all')

  const groupedSuppliers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const filtered = suppliers.filter((s) => {
      const matchesFilter = methodFilter === 'all' || s.payment_rail === methodFilter
      const matchesSearch =
        normalizedSearch.length === 0 ||
        s.name.toLowerCase().includes(normalizedSearch) ||
        (s.contact_email ?? '').toLowerCase().includes(normalizedSearch) ||
        s.country.toLowerCase().includes(normalizedSearch)
      return matchesFilter && matchesSearch
    })

    const map = new Map<string, SupplierGroup>()
    for (const s of filtered) {
      // Proveedores sin email son grupos individuales (no se agrupan entre sí)
      const key = s.contact_email || `__noemail__${s.id}`
      if (!map.has(key)) {
        map.set(key, { key, name: s.name, email: s.contact_email, country: s.country, rails: [] })
      }
      map.get(key)!.rails.push(s)
    }

    return [...map.values()]
  }, [suppliers, searchTerm, methodFilter])

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
      setAddingRailTo(null)
    } catch (error: any) {
      console.error('Failed to persist supplier', error)
      toast.error(error?.message || 'No se pudo guardar el proveedor.')
    }
  }

  async function handleDelete(supplier: Supplier) {
    if (!supplier.id || !confirm(`¿Eliminar "${supplier.name}" (${RAIL_LABELS[supplier.payment_rail]})?`)) {
      return
    }
    try {
      await onDeleteSupplier(supplier.id)
      if (editingSupplier?.id === supplier.id) setEditingSupplier(null)
      toast.success('Proveedor eliminado.')
    } catch (error) {
      console.error('Failed to delete supplier', error)
      toast.error('No se pudo eliminar el proveedor.')
    }
  }

  function handleCreate() {
    setEditingSupplier(null)
    setAddingRailTo(null)
    setIsFormOpen(true)
  }

  function handleEdit(supplier: Supplier) {
    setEditingSupplier(supplier)
    setAddingRailTo(null)
    setIsFormOpen(true)
  }

  function handleAddRail(group: SupplierGroup) {
    const usedRails = group.rails
      .filter((s) => s.payment_rail !== 'crypto')
      .map((s) => s.payment_rail as string)
    const usedNetworks = group.rails
      .filter((s) => s.payment_rail === 'crypto')
      .map((s) => (s.bank_details?.wallet_network as string))
      .filter(Boolean)

    setAddingRailTo({ email: group.email!, name: group.name, usedRails, usedNetworks })
    setEditingSupplier(null)
    setIsFormOpen(true)
  }

  function handleBackToAgenda() {
    setIsFormOpen(false)
    setEditingSupplier(null)
    setAddingRailTo(null)
  }

  // Cuando el formulario de nuevo proveedor detecta un email ya existente,
  // puede redirigir al flujo "añadir rail" directamente.
  function handleSwitchToAddRail(email: string, info: { supplierName: string; usedRails: string[]; usedNetworks: string[] }) {
    setAddingRailTo({ email, name: info.supplierName, usedRails: info.usedRails, usedNetworks: info.usedNetworks })
    setEditingSupplier(null)
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {isFormOpen ? (
        <SupplierForm
          disabled={disabled}
          editingSupplier={editingSupplier}
          addingRailTo={addingRailTo}
          key={editingSupplier?.id ?? (addingRailTo ? `rail-${addingRailTo.email}` : 'new')}
          onBack={handleBackToAgenda}
          onSubmitSupplier={handleSubmit}
          onSwitchToAddRail={handleSwitchToAddRail}
        />
      ) : (
        <>
          <section className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Proveedores</div>
                <h1 className="text-4xl sm:text-[3rem] sm:leading-[1.1] font-extrabold tracking-tight text-foreground">Agenda de proveedores</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Administra tus destinatarios de pago y sus cuentas desde una sola agenda operativa.
                </p>
              </div>
              <GuiraButton disabled={disabled} onClick={handleCreate} size="lg" type="button" iconStart={Plus}>
                Agregar proveedor
              </GuiraButton>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-10 pl-9"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar proveedores..."
                  value={searchTerm}
                />
              </div>
              <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v as 'all' | PaymentRail)}>
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

          <Card className="rounded-[2rem] border-border/50 bg-background shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <CardHeader className="px-6 py-6 sm:px-8">
              <CardTitle className="text-xl font-bold tracking-tight">Destinatarios guardados</CardTitle>
              <CardDescription className="text-sm">
                Cada contacto agrupa todos sus métodos de cobro. Usa "Añadir método" para registrar una nueva cuenta o red.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-6 pb-6 sm:px-8 sm:pb-8">
              {groupedSuppliers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                  {suppliers.length === 0
                    ? 'Aún no hay proveedores registrados. Usa el botón superior para crear el primero.'
                    : 'No encontramos proveedores con ese criterio de búsqueda.'}
                </div>
              ) : (
                groupedSuppliers.map((group) => {
                  const firstRail = group.rails[0]
                  const flagCode = RAIL_FLAG_CODES[firstRail.payment_rail]
                  const hasEmail = !!group.email

                  return (
                    <div
                      key={group.key}
                      className="rounded-2xl border border-border/40 bg-background p-4 transition-all duration-200 hover:border-border/70 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]"
                    >
                      {/* Cabecera del contacto */}
                      <div className="mb-3 flex items-center gap-3">
                        <div className={cn(
                          'flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border',
                          flagCode
                            ? 'border-border/70 bg-muted/30'
                            : 'border-primary bg-primary shadow-sm'
                        )}>
                          {flagCode ? (
                            <Flag code={flagCode} className="h-full w-full object-cover" fallback={<UserRound className="size-5 text-muted-foreground" />} />
                          ) : (
                            <Bitcoin className="size-5 text-primary-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold">{group.name}</div>
                          {group.email && (
                            <div className="truncate text-sm text-muted-foreground">{group.email}</div>
                          )}
                        </div>
                      </div>

                      {/* Rails del contacto */}
                      <div className="flex flex-wrap gap-2">
                        {group.rails.map((supplier) => (
                          <RailChip
                            key={supplier.id}
                            supplier={supplier}
                            disabled={disabled}
                            onEdit={() => handleEdit(supplier)}
                            onDelete={() => handleDelete(supplier)}
                          />
                        ))}

                        {hasEmail && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={disabled}
                            onClick={() => handleAddRail(group)}
                            className="h-8 rounded-full border-dashed px-3 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
                          >
                            <Plus className="mr-1 size-3" />
                            Añadir método
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
