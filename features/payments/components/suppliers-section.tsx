'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Search, Trash2, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SupplierForm } from '@/features/payments/components/supplier-form'
import { parseSupplierPaymentMethods } from '@/features/payments/lib/supplier-methods'
import type { SupplierUpsertInput } from '@/types/payment-order'
import type { Supplier, SupplierPaymentMethod } from '@/types/supplier'

interface SuppliersSectionProps {
  userId: string
  suppliers: Supplier[]
  disabled?: boolean
  onCreateSupplier: (input: SupplierUpsertInput) => Promise<unknown>
  onUpdateSupplier: (supplierId: string, input: Partial<SupplierUpsertInput>) => Promise<unknown>
  onDeleteSupplier: (supplierId: string) => Promise<unknown>
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
  const [methodFilter, setMethodFilter] = useState<'all' | SupplierPaymentMethod>('all')

  const filteredSuppliers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return suppliers.filter((supplier) => {
      const methods = parseSupplierPaymentMethods(supplier.payment_method, supplier)
      const matchesFilter = methodFilter === 'all' || methods.includes(methodFilter)
      const matchesSearch =
        normalizedSearch.length === 0 ||
        supplier.name.toLowerCase().includes(normalizedSearch) ||
        supplier.email.toLowerCase().includes(normalizedSearch) ||
        supplier.country.toLowerCase().includes(normalizedSearch)

      return matchesFilter && matchesSearch
    })
  }, [methodFilter, searchTerm, suppliers])

  async function handleSubmit(input: SupplierUpsertInput, supplierId?: string) {
    try {
      if (supplierId) {
        await onUpdateSupplier(supplierId, input)
        toast.success('Proveedor actualizado.')
      } else {
        await onCreateSupplier(input)
        toast.success('Proveedor creado.')
      }

      setIsFormOpen(false)
      setEditingSupplier(null)
    } catch (error) {
      console.error('Failed to persist supplier', error)
      toast.error('No se pudo guardar el proveedor.')
    }
  }

  async function handleDelete(supplier: Supplier) {
    if (!supplier.id || !confirm(`Eliminar a ${supplier.name}?`)) {
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
          userId={userId}
        />
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-3xl border border-border/70  p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Proveedores</div>
                <h1 className="text-3xl font-semibold tracking-tight">Agenda de proveedores</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Administra tus destinatarios de pago y sus cuentas desde una sola agenda operativa.
                </p>
              </div>
              <Button disabled={disabled} onClick={handleCreate} size="lg" type="button">
                <Plus />
                Agregar proveedor
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-10 pl-9" onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar proveedores..." value={searchTerm} />
              </div>
              <Select value={methodFilter} onValueChange={(value) => setMethodFilter(value as 'all' | SupplierPaymentMethod)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="ach">Cuenta bancaria ACH</SelectItem>
                  <SelectItem value="swift">Cuenta bancaria SWIFT</SelectItem>
                  <SelectItem value="crypto">Billetera crypto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <Card className="border-border/70 bg-background">
            <CardHeader>
              <CardTitle>Destinatarios guardados</CardTitle>
              <CardDescription>La edicion y la creacion usan el nuevo flujo por etapas con multiples cuentas por proveedor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredSuppliers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                  {suppliers.length === 0
                    ? 'Aun no hay proveedores cargados. Usa el boton superior para crear el primero.'
                    : 'No encontramos proveedores con ese criterio.'}
                </div>
              ) : (
                filteredSuppliers.map((supplier) => {
                  const methods = parseSupplierPaymentMethods(supplier.payment_method, supplier)

                  return (
                    <div
                      key={supplier.id ?? supplier.name}
                      className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/80 p-5 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex size-11 items-center justify-center rounded-2xl border border-border/70 bg-muted/30">
                          <UserRound className="size-5 text-muted-foreground" />
                        </div>
                        <div className="flex gap-2">
                          <div>
                            <div className="text-xl font-semibold">{supplier.name}</div>
                            <div className="text-sm text-muted-foreground">{methods.length} cuenta{methods.length === 1 ? '' : 's'}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {methods.map((method) => (
                              <Badge key={`${supplier.id}-${method}`} variant="outline">
                                {method === 'ach' ? 'ACH' : method === 'swift' ? 'SWIFT' : 'CRYPTO'}
                              </Badge>
                            ))}
                          </div>
                          <div className="grid gap-1 text-sm text-muted-foreground">
                            <div>{supplier.country}</div>
                            <div>{supplier.email}</div>
                            <div>{supplier.phone}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <Button disabled={disabled} onClick={() => handleEdit(supplier)} size="icon" type="button" variant="ghost">
                          <Pencil />
                        </Button>
                        <Button disabled={disabled} onClick={() => handleDelete(supplier)} size="icon" type="button" variant="ghost">
                          <Trash2 />
                        </Button>
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
