'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Building2, Landmark, Plus, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StepProgressRail } from '@/features/payments/components/step-progress-rail'
import { cn, interactiveClickableCardClassName } from '@/lib/utils'
import {
  COUNTRY_PHONE_OPTIONS,
  DEFAULT_COUNTRY_OPTION,
  findCountryPhoneOptionByCountry,
  findCountryPhoneOptionByPhone,
  stripDialCodeFromPhone,
} from '@/features/payments/lib/country-phone-options'
import { CRYPTO_NETWORK_OPTIONS, resolveCryptoNetwork } from '@/features/payments/lib/crypto-networks'
import {
  getSupplierAchDetails,
  getSupplierSwiftDetails,
  parseSupplierPaymentMethods,
  serializeSupplierPaymentMethods,
} from '@/features/payments/lib/supplier-methods'
import type { SupplierUpsertInput } from '@/types/payment-order'
import type { Supplier, SupplierPaymentMethod } from '@/types/supplier'

interface SupplierFormProps {
  userId: string
  editingSupplier?: Supplier | null
  disabled?: boolean
  onBack: () => void
  onSubmitSupplier: (supplier: SupplierUpsertInput, supplierId?: string) => Promise<void>
}

type FormStep = 'general' | 'accounts'
const SUPPLIER_STEP_ORDER: FormStep[] = ['general', 'accounts']

type SupplierFormValues = {
  name: string
  country: string
  phone_country: string
  phone_number: string
  payment_method: SupplierPaymentMethod
  address: string
  email: string
  tax_id: string
  ach_bank_name: string
  ach_routing_number: string
  ach_account_number: string
  ach_bank_country: string
  swift_bank_name: string
  swift_code: string
  swift_account_number: string
  swift_bank_country: string
  swift_iban: string
  swift_bank_address: string
  crypto_address: string
  crypto_network: string
}

