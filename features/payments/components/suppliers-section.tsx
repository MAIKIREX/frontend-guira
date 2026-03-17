'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { SupplierForm } from '@/features/payments/components/supplier-form'
import { parseSupplierPaymentMethods } from '@/features/payments/lib/supplier-methods'
import type { Supplier } from '@/types/supplier'
import type { SupplierUpsertInput } from '@/types/payment-order'

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

  async function handleSubmit(input: SupplierUpsertInput, supplierId?: string) {
    try {
      if (supplierId) {
        await onUpdateSupplier(supplierId, input)
        toast.success('Proveedor actualizado.')
        setEditingSupplier(null)
        return
      }

      await onCreateSupplier(input)
      toast.success('Proveedor creado.')
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

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Agenda de proveedores</CardTitle>
          <CardDescription>
            CRUD sobre `suppliers`. La eliminacion usa hard delete porque no existe un flag de archivo documentado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
              Aun no hay proveedores cargados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Metodo</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div className="font-medium">{supplier.name}</div>
                      <div className="text-xs text-muted-foreground">{supplier.country}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {parseSupplierPaymentMethods(supplier.payment_method, supplier).map((method) => (
                          <Badge key={`${supplier.id}-${method}`} variant="outline">
                            {method}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{supplier.email}</div>
                      <div className="text-xs text-muted-foreground">{supplier.phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          disabled={disabled}
                          onClick={() => setEditingSupplier(supplier)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Pencil />
                          Editar
                        </Button>
                        <Button
                          disabled={disabled}
                          onClick={() => handleDelete(supplier)}
                          size="sm"
                          type="button"
                          variant="destructive"
                        >
                          <Trash2 />
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SupplierForm
        disabled={disabled}
        editingSupplier={editingSupplier}
        onCancelEdit={() => setEditingSupplier(null)}
        onSubmitSupplier={handleSubmit}
        userId={userId}
      />
    </div>
  )
}
