'use client'

import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supplierSchema, type SupplierFormValues } from '@/features/payments/schemas/supplier.schema'
import type { Supplier } from '@/types/supplier'
import type { SupplierUpsertInput } from '@/types/payment-order'

interface SupplierFormProps {
  userId: string
  editingSupplier?: Supplier | null
  disabled?: boolean
  onCancelEdit?: () => void
  onSubmitSupplier: (supplier: SupplierUpsertInput, supplierId?: string) => Promise<void>
}

const defaultValues: SupplierFormValues = {
  name: '',
  country: '',
  payment_method: 'bank',
  address: '',
  phone: '',
  email: '',
  tax_id: '',
  bank_name: '',
  swift_code: '',
  account_number: '',
  bank_country: '',
  crypto_address: '',
}

export function SupplierForm({
  userId,
  editingSupplier,
  disabled,
  onCancelEdit,
  onSubmitSupplier,
}: SupplierFormProps) {
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues,
  })

  const paymentMethod = useWatch({ control: form.control, name: 'payment_method' })

  useEffect(() => {
    if (!editingSupplier) {
      form.reset(defaultValues)
      return
    }

    form.reset({
      name: editingSupplier.name,
      country: editingSupplier.country,
      payment_method: editingSupplier.payment_method,
      address: editingSupplier.address,
      phone: editingSupplier.phone,
      email: editingSupplier.email,
      tax_id: editingSupplier.tax_id,
      bank_name: editingSupplier.bank_details?.bank_name ?? '',
      swift_code: editingSupplier.bank_details?.swift_code ?? '',
      account_number: editingSupplier.bank_details?.account_number ?? '',
      bank_country: editingSupplier.bank_details?.bank_country ?? '',
      crypto_address: editingSupplier.crypto_details?.address ?? '',
    })
  }, [editingSupplier, form])

  async function submit(values: SupplierFormValues) {
    await onSubmitSupplier(
      {
        user_id: userId,
        name: values.name,
        country: values.country,
        payment_method: values.payment_method,
        bank_details:
          values.payment_method === 'bank'
            ? {
                bank_name: values.bank_name ?? '',
                swift_code: values.swift_code ?? '',
                account_number: values.account_number ?? '',
                bank_country: values.bank_country ?? '',
              }
            : undefined,
        crypto_details:
          values.payment_method === 'crypto'
            ? {
                address: values.crypto_address ?? '',
              }
            : undefined,
        address: values.address,
        phone: values.phone,
        email: values.email,
        tax_id: values.tax_id,
      },
      editingSupplier?.id
    )

    if (!editingSupplier) {
      form.reset(defaultValues)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingSupplier ? 'Editar proveedor' : 'Nuevo proveedor'}</CardTitle>
        <CardDescription>
          Agenda operativa sobre la tabla `suppliers`, sin inventar campos extra.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} placeholder="Proveedor o beneficiario" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pais</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} placeholder="Bolivia" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metodo de pago</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank">Banco</SelectItem>
                          <SelectItem value="crypto">Crypto</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tax_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} placeholder="Identificador fiscal" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} type="email" placeholder="contacto@proveedor.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} placeholder="+591 ..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Direccion</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={disabled} placeholder="Direccion operativa" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {paymentMethod === 'bank' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banco</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} placeholder="Nombre del banco" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="swift_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SWIFT</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} placeholder="Codigo SWIFT" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuenta bancaria</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} placeholder="Numero de cuenta" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bank_country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pais del banco</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} placeholder="Pais del banco" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <FormField
                control={form.control}
                name="crypto_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Direccion crypto</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} placeholder="Wallet address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-2">
              <Button disabled={disabled || form.formState.isSubmitting} type="submit">
                {form.formState.isSubmitting
                  ? 'Guardando...'
                  : editingSupplier
                    ? 'Actualizar proveedor'
                    : 'Crear proveedor'}
              </Button>
              {editingSupplier ? (
                <Button disabled={disabled} onClick={onCancelEdit} type="button" variant="outline">
                  Cancelar edicion
                </Button>
              ) : null}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
