'use client'

import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Building2, Landmark, Wallet, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StepProgressRail } from '@/features/payments/components/step-progress-rail'
import { interactiveClickableCardClassName, cn } from '@/lib/utils'
import type { Supplier, PaymentRail, CreateSupplierPayload } from '@/types/supplier'

interface SupplierFormProps {
  editingSupplier?: Supplier | null
  disabled?: boolean
  onBack: () => void
  onSubmitSupplier: (supplier: CreateSupplierPayload, supplierId?: string) => Promise<void>
}

type FormStep = 'general' | 'accounts'
const SUPPLIER_STEP_ORDER: FormStep[] = ['general', 'accounts']

// Flattened form values for ease of editing
type SupplierFormValues = {
  name: string
  country: string
  contact_email: string
  notes: string
  payment_rail: PaymentRail
  bank_name: string

  // Address (used by ACH/Wire)
  street_line_1: string
  street_line_2: string
  city: string
  state: string
  postal_code: string
  address_country: string

  // ACH/Wire Specifics
  account_number: string
  routing_number: string
  checking_or_savings: 'checking' | 'savings'

  // SEPA Specifics
  iban: string
  swift_bic: string
  iban_country: string
  account_owner_type: 'individual' | 'business'
  first_name: string
  last_name: string
  business_name: string

  // SPEI Specifics
  clabe: string

  // PIX Specifics
  pix_key: string
  br_code: string
  document_number: string

  // Bre-B Specifics
  bre_b_key: string

  // Crypto
  wallet_address: string
  wallet_network: string
}

const defaultValues: SupplierFormValues = {
  name: '',
  country: 'US',
  contact_email: '',
  notes: '',
  payment_rail: 'ach',
  bank_name: '',

  street_line_1: '',
  street_line_2: '',
  city: '',
  state: '',
  postal_code: '',
  address_country: 'USA',

  account_number: '',
  routing_number: '',
  checking_or_savings: 'checking',

  iban: '',
  swift_bic: '',
  iban_country: '',
  account_owner_type: 'business',
  first_name: '',
  last_name: '',
  business_name: '',

  clabe: '',

  pix_key: '',
  br_code: '',
  document_number: '',

  bre_b_key: '',

  wallet_address: '',
  wallet_network: 'Polygon',
}

const RAIL_OPTIONS: Array<{
  value: PaymentRail
  label: string
  description: string
  icon: typeof Landmark
}> = [
  { value: 'ach', label: '🇺🇸 ACH (Estados Unidos)', description: 'Transferencia local ACH en USD', icon: Landmark },
  { value: 'wire', label: '🇺🇸 Wire (Estados Unidos)', description: 'Transferencia Wire en USD', icon: Building2 },
  { value: 'sepa', label: '🇪🇺 SEPA (Europa)', description: 'Transferencia bancaria en EUR', icon: Globe },
  { value: 'spei', label: '🇲🇽 SPEI (México)', description: 'Transferencia bancaria en MXN', icon: Landmark },
  { value: 'pix', label: '🇧🇷 PIX (Brasil)', description: 'Transferencia rápida en BRL', icon: Landmark },
  { value: 'bre_b', label: '🇨🇴 Bre-B (Colombia)', description: 'Transferencia rápida en COP', icon: Landmark },
  { value: 'crypto', label: '₿ Billetera Crypto', description: 'USDC/USDT vía redes crypto', icon: Wallet },
]

