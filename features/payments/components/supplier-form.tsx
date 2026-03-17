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
import {
  getSupplierAchDetails,
  getSupplierSwiftDetails,
  parseSupplierPaymentMethods,
} from '@/features/payments/lib/supplier-methods'
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
  payment_method: 'swift',
  address: '',
  phone: '',
  email: '',
  tax_id: '',
  ach_bank_name: '',
  ach_routing_number: '',
  ach_account_number: '',
  ach_bank_country: '',
  swift_bank_name: '',
  swift_code: '',
  swift_account_number: '',
  swift_bank_country: '',
  swift_iban: '',
  swift_bank_address: '',
  crypto_address: '',
  crypto_network: 'Polygon',
}

const paymentMethodOptions = [
  { value: 'crypto', label: 'Crypto' },
  { value: 'ach', label: 'ACH' },
  { value: 'swift', label: 'SWIFT' },
] as const

const cryptoNetworkOptions = [
  'Ethereum',
  'Polygon',
  'Arbitrum',
  'Optimism',
  'Base',
  'Solana',
  'Tron',
  'BSC',
] as const

function resolveCryptoNetwork(network?: string) {
  return cryptoNetworkOptions.find((option) => option === network) ?? 'Polygon'
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

    const achDetails = getSupplierAchDetails(editingSupplier)
    const swiftDetails = getSupplierSwiftDetails(editingSupplier)

    form.reset({
      name: editingSupplier.name,
      country: editingSupplier.country,
      payment_method:
        parseSupplierPaymentMethods(editingSupplier.payment_method, editingSupplier)[0] ?? 'swift',
      address: editingSupplier.address,
      phone: editingSupplier.phone,
      email: editingSupplier.email,
      tax_id: editingSupplier.tax_id,
      ach_bank_name: achDetails?.bank_name ?? '',
      ach_routing_number: achDetails?.routing_number ?? '',
      ach_account_number: achDetails?.account_number ?? '',
      ach_bank_country: achDetails?.bank_country ?? editingSupplier.country ?? '',
      swift_bank_name: swiftDetails?.bank_name ?? '',
      swift_code: swiftDetails?.swift_code ?? '',
      swift_account_number: swiftDetails?.account_number ?? '',
      swift_bank_country: swiftDetails?.bank_country ?? editingSupplier.country ?? '',
      swift_iban: swiftDetails?.iban ?? '',
      swift_bank_address: swiftDetails?.bank_address ?? editingSupplier.address ?? '',
      crypto_address: editingSupplier.crypto_details?.address ?? '',
      crypto_network: resolveCryptoNetwork(editingSupplier.crypto_details?.network),
    })
  }, [editingSupplier, form])

  async function submit(values: SupplierFormValues) {
    await onSubmitSupplier(
      {
        user_id: userId,
        name: values.name,
        country: values.country,
        payment_method: values.payment_method,
        bank_details: values.payment_method === 'ach' || values.payment_method === 'swift'
          ? {
              ach: values.payment_method === 'ach'
                ? {
                    bank_name: values.ach_bank_name ?? '',
                    routing_number: values.ach_routing_number ?? '',
                    account_number: values.ach_account_number ?? '',
                    bank_country: values.ach_bank_country ?? '',
                  }
                : undefined,
              swift: values.payment_method === 'swift'
                ? {
                    bank_name: values.swift_bank_name ?? '',
                    swift_code: values.swift_code ?? '',
                    account_number: values.swift_account_number ?? '',
                    bank_country: values.swift_bank_country ?? '',
                    iban: values.swift_iban ?? '',
                    bank_address: values.swift_bank_address ?? '',
                  }
                : undefined,
            }
          : undefined,
        crypto_details: values.payment_method === 'crypto'
          ? {
              address: values.crypto_address ?? '',
              network: values.crypto_network ?? 'Polygon',
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
                        {paymentMethodOptions.map((option) => {
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          )
                        })}
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

            {paymentMethod === 'ach' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="ach_bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banco ACH</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} placeholder="Nombre del banco" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ach_routing_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Routing number</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} placeholder="Numero de ruta ACH" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ach_account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuenta ACH</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} placeholder="Numero de cuenta" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ach_bank_country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pais del banco ACH</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} placeholder="Pais del banco" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            {paymentMethod === 'swift' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="swift_bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banco SWIFT</FormLabel>
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
                      <FormLabel>Codigo SWIFT</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} placeholder="Codigo SWIFT" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="swift_account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuenta bancaria</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} placeholder="Numero de cuenta o IBAN" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="swift_bank_country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pais del banco SWIFT</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} placeholder="Pais del banco" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="swift_iban"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IBAN</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} placeholder="IBAN opcional" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="swift_bank_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Direccion del banco</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} placeholder="Direccion del banco" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            {paymentMethod === 'crypto' ? (
              <div className="grid gap-4 md:grid-cols-2">
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
                <FormField
                  control={form.control}
                  name="crypto_network"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Red</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona una red" />
                          </SelectTrigger>
                          <SelectContent>
                            {cryptoNetworkOptions.map((network) => (
                              <SelectItem key={network} value={network}>
                                {network}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

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