const defaultValues: SupplierFormValues = {
  name: '',
  country: DEFAULT_COUNTRY_OPTION.country,
  phone_country: DEFAULT_COUNTRY_OPTION.country,
  phone_number: '',
  payment_method: 'swift',
  address: '',
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

const METHOD_LABELS: Record<SupplierPaymentMethod, string> = {
  ach: 'Cuenta bancaria ACH',
  swift: 'Cuenta bancaria SWIFT',
  crypto: 'Billetera crypto',
}

const METHOD_FIELDS: Record<SupplierPaymentMethod, Array<keyof SupplierFormValues>> = {
  ach: ['ach_bank_name', 'ach_routing_number', 'ach_account_number', 'ach_bank_country'],
  swift: ['swift_bank_name', 'swift_code', 'swift_account_number', 'swift_bank_country'],
  crypto: ['crypto_address', 'crypto_network'],
}

const METHOD_OPTIONS: Array<{
  value: SupplierPaymentMethod
  label: string
  description: string
  icon: typeof Landmark
}> = [
    {
      value: 'ach',
      label: METHOD_LABELS.ach,
      description: 'Cuenta local en EE.UU. con routing y numero de cuenta.',
      icon: Landmark,
    },
    {
      value: 'swift',
      label: METHOD_LABELS.swift,
      description: 'Cuenta internacional con banco, codigo SWIFT e IBAN opcional.',
      icon: Building2,
    },
    {
      value: 'crypto',
      label: METHOD_LABELS.crypto,
      description: 'Wallet digital con direccion y red de recepcion.',
      icon: Wallet,
    },
  ]

export function SupplierForm({
  userId,
  editingSupplier,
  disabled,
  onBack,
  onSubmitSupplier,
}: SupplierFormProps) {
  const initialData = useMemo(() => {
    if (!editingSupplier) {
      return {
        values: defaultValues,
        methods: [defaultValues.payment_method] as SupplierPaymentMethod[],
        initialMethod: defaultValues.payment_method as SupplierPaymentMethod,
      }
    }

    const methods = parseSupplierPaymentMethods(editingSupplier.payment_method, editingSupplier)
    const achDetails = getSupplierAchDetails(editingSupplier)
    const swiftDetails = getSupplierSwiftDetails(editingSupplier)
    const phoneOption =
      findCountryPhoneOptionByPhone(editingSupplier.phone) ??
      findCountryPhoneOptionByCountry(editingSupplier.country) ??
      DEFAULT_COUNTRY_OPTION
    const initialMethod = methods[0] ?? 'swift'

    return {
      values: {
        name: editingSupplier.name,
        country: editingSupplier.country || DEFAULT_COUNTRY_OPTION.country,
        phone_country: phoneOption.country,
        phone_number: stripDialCodeFromPhone(editingSupplier.phone, phoneOption.dialCode),
        payment_method: initialMethod,
        address: editingSupplier.address,
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
      },
      methods: methods.length > 0 ? methods : [initialMethod],
      initialMethod,
    }
  }, [editingSupplier])

  const form = useForm<SupplierFormValues>({ defaultValues: initialData.values })
  const [currentStep, setCurrentStep] = useState<FormStep>('general')
  const [selectedMethods, setSelectedMethods] = useState<SupplierPaymentMethod[]>(initialData.methods)
  const [activeMethod, setActiveMethod] = useState<SupplierPaymentMethod>(initialData.initialMethod)
  const selectedCountry = useWatch({ control: form.control, name: 'country' })
  const primaryMethod = useWatch({ control: form.control, name: 'payment_method' })
  const selectedPhoneOption =
    findCountryPhoneOptionByCountry(selectedCountry) ??
    findCountryPhoneOptionByCountry(form.getValues('phone_country')) ??
    DEFAULT_COUNTRY_OPTION

  const remainingMethods = useMemo(
    () => METHOD_OPTIONS.filter((option) => !selectedMethods.includes(option.value)),
    [selectedMethods]
  )

  useEffect(() => {
    form.setValue('phone_country', selectedCountry, { shouldDirty: false })
  }, [form, selectedCountry])

  function validateGeneralStep() {
    const values = form.getValues()
    let isValid = true

      ; (['name', 'country', 'phone_country', 'phone_number', 'payment_method', 'address', 'email', 'tax_id'] as const).forEach((field) =>
        form.clearErrors(field)
      )

    if (!values.name.trim() || values.name.trim().length < 2) {
      form.setError('name', { type: 'manual', message: 'Ingresa el nombre completo del proveedor.' })
      isValid = false
    }

    if (!values.country.trim()) {
      form.setError('country', { type: 'manual', message: 'Selecciona el pais del proveedor.' })
      isValid = false
    }

    if (!values.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      form.setError('email', { type: 'manual', message: 'Ingresa un email valido.' })
      isValid = false
    }

    if (!values.phone_country.trim()) {
      form.setError('phone_country', { type: 'manual', message: 'Selecciona el pais del telefono.' })
      isValid = false
    }

    if (!values.phone_number.trim() || values.phone_number.trim().length < 5) {
      form.setError('phone_number', { type: 'manual', message: 'Ingresa un numero de telefono valido.' })
      isValid = false
    }

    if (!values.tax_id.trim() || values.tax_id.trim().length < 3) {
      form.setError('tax_id', { type: 'manual', message: 'Ingresa el TAX ID del proveedor.' })
      isValid = false
    }

    if (!values.address.trim() || values.address.trim().length < 5) {
      form.setError('address', { type: 'manual', message: 'Ingresa una direccion valida.' })
      isValid = false
    }

    return isValid
  }

  function validateMethod(method: SupplierPaymentMethod) {
    const values = form.getValues()
    let isValid = true

    METHOD_FIELDS[method].forEach((field) => form.clearErrors(field))

    if (method === 'ach') {
      if (!values.ach_bank_name.trim()) {
        form.setError('ach_bank_name', { type: 'manual', message: 'Ingresa el banco ACH.' })
        isValid = false
      }
      if (!values.ach_routing_number.trim()) {
        form.setError('ach_routing_number', { type: 'manual', message: 'Ingresa el routing number.' })
        isValid = false
      }
      if (!values.ach_account_number.trim()) {
        form.setError('ach_account_number', { type: 'manual', message: 'Ingresa el numero de cuenta.' })
        isValid = false
      }
      if (!values.ach_bank_country.trim()) {
        form.setError('ach_bank_country', { type: 'manual', message: 'Ingresa el pais del banco.' })
        isValid = false
      }
    }

    if (method === 'swift') {
      if (!values.swift_bank_name.trim()) {
        form.setError('swift_bank_name', { type: 'manual', message: 'Ingresa el banco SWIFT.' })
        isValid = false
      }
      if (!values.swift_code.trim()) {
        form.setError('swift_code', { type: 'manual', message: 'Ingresa el codigo SWIFT.' })
        isValid = false
      }
      if (!values.swift_account_number.trim()) {
        form.setError('swift_account_number', { type: 'manual', message: 'Ingresa la cuenta bancaria.' })
        isValid = false
      }
      if (!values.swift_bank_country.trim()) {
        form.setError('swift_bank_country', { type: 'manual', message: 'Ingresa el pais del banco.' })
        isValid = false
      }
    }

    if (method === 'crypto') {
      if (!values.crypto_address.trim()) {
        form.setError('crypto_address', { type: 'manual', message: 'Ingresa la direccion de la wallet.' })
        isValid = false
      }
      if (!values.crypto_network.trim()) {
        form.setError('crypto_network', { type: 'manual', message: 'Selecciona la red.' })
        isValid = false
      }
    }

    return isValid
  }

  function handleNextStep() {
    if (!validateGeneralStep()) return

    if (!selectedMethods.includes(primaryMethod)) {
      setSelectedMethods([primaryMethod])
    }

    setActiveMethod(primaryMethod)
    setCurrentStep('accounts')
  }

  function handleAddMethod(method: SupplierPaymentMethod) {
    if (!selectedMethods.includes(method)) {
      setSelectedMethods((current) => [...current, method])
    }

    setActiveMethod(method)
    setCurrentStep('accounts')
  }

  async function submit(values: SupplierFormValues) {
    if (!validateGeneralStep()) {
      setCurrentStep('general')
      return
    }

    const methods = Array.from(new Set(selectedMethods.length > 0 ? selectedMethods : [values.payment_method]))

    for (const method of methods) {
      if (!validateMethod(method)) {
        setActiveMethod(method)
        setCurrentStep('accounts')
        return
      }
    }

    const phoneOption = findCountryPhoneOptionByCountry(values.country) ?? DEFAULT_COUNTRY_OPTION
    const normalizedPhoneNumber = stripDialCodeFromPhone(values.phone_number, phoneOption.dialCode)

    await onSubmitSupplier(
      {
        user_id: userId,
        name: values.name.trim(),
        country: values.country.trim(),
        payment_method: serializeSupplierPaymentMethods(methods),
        bank_details: methods.includes('ach') || methods.includes('swift')
          ? {
            ach: methods.includes('ach')
              ? {
                bank_name: values.ach_bank_name.trim(),
                routing_number: values.ach_routing_number.trim(),
                account_number: values.ach_account_number.trim(),
                bank_country: values.ach_bank_country.trim(),
              }
              : undefined,
            swift: methods.includes('swift')
              ? {
                bank_name: values.swift_bank_name.trim(),
                swift_code: values.swift_code.trim(),
                account_number: values.swift_account_number.trim(),
                bank_country: values.swift_bank_country.trim(),
                iban: values.swift_iban.trim() || undefined,
                bank_address: values.swift_bank_address.trim() || undefined,
              }
              : undefined,
          }
          : undefined,
        crypto_details: methods.includes('crypto')
          ? {
            address: values.crypto_address.trim(),
            network: values.crypto_network.trim(),
          }
          : undefined,
        address: values.address.trim(),
        phone: `${phoneOption.dialCode} ${normalizedPhoneNumber.trim()}`.trim(),
        email: values.email.trim(),
        tax_id: values.tax_id.trim(),
      },
      editingSupplier?.id
    )

    onBack()
  }

  return (
    <Card className="ring-0 bg-background">
      <CardHeader className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {editingSupplier ? 'Editar proveedor' : 'Nuevo proveedor'}
            </div>
            <CardTitle className="text-3xl font-semibold tracking-tight">
              {editingSupplier ? 'Actualiza el proveedor y sus cuentas' : 'Crea un proveedor nuevo'}
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6 tracking-[0.01em]">
              Registra los datos generales primero y luego agrega una o varias cuentas segun el tipo de pago.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {selectedMethods.length > 0 ? (
              <Badge variant="outline">{selectedMethods.length} cuenta{selectedMethods.length === 1 ? '' : 's'}</Badge>
            ) : null}
            <Button disabled={disabled} onClick={onBack} type="button" variant="outline">
              Volver a la agenda
            </Button>
          </div>
        </div>

        <StepProgressRail currentStep={currentStep} getStepLabel={getSupplierStepLabel} steps={SUPPLIER_STEP_ORDER} />
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form className="mx-auto w-full max-w-4xl space-y-6" onSubmit={form.handleSubmit(submit)}>
            <AnimatePresence mode="wait">
              {currentStep === 'general' ? (
                <AnimatedStepPanel key="general">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Nombre completo</FormLabel><FormControl><Input {...field} disabled={disabled} placeholder="Nombre del proveedor o beneficiario" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pais</FormLabel>
                          <FormControl>
                            <Select
                              disabled={disabled}
                              value={field.value}
                              onValueChange={(value) => {
                                if (!value) return

                                field.onChange(value)
                                if (!form.formState.dirtyFields.phone_country) {
                                  form.setValue('phone_country', value, { shouldDirty: false })
                                }
                              }}
                            >
                              <SelectTrigger className="w-full"><SelectValue placeholder="Selecciona un pais" /></SelectTrigger>
                              <SelectContent>
                                {COUNTRY_PHONE_OPTIONS.map((option) => (
                                  <SelectItem key={option.country} value={option.country}>{option.country}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} disabled={disabled} placeholder="contacto@proveedor.com" type="email" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="space-y-2">
                      <Label>Numero de telefono</Label>
                      <div className="grid gap-3 md:grid-cols-[120px_1fr]">
                        <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-medium text-muted-foreground">
                          {selectedPhoneOption.dialCode}
                        </div>
                        <FormField
                          control={form.control}
                          name="phone_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={disabled}
                                  inputMode="tel"
                                  onChange={(event) => {
                                    const nextValue = stripDialCodeFromPhone(event.target.value, selectedPhoneOption.dialCode)
                                    field.onChange(nextValue)
                                  }}
                                  placeholder="76543210"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField control={form.control} name="tax_id" render={({ field }) => (
                      <FormItem><FormLabel>ID</FormLabel><FormControl><Input {...field} disabled={disabled} placeholder="Identificador fiscal" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem><FormLabel>Direccion</FormLabel><FormControl><Input {...field} disabled={disabled} placeholder="Direccion operativa o fiscal" /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>

                  <FormField
                    control={form.control}
                    name="payment_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de cuenta inicial</FormLabel>
                        <FormControl>
                          <div className="grid gap-3 md:grid-cols-3">
                            {METHOD_OPTIONS.map((option) => {
                              const Icon = option.icon
                              const isActive = field.value === option.value

                              return (
                                <button
                                  key={option.value}
                                  className={cn(
                                    'rounded-2xl border p-4 text-left',
                                    isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/70 bg-background',
                                    !disabled && interactiveClickableCardClassName,
                                    disabled && 'cursor-not-allowed opacity-60'
                                  )}
                                  disabled={disabled}
                                  onClick={() => field.onChange(option.value)}
                                  type="button"
                                >
                                  <div className="mb-3 flex items-center gap-2 font-medium"><Icon className="size-4" />{option.label}</div>
                                  <p className="text-sm text-muted-foreground">{option.description}</p>
                                </button>
                              )
                            })}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between border-t border-border/60 pt-4">
                    <div className="text-sm text-muted-foreground">Primero definimos los datos base del proveedor y la primera cuenta a registrar.</div>
                    <div className="flex gap-2">
                      <Button disabled={disabled} onClick={onBack} type="button" variant="outline">Cancelar</Button>
                      <Button disabled={disabled} onClick={handleNextStep} type="button">Siguiente<ArrowRight /></Button>
                    </div>
                  </div>
                </AnimatedStepPanel>
              ) : null}

              {currentStep === 'accounts' ? (
                <AnimatedStepPanel key="accounts">

                  <div className="space-y-5">
                    <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-3">
                      {selectedMethods.map((method) => (
                        <button
                          key={method}
                          className={cn(
                            'rounded-xl border px-4 py-3 text-sm font-medium',
                            activeMethod === method ? 'border-primary bg-primary/5 text-foreground shadow-sm' : 'border-border/70 bg-background text-muted-foreground',
                            interactiveClickableCardClassName
                          )}
                          onClick={() => setActiveMethod(method)}
                          type="button"
                        >
                          {METHOD_LABELS[method]}
                        </button>
                      ))}
                    </div>

                    {activeMethod === 'ach' ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField control={form.control} name="ach_bank_name" render={({ field }) => (
                          <FormItem><FormLabel>Banco ACH</FormLabel><FormControl><Input {...field} disabled={disabled} placeholder="Nombre del banco" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="ach_bank_country" render={({ field }) => (
                          <FormItem><FormLabel>Pais del banco</FormLabel><FormControl><Input {...field} disabled={disabled} placeholder="Pais del banco ACH" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="ach_routing_number" render={({ field }) => (
                          <FormItem><FormLabel>Routing number</FormLabel><FormControl><Input {...field} disabled={disabled} placeholder="Numero de ruta ACH" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="ach_account_number" render={({ field }) => (
                          <FormItem><FormLabel>Numero de cuenta</FormLabel><FormControl><Input {...field} disabled={disabled} placeholder="Cuenta bancaria ACH" /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    ) : null}

                    {activeMethod === 'swift' ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField control={form.control} name="swift_bank_name" render={({ field }) => (
                          <FormItem><FormLabel>Banco SWIFT</FormLabel><FormControl><Input {...field} disabled={disabled} placeholder="Nombre del banco" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="swift_bank_country" render={({ field }) => (
                          <FormItem><FormLabel>Pais del banco</FormLabel><FormControl><Input {...field} disabled={disabled} placeholder="Pais del banco SWIFT" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="swift_code" render={({ field }) => (
                          <FormItem><FormLabel>Codigo SWIFT</FormLabel><FormControl><Input {...field} disabled={disabled} placeholder="Codigo SWIFT" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="swift_account_number" render={({ field }) => (
                          <FormItem><FormLabel>Cuenta bancaria</FormLabel><FormControl><Input {...field} disabled={disabled} placeholder="Numero de cuenta o IBAN principal" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="swift_iban" render={({ field }) => (
                          <FormItem><FormLabel>IBAN</FormLabel><FormControl><Input {...field} disabled={disabled} placeholder="IBAN opcional" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="swift_bank_address" render={({ field }) => (
                          <FormItem><FormLabel>Direccion del banco</FormLabel><FormControl><Input {...field} disabled={disabled} placeholder="Direccion del banco" /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    ) : null}

                    {activeMethod === 'crypto' ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField control={form.control} name="crypto_address" render={({ field }) => (
                          <FormItem><FormLabel>Direccion de la wallet</FormLabel><FormControl><Input {...field} disabled={disabled} placeholder="Wallet address" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField
                          control={form.control}
                          name="crypto_network"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Red</FormLabel>
                              <FormControl>
                                <Select disabled={disabled} value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecciona una red" /></SelectTrigger>
                                  <SelectContent>
                                    {CRYPTO_NETWORK_OPTIONS.map((network) => (
                                      <SelectItem key={network} value={network}>{network}</SelectItem>
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
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-muted/20  p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-medium">Cuentas del proveedor</div>
                        <p className="text-sm text-muted-foreground">Completa una sola cuenta o agrega hasta las tres opciones antes de guardar.</p>
                      </div>
                      {remainingMethods.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {remainingMethods.map((method) => (
                            <Button key={method.value} disabled={disabled} onClick={() => handleAddMethod(method.value)} type="button" variant="outline">
                              <Plus />
                              Agregar {method.label}
                            </Button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-4">
                    <div className="text-sm text-muted-foreground">
                      {remainingMethods.length > 0 ? 'Puedes guardar ahora o agregar otra cuenta antes de finalizar.' : 'Ya registraste todas las cuentas disponibles para este proveedor.'}
                    </div>
                    <div className="flex gap-2">
                      <Button disabled={disabled} onClick={() => setCurrentStep('general')} type="button" variant="outline"><ArrowLeft />Atras</Button>
                      <Button disabled={disabled || form.formState.isSubmitting} type="submit">
                        {form.formState.isSubmitting ? 'Guardando...' : editingSupplier ? 'Guardar cambios' : 'Guardar proveedor'}
                      </Button>
                    </div>
                  </div>


                </AnimatedStepPanel>
              ) : null}
            </AnimatePresence>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

function AnimatedStepPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      className="space-y-6"
      exit={{ opacity: 0, y: -14, filter: 'blur(4px)' }}
      initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
      transition={{ duration: 0.26, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  )
}

function getSupplierStepLabel(step: FormStep) {
  switch (step) {
    case 'general':
      return 'Datos generales'
    case 'accounts':
      return 'Cuentas'
  }
}