export function SupplierForm({
  editingSupplier,
  disabled,
  onBack,
  onSubmitSupplier,
}: SupplierFormProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>('general')

  const initialData = useMemo(() => {
    if (!editingSupplier) return defaultValues

    const details = editingSupplier.bank_details || {}
    const isCrypto = editingSupplier.payment_rail === 'crypto'
    const address = (details.address as Record<string, string>) || {}

    return {
      name: editingSupplier.name || '',
      country: editingSupplier.country || 'US',
      contact_email: editingSupplier.contact_email || '',
      notes: editingSupplier.notes || '',
      payment_rail: editingSupplier.payment_rail || 'ach',
      bank_name: (details.bank_name as string) || '',

      street_line_1: address.street_line_1 || '',
      street_line_2: address.street_line_2 || '',
      city: address.city || '',
      state: address.state || '',
      postal_code: address.postal_code || '',
      address_country: address.country || editingSupplier.country || 'US',

      account_number: (details.account_number as string) || '',
      routing_number: (details.routing_number as string) || '',
      checking_or_savings: (details.checking_or_savings as 'checking' | 'savings') || 'checking',

      iban: (details.iban as string) || '',
      swift_bic: (details.swift_bic as string) || '',
      iban_country: (details.iban_country as string) || '',
      account_owner_type: (details.account_owner_type as 'individual' | 'business') || 'business',
      first_name: (details.first_name as string) || '',
      last_name: (details.last_name as string) || '',
      business_name: (details.business_name as string) || '',

      clabe: (details.clabe as string) || '',

      pix_key: (details.pix_key as string) || '',
      br_code: (details.br_code as string) || '',
      document_number: (details.document_number as string) || '',

      bre_b_key: (details.bre_b_key as string) || '',

      wallet_address: isCrypto ? (details.wallet_address as string) : '',
      wallet_network: isCrypto ? (details.wallet_network as string) : 'Polygon',
    }
  }, [editingSupplier])

  const form = useForm<SupplierFormValues>({ defaultValues: initialData })
  const selectedRail = useWatch({ control: form.control, name: 'payment_rail' })

  const handleNext = async () => {
    const isGeneralValid = await form.trigger(['name', 'country', 'contact_email'])
    if (isGeneralValid) {
      setCurrentStep('accounts')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBack = () => {
    setCurrentStep('general')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onSubmitForm = async (values: SupplierFormValues) => {
    // Convierte alpha-2 → alpha-3 (requerido por Bridge y por el DTO del backend)
    const toAlpha3 = (code: string): string => {
      if (code.length === 3) return code.toUpperCase()
      const map: Record<string, string> = {
        US: 'USA', MX: 'MEX', BR: 'BRA', CO: 'COL', AR: 'ARG', CL: 'CHL',
        PE: 'PER', EC: 'ECU', BO: 'BOL', PY: 'PRY', UY: 'URY', VE: 'VEN',
        DE: 'DEU', FR: 'FRA', ES: 'ESP', IT: 'ITA', NL: 'NLD', GB: 'GBR',
        PT: 'PRT', BE: 'BEL', AT: 'AUT', CH: 'CHE', SE: 'SWE', NO: 'NOR',
        DK: 'DNK', FI: 'FIN', PL: 'POL', IE: 'IRL', CZ: 'CZE', HU: 'HUN',
      }
      return map[code.toUpperCase()] ?? code.toUpperCase()
    }

    // Map flattened values back to CreateSupplierPayload
    let currency = 'USD'
    if (values.payment_rail === 'sepa') currency = 'EUR'
    if (values.payment_rail === 'spei') currency = 'MXN'
    if (values.payment_rail === 'pix') currency = 'BRL'
    if (values.payment_rail === 'bre_b') currency = 'COP'

    const payload: CreateSupplierPayload = {
      name: values.name,
      country: values.country,
      currency,
      payment_rail: values.payment_rail,
      contact_email: values.contact_email || undefined,
      notes: values.notes || undefined,
      bank_name: values.bank_name || undefined,
    }

    if (['ach', 'wire'].includes(values.payment_rail)) {
      payload.account_number = values.account_number
      payload.routing_number = values.routing_number
      payload.checking_or_savings = values.checking_or_savings
      payload.address = {
        street_line_1: values.street_line_1,
        street_line_2: values.street_line_2 || undefined,
        city: values.city,
        state: values.state || undefined,
        postal_code: values.postal_code || undefined,
        country: toAlpha3(values.address_country || 'USA'), // ← siempre alpha-3
      }
    } else if (values.payment_rail === 'sepa') {
      payload.iban = values.iban
      payload.swift_bic = values.swift_bic
      payload.iban_country = values.iban_country || undefined
      payload.account_owner_type = values.account_owner_type
      payload.first_name = values.first_name || undefined
      payload.last_name = values.last_name || undefined
      payload.business_name = values.business_name || undefined
    } else if (values.payment_rail === 'spei') {
      payload.clabe = values.clabe
    } else if (values.payment_rail === 'pix') {
      payload.pix_key = values.pix_key
      payload.br_code = values.br_code
      payload.document_number = values.document_number
    } else if (values.payment_rail === 'bre_b') {
      payload.bre_b_key = values.bre_b_key
    } else if (values.payment_rail === 'crypto') {
      payload.wallet_address = values.wallet_address
      payload.wallet_network = values.wallet_network
    }

    await onSubmitSupplier(payload, editingSupplier?.id)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitForm)} className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button disabled={disabled} onClick={onBack} size="icon" type="button" variant="outline">
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
            <p className="text-sm text-muted-foreground">Configura los datos del destinatario para futuros pagos.</p>
          </div>
        </div>

        <StepProgressRail currentStep={currentStep} getStepLabel={getSupplierStepLabel} steps={SUPPLIER_STEP_ORDER} />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-6"
            exit={{ opacity: 0, x: -10 }}
            initial={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === 'general' && (
              <Card>
                <CardHeader>
                  <CardTitle>Datos Generales</CardTitle>
                  <CardDescription>Información básica del destinatario o empresa a la que enviarás fondos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{
                      required: 'El nombre es requerido',
                      maxLength: {
                        value: ['ach', 'wire'].includes(selectedRail) ? 35 : 200,
                        message: ['ach', 'wire'].includes(selectedRail)
                          ? 'ACH/Wire: máximo 35 caracteres (requisito de Bridge)'
                          : 'Máximo 200 caracteres',
                      },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre o Razón Social</FormLabel>
                        <FormControl>
                          <Input
                            disabled={disabled}
                            placeholder="Ej. Tech Corp S.A."
                            maxLength={['ach', 'wire'].includes(selectedRail) ? 35 : 200}
                            {...field}
                          />
                        </FormControl>
                        {['ach', 'wire'].includes(selectedRail) && (
                          <p className="text-xs text-muted-foreground">
                            ACH/Wire: máximo 35 caracteres ({field.value?.length ?? 0}/35)
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="contact_email"
                      rules={{ 
                        required: 'El correo es requerido',
                        pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Correo inválido' } 
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo de Contacto</FormLabel>
                          <FormControl>
                            <Input disabled={disabled} placeholder="contacto@techcorp.com" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="country"
                      rules={{ required: 'La nacionalidad es requerida' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>País de Residencia</FormLabel>
                          <Select disabled={disabled} onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione un país" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="US">Estados Unidos</SelectItem>
                              <SelectItem value="MX">México</SelectItem>
                              <SelectItem value="CO">Colombia</SelectItem>
                              <SelectItem value="BR">Brasil</SelectItem>
                              <SelectItem value="AR">Argentina</SelectItem>
                              <SelectItem value="PE">Perú</SelectItem>
                              <SelectItem value="CL">Chile</SelectItem>
                              <SelectItem value="ES">España</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="payment_rail"
                    rules={{ required: 'El método de pago es requerido' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Pago Principal</FormLabel>
                        <div className="grid gap-4 md:grid-cols-2">
                          {RAIL_OPTIONS.map((option) => (
                            <div
                              key={option.value}
                              className={cn(
                                'flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all',
                                interactiveClickableCardClassName,
                                field.value === option.value && 'border-primary ring-1 ring-primary/50 bg-primary/5'
                              )}
                              onClick={() => {
                                if (!disabled) field.onChange(option.value)
                              }}
                            >
                              <div className={cn('flex size-10 items-center justify-center rounded-lg border bg-background text-muted-foreground')}>
                                <option.icon className="size-5" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className={cn('text-sm font-medium leading-none tracking-tight')}>{option.label}</span>
                                <span className="text-xs text-muted-foreground">{option.description}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button disabled={disabled} onClick={handleNext} type="button">
                      Continuar a Detalles <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'accounts' && (
              <Card>
                <CardHeader>
                  <CardTitle>Detalles Bancarios</CardTitle>
                  <CardDescription>
                    Completa la información necesaria para envíos vía <strong>{RAIL_OPTIONS.find(r => r.value === selectedRail)?.label}</strong>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {['ach', 'wire', 'sepa', 'spei'].includes(selectedRail) && (
                    <FormField
                      control={form.control}
                      name="bank_name"
                      rules={{ required: 'El nombre del banco es requerido' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del Banco</FormLabel>
                          <FormControl>
                            <Input disabled={disabled} placeholder="Ej. Chase Bank" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {['ach', 'wire'].includes(selectedRail) && (
                    <>
                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="account_number"
                          rules={{ required: 'Requerido' }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Number</FormLabel>
                              <FormControl><Input disabled={disabled} {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="routing_number"
                          rules={{ required: 'Requerido' }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Routing Number</FormLabel>
                              <FormControl><Input disabled={disabled} {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="street_line_1"
                        rules={{ required: 'La dirección es requerida por compliance bancario' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dirección del Beneficiario (Street Line 1)</FormLabel>
                            <FormControl><Input disabled={disabled} placeholder="123 Main St" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid gap-6 md:grid-cols-3">
                        <FormField
                          control={form.control}
                          name="city"
                          rules={{ required: true }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ciudad</FormLabel>
                              <FormControl><Input disabled={disabled} {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="state"
                          rules={{ required: true }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estado</FormLabel>
                              <FormControl><Input disabled={disabled} placeholder="NY" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="postal_code"
                          rules={{ required: true }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Código Postal</FormLabel>
                              <FormControl><Input disabled={disabled} {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  {selectedRail === 'sepa' && (
                    <>
                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="iban"
                          rules={{ required: 'Requerido' }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IBAN</FormLabel>
                              <FormControl><Input disabled={disabled} placeholder="DE89370400440532013000" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="swift_bic"
                          rules={{ required: 'Requerido' }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SWIFT / BIC</FormLabel>
                              <FormControl><Input disabled={disabled} placeholder="COBADEFFXXX" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="iban_country"
                        rules={{
                          required: 'El país del IBAN es requerido por Bridge',
                          minLength: { value: 3, message: 'Código alpha-3 (ej. NLD, DEU, FRA)' },
                          maxLength: { value: 3, message: 'Código de 3 letras (ej. NLD)' },
                        }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>País del IBAN (alpha-3)</FormLabel>
                            <FormControl>
                              <Input
                                disabled={disabled}
                                placeholder="Ej. NLD, DEU, FRA, ESP"
                                maxLength={3}
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground">Código ISO 3166-1 alpha-3 del país donde está la cuenta</p>
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {selectedRail === 'spei' && (
                    <FormField
                      control={form.control}
                      name="clabe"
                      rules={{ required: 'Requerido', minLength: 18, maxLength: 18 }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CLABE (18 dígitos)</FormLabel>
                          <FormControl><Input disabled={disabled} maxLength={18} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {selectedRail === 'pix' && (
                    <div className="grid gap-6 md:grid-cols-2">
                       <FormField
                        control={form.control}
                        name="pix_key"
                        rules={{ required: 'Requerido' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PIX Key</FormLabel>
                            <FormControl><Input disabled={disabled} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="document_number"
                        rules={{ required: 'Requerido' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Document Number (CPF/CNPJ)</FormLabel>
                            <FormControl><Input disabled={disabled} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {selectedRail === 'bre_b' && (
                    <FormField
                      control={form.control}
                      name="bre_b_key"
                      rules={{ required: 'Requerido' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bre-B Key</FormLabel>
                          <FormControl><Input disabled={disabled} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {selectedRail === 'crypto' && (
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="wallet_address"
                        rules={{ required: 'La dirección es requerida' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dirección Wallet (USDC/USDT)</FormLabel>
                            <FormControl>
                              <Input disabled={disabled} placeholder="0x..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="wallet_network"
                        rules={{ required: 'La red es requerida' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Red (Network)</FormLabel>
                            <Select disabled={disabled} onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Polygon">Polygon (Recomendado)</SelectItem>
                                <SelectItem value="Ethereum">Ethereum (ERC-20)</SelectItem>
                                <SelectItem value="Stellar">Stellar</SelectItem>
                                <SelectItem value="Tron">Tron (TRC-20)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="flex justify-between pt-4">
                    <Button disabled={disabled} onClick={handleBack} type="button" variant="ghost">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                    </Button>
                    <Button disabled={disabled || form.formState.isSubmitting} type="submit">
                      Guardar Proveedor
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </form>
    </Form>
  )
}

export function getSupplierStepLabel(step: FormStep) {
  switch (step) {
    case 'general':
      return 'Datos generales'
    case 'accounts':
      return 'Cuentas'
  }
}
