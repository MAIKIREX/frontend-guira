'use client'

import { useMemo, useState, useEffect } from 'react'
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
import { ALLOWED_NETWORKS, NETWORK_LABELS, ALLOWED_CRYPTO_CURRENCIES, CRYPTO_CURRENCY_LABELS, NETWORK_TOKEN_MAP, ADDRESS_VALIDATORS, validateCryptoAddress } from '@/lib/guira-crypto-config'
import type { AllowedNetwork, AllowedCryptoCurrency } from '@/lib/guira-crypto-config'
import type { Supplier, PaymentRail, CreateSupplierPayload } from '@/types/supplier'

interface SupplierFormProps {
  editingSupplier?: Supplier | null
  disabled?: boolean
  onBack: () => void
  onSubmitSupplier: (supplier: CreateSupplierPayload, supplierId?: string) => Promise<void>
}

type FormStep = 'general' | 'accounts'
const SUPPLIER_STEP_ORDER: FormStep[] = ['general', 'accounts']

type SupplierFormValues = {
  name: string
  country: string
  contact_email: string
  notes: string
  payment_rail: PaymentRail
  bank_name: string

  // Address (ACH/Wire/FPS/SEPA opcional)
  street_line_1: string
  street_line_2: string
  city: string
  state: string
  postal_code: string
  address_country: string

  // ACH/Wire
  account_number: string
  routing_number: string
  checking_or_savings: 'checking' | 'savings' | 'electronic_deposit'

  // SEPA
  iban: string
  swift_bic: string
  iban_country: string
  account_owner_type: 'individual' | 'business' | ''
  first_name: string
  last_name: string
  business_name: string

  // SPEI
  clabe: string

  // PIX
  pix_mode: 'pix_key' | 'br_code'
  pix_key: string
  br_code: string
  document_number: string

  // Bre-B
  bre_b_key: string

  // FPS — Faster Payments (UK)
  fps_account_number: string
  sort_code: string

  // CO Bank Transfer (Colombia)
  co_account_number: string
  bank_code: string
  co_account_type: 'checking' | 'savings' | 'electronic_deposit'
  document_type: 'cc' | 'ce' | 'nit' | 'rut' | 'pa' | 'ppt' | 'ti' | 'rc' | 'te' | 'die' | 'nd' | ''
  co_document_number: string
  phone_number: string

  // Crypto
  wallet_address: string
  wallet_network: string
  wallet_currency: string
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
  address_country: 'US',

  account_number: '',
  routing_number: '',
  checking_or_savings: 'checking',

  iban: '',
  swift_bic: '',
  iban_country: '',
  account_owner_type: '',
  first_name: '',
  last_name: '',
  business_name: '',

  clabe: '',

  pix_mode: 'pix_key',
  pix_key: '',
  br_code: '',
  document_number: '',

  bre_b_key: '',

  fps_account_number: '',
  sort_code: '',

  co_account_number: '',
  bank_code: '',
  co_account_type: 'savings',
  document_type: '',
  co_document_number: '',
  phone_number: '',

  wallet_address: '',
  wallet_network: 'ethereum',
  wallet_currency: 'usdc',
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
  { value: 'co_bank_transfer', label: '🇨🇴 CO Bank Transfer (Colombia)', description: 'Transferencia bancaria tradicional en COP', icon: Building2 },
  { value: 'faster_payments', label: '🇬🇧 Faster Payments (Reino Unido)', description: 'Transferencia rápida en GBP', icon: Landmark },
  { value: 'crypto', label: '₿ Billetera Crypto', description: 'USDC/USDT vía redes crypto', icon: Wallet },
]

const CO_BANKS = [
  { code: '1001', name: 'Banco de Bogotá' },
  { code: '1002', name: 'Banco Popular' },
  { code: '1006', name: 'Itaú' },
  { code: '1007', name: 'Bancolombia' },
  { code: '1009', name: 'Citibank' },
  { code: '1012', name: 'Banco GNB Sudameris' },
  { code: '1013', name: 'BBVA Colombia' },
  { code: '1019', name: 'Scotiabank Colpatria' },
  { code: '1023', name: 'Banco de Occidente' },
  { code: '1032', name: 'Banco Caja Social' },
  { code: '1040', name: 'Banco Agrario' },
  { code: '1047', name: 'Banco Mundo Mujer' },
  { code: '1051', name: 'Banco Davivienda' },
  { code: '1052', name: 'Banco AV Villas' },
  { code: '1053', name: 'Banco W' },
  { code: '1059', name: 'Bancamía' },
  { code: '1060', name: 'Banco Pichincha' },
  { code: '1061', name: 'Bancoomeva' },
  { code: '1062', name: 'Banco Falabella' },
  { code: '1063', name: 'Banco Finandina' },
  { code: '1065', name: 'Banco Santander' },
  { code: '1066', name: 'Banco Cooperativo Coopcentral' },
  { code: '1067', name: 'MiBanco' },
  { code: '1069', name: 'Banco Serfinanza' },
  { code: '1070', name: 'Lulo Bank' },
  { code: '1071', name: 'Banco J.P. Morgan Colombia' },
  { code: '1097', name: 'Dale' },
  { code: '1121', name: 'Financiera Juriscoop' },
  { code: '1283', name: 'Cooperativa Financiera de Antioquia' },
  { code: '1286', name: 'JFK Cooperativa Financiera' },
  { code: '1289', name: 'Cootrafa Cooperativa Financiera' },
  { code: '1292', name: 'Confiar Cooperativa Financiera' },
  { code: '1303', name: 'Banco Unión' },
  { code: '1370', name: 'Coltefinanciera' },
  { code: '1507', name: 'Nequi' },
  { code: '1551', name: 'Daviplata' },
  { code: '1558', name: 'Ban100' },
  { code: '1637', name: 'Iris' },
  { code: '1801', name: 'Movii' },
  { code: '1802', name: 'Ding Tecnipagos' },
  { code: '1803', name: 'Powwi' },
  { code: '1804', name: 'Ualá' },
  { code: '1805', name: 'Banco BTG Pactual' },
  { code: '1808', name: 'Bold CF' },
  { code: '1809', name: 'Nu Colombia' },
  { code: '1811', name: 'Rappipay' },
  { code: '1812', name: 'Coink' },
  { code: '1814', name: 'Global66' },
  { code: '1815', name: 'Alianza Fiduciaria' },
  { code: '1816', name: 'Crezcamos' },
]

const COUNTRY_OPTIONS = [
  { value: 'US', label: 'Estados Unidos' },
  { value: 'MX', label: 'México' },
  { value: 'CO', label: 'Colombia' },
  { value: 'BR', label: 'Brasil' },
  { value: 'AR', label: 'Argentina' },
  { value: 'PE', label: 'Perú' },
  { value: 'CL', label: 'Chile' },
  { value: 'DE', label: 'Alemania' },
  { value: 'ES', label: 'España' },
  { value: 'FR', label: 'Francia' },
  { value: 'GB', label: 'Reino Unido' },
  { value: 'NL', label: 'Países Bajos' },
  { value: 'IT', label: 'Italia' },
  { value: 'PT', label: 'Portugal' },
  { value: 'BE', label: 'Bélgica' },
  { value: 'AT', label: 'Austria' },
  { value: 'CH', label: 'Suiza' },
  { value: 'SE', label: 'Suecia' },
  { value: 'NO', label: 'Noruega' },
  { value: 'DK', label: 'Dinamarca' },
  { value: 'FI', label: 'Finlandia' },
  { value: 'PL', label: 'Polonia' },
  { value: 'IE', label: 'Irlanda' },
  { value: 'CZ', label: 'República Checa' },
  { value: 'HU', label: 'Hungría' },
  { value: 'RO', label: 'Rumania' },
  { value: 'GR', label: 'Grecia' },
  { value: 'LU', label: 'Luxemburgo' },
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
      checking_or_savings: (details.checking_or_savings as 'checking' | 'savings' | 'electronic_deposit') || 'checking',

      iban: (details.iban as string) || '',
      swift_bic: (details.swift_bic as string) || '',
      iban_country: (details.iban_country as string) || '',
      account_owner_type: (details.account_owner_type as 'individual' | 'business') || '',
      first_name: (details.first_name as string) || '',
      last_name: (details.last_name as string) || '',
      business_name: (details.business_name as string) || '',

      clabe: (details.clabe as string) || '',

      pix_mode: (details.br_code ? 'br_code' : 'pix_key') as 'pix_key' | 'br_code',
      pix_key: (details.pix_key as string) || '',
      br_code: (details.br_code as string) || '',
      document_number: (details.document_number as string) || '',

      bre_b_key: (details.bre_b_key as string) || '',

      fps_account_number: editingSupplier.payment_rail === 'faster_payments' ? (details.account_number as string) || '' : '',
      sort_code: (details.sort_code as string) || '',

      co_account_number: editingSupplier.payment_rail === 'co_bank_transfer' ? (details.account_number as string) || '' : '',
      bank_code: (details.bank_code as string) || '',
      co_account_type: (details.checking_or_savings as 'checking' | 'savings' | 'electronic_deposit') || 'savings',
      document_type: (details.document_type as 'cc' | 'ce' | 'nit' | 'rut' | 'pa' | 'ppt' | 'ti' | 'rc' | 'te' | 'die' | 'nd') || '',
      co_document_number: editingSupplier.payment_rail === 'co_bank_transfer' ? (details.document_number as string) || '' : '',
      phone_number: (details.phone_number as string) || '',

      wallet_address: isCrypto ? (details.wallet_address as string) : '',
      wallet_network: isCrypto ? ((details.wallet_network as string)?.toLowerCase() || 'ethereum') : 'ethereum',
      wallet_currency: isCrypto ? ((details.wallet_currency as string)?.toLowerCase() || 'usdc') : 'usdc',
    }
  }, [editingSupplier])

  const form = useForm<SupplierFormValues>({ defaultValues: initialData })
  const selectedRail = useWatch({ control: form.control, name: 'payment_rail' })
  const ownerType = useWatch({ control: form.control, name: 'account_owner_type' })
  const pixMode = useWatch({ control: form.control, name: 'pix_mode' })
  const addressCountry = useWatch({ control: form.control, name: 'address_country' })
  const selectedWalletNetwork = useWatch({ control: form.control, name: 'wallet_network' })

  useEffect(() => {
    if (selectedRail !== 'crypto') return
    const validTokens = NETWORK_TOKEN_MAP[selectedWalletNetwork as AllowedNetwork]
    if (!validTokens) return
    const current = form.getValues('wallet_currency')
    if (!validTokens.includes(current as AllowedCryptoCurrency)) {
      form.setValue('wallet_currency', validTokens[0])
    }
  }, [selectedWalletNetwork, selectedRail, form])

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
    const toAlpha3 = (code: string): string => {
      if (code.length === 3) return code.toUpperCase()
      const map: Record<string, string> = {
        US: 'USA', MX: 'MEX', BR: 'BRA', CO: 'COL', AR: 'ARG', CL: 'CHL',
        PE: 'PER', EC: 'ECU', BO: 'BOL', PY: 'PRY', UY: 'URY', VE: 'VEN',
        DE: 'DEU', FR: 'FRA', ES: 'ESP', IT: 'ITA', NL: 'NLD', GB: 'GBR',
        PT: 'PRT', BE: 'BEL', AT: 'AUT', CH: 'CHE', SE: 'SWE', NO: 'NOR',
        DK: 'DNK', FI: 'FIN', PL: 'POL', IE: 'IRL', CZ: 'CZE', HU: 'HUN',
        RO: 'ROU', GR: 'GRC', LU: 'LUX',
      }
      return map[code.toUpperCase()] ?? code.toUpperCase()
    }

    let currency = 'USD'
    if (values.payment_rail === 'sepa') currency = 'EUR'
    if (values.payment_rail === 'spei') currency = 'MXN'
    if (values.payment_rail === 'pix') currency = 'BRL'
    if (values.payment_rail === 'bre_b') currency = 'COP'
    if (values.payment_rail === 'co_bank_transfer') currency = 'COP'
    if (values.payment_rail === 'faster_payments') currency = 'GBP'
    if (values.payment_rail === 'crypto') currency = values.wallet_currency.toLowerCase()

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
        country: toAlpha3(values.address_country || 'USA'),
      }
    } else if (values.payment_rail === 'sepa') {
      payload.iban = values.iban
      payload.swift_bic = values.swift_bic
      payload.iban_country = values.iban_country || undefined
      payload.account_owner_type = values.account_owner_type as 'individual' | 'business'
      if (values.account_owner_type === 'individual') {
        payload.first_name = values.first_name || undefined
        payload.last_name = values.last_name || undefined
      } else if (values.account_owner_type === 'business') {
        payload.business_name = values.business_name || undefined
      }
    } else if (values.payment_rail === 'spei') {
      payload.clabe = values.clabe
      if (values.account_owner_type) {
        payload.account_owner_type = values.account_owner_type as 'individual' | 'business'
        if (values.account_owner_type === 'individual') {
          payload.first_name = values.first_name || undefined
          payload.last_name = values.last_name || undefined
        } else if (values.account_owner_type === 'business') {
          payload.business_name = values.business_name || undefined
        }
      }
    } else if (values.payment_rail === 'pix') {
      if (values.pix_mode === 'pix_key') {
        payload.pix_key = values.pix_key
      } else {
        payload.br_code = values.br_code
      }
      payload.document_number = values.document_number || undefined
      if (values.account_owner_type) {
        payload.account_owner_type = values.account_owner_type as 'individual' | 'business'
        if (values.account_owner_type === 'individual') {
          payload.first_name = values.first_name || undefined
          payload.last_name = values.last_name || undefined
        } else if (values.account_owner_type === 'business') {
          payload.business_name = values.business_name || undefined
        }
      }
    } else if (values.payment_rail === 'bre_b') {
      payload.bre_b_key = values.bre_b_key
    } else if (values.payment_rail === 'faster_payments') {
      payload.account_number = values.fps_account_number
      payload.sort_code = values.sort_code
      if (values.account_owner_type) {
        payload.account_owner_type = values.account_owner_type as 'individual' | 'business'
        if (values.account_owner_type === 'individual') {
          payload.first_name = values.first_name || undefined
          payload.last_name = values.last_name || undefined
        } else if (values.account_owner_type === 'business') {
          payload.business_name = values.business_name || undefined
        }
      }
    } else if (values.payment_rail === 'co_bank_transfer') {
      payload.account_number = values.co_account_number
      payload.bank_code = values.bank_code
      payload.checking_or_savings = values.co_account_type
      payload.document_type = values.document_type
      payload.document_number = values.co_document_number
      payload.phone_number = values.phone_number
      if (values.account_owner_type) {
        payload.account_owner_type = values.account_owner_type as 'individual' | 'business'
        if (values.account_owner_type === 'individual') {
          payload.first_name = values.first_name || undefined
          payload.last_name = values.last_name || undefined
        } else if (values.account_owner_type === 'business') {
          payload.business_name = values.business_name || undefined
        }
      }
    } else if (values.payment_rail === 'crypto') {
      payload.wallet_address = values.wallet_address
      payload.wallet_network = values.wallet_network.toLowerCase()
      payload.wallet_currency = values.wallet_currency.toLowerCase()
    }

    await onSubmitSupplier(payload, editingSupplier?.id)
  }

  // Campos condicionales de nombre de titular (SEPA requerido; SPEI/PIX/FPS/CO opcionales)
  const showOwnerFields = ['sepa', 'spei', 'pix', 'faster_payments', 'co_bank_transfer'].includes(selectedRail)
  const ownerFieldsRequired = selectedRail === 'sepa'

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
                      minLength: {
                        value: 3,
                        message: 'Mínimo 3 caracteres',
                      },
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
                              {COUNTRY_OPTIONS.map((c) => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                              ))}
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

                  {/* Nombre del banco (ACH/Wire/SEPA/SPEI) */}
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

                  {/* ── ACH / Wire ─────────────────────────────────── */}
                  {['ach', 'wire'].includes(selectedRail) && (
                    <>
                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="account_number"
                          rules={{
                            required: 'Requerido',
                            minLength: { value: 12, message: 'Mínimo 12 dígitos (requisito Bridge)' },
                            pattern: { value: /^\d+$/, message: 'Solo dígitos' },
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Number</FormLabel>
                              <FormControl><Input disabled={disabled} inputMode="numeric" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="routing_number"
                          rules={{
                            required: 'Requerido',
                            minLength: { value: 9, message: 'Exactamente 9 dígitos' },
                            maxLength: { value: 9, message: 'Exactamente 9 dígitos' },
                            pattern: { value: /^\d{9}$/, message: 'Solo dígitos, 9 caracteres' },
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Routing Number</FormLabel>
                              <FormControl><Input disabled={disabled} inputMode="numeric" maxLength={9} {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="checking_or_savings"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Cuenta</FormLabel>
                            <Select disabled={disabled} onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="checking">Checking (Corriente)</SelectItem>
                                <SelectItem value="savings">Savings (Ahorro)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

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

                      <div className="grid gap-6 md:grid-cols-2">
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
                          name="address_country"
                          rules={{ required: 'Requerido' }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>País de la dirección</FormLabel>
                              <Select disabled={disabled} onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {COUNTRY_OPTIONS.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="state"
                          rules={{ required: addressCountry === 'US' ? 'Requerido para direcciones en USA' : false }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estado {addressCountry !== 'US' && <span className="text-xs text-muted-foreground">(opcional)</span>}</FormLabel>
                              <FormControl><Input disabled={disabled} placeholder="NY" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="postal_code"
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

                  {/* ── SEPA ──────────────────────────────────────── */}
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
                            <p className="text-xs text-muted-foreground">Código ISO 3166-1 alpha-3 del país donde está la cuenta</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Tipo de titular — REQUERIDO para SEPA */}
                      <FormField
                        control={form.control}
                        name="account_owner_type"
                        rules={{ required: 'Requerido para cuentas SEPA' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Titular</FormLabel>
                            <Select disabled={disabled} onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccione el tipo de titular" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="individual">Persona física (Individual)</SelectItem>
                                <SelectItem value="business">Empresa (Business)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {ownerType === 'individual' && (
                        <div className="grid gap-6 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="first_name"
                            rules={{ required: 'Requerido para titulares individuales' }}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre</FormLabel>
                                <FormControl><Input disabled={disabled} placeholder="John" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="last_name"
                            rules={{ required: 'Requerido para titulares individuales' }}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Apellido</FormLabel>
                                <FormControl><Input disabled={disabled} placeholder="Doe" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {ownerType === 'business' && (
                        <FormField
                          control={form.control}
                          name="business_name"
                          rules={{ required: 'Requerido para titulares empresariales' }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre de la Empresa</FormLabel>
                              <FormControl><Input disabled={disabled} placeholder="Acme Corp Ltd" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </>
                  )}

                  {/* ── SPEI ──────────────────────────────────────── */}
                  {selectedRail === 'spei' && (
                    <>
                      <FormField
                        control={form.control}
                        name="clabe"
                        rules={{ required: 'Requerido', minLength: 18, maxLength: 18 }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CLABE (18 dígitos)</FormLabel>
                            <FormControl><Input disabled={disabled} maxLength={18} inputMode="numeric" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Tipo de titular — OPCIONAL para SPEI */}
                      <FormField
                        control={form.control}
                        name="account_owner_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Titular <span className="text-xs text-muted-foreground">(opcional — mejora validación Bridge)</span></FormLabel>
                            <Select disabled={disabled} onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccione (opcional)" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="individual">Persona física (Individual)</SelectItem>
                                <SelectItem value="business">Empresa (Business)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {ownerType === 'individual' && (
                        <div className="grid gap-6 md:grid-cols-2">
                          <FormField control={form.control} name="first_name" render={({ field }) => (
                            <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input disabled={disabled} {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="last_name" render={({ field }) => (
                            <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input disabled={disabled} {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      )}
                      {ownerType === 'business' && (
                        <FormField control={form.control} name="business_name" render={({ field }) => (
                          <FormItem><FormLabel>Nombre de la Empresa</FormLabel><FormControl><Input disabled={disabled} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      )}
                    </>
                  )}

                  {/* ── PIX ───────────────────────────────────────── */}
                  {selectedRail === 'pix' && (
                    <>
                      {/* Toggle PIX Key / BR Code */}
                      <div className="flex rounded-lg border overflow-hidden">
                        {(['pix_key', 'br_code'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            disabled={disabled}
                            onClick={() => form.setValue('pix_mode', mode)}
                            className={cn(
                              'flex-1 py-2 text-sm font-medium transition-colors',
                              pixMode === mode
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-background text-muted-foreground hover:bg-muted'
                            )}
                          >
                            {mode === 'pix_key' ? 'PIX Key' : 'BR Code (Copia e Cola)'}
                          </button>
                        ))}
                      </div>

                      {pixMode === 'pix_key' && (
                        <FormField
                          control={form.control}
                          name="pix_key"
                          rules={{ required: 'Requerido' }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PIX Key</FormLabel>
                              <FormControl><Input disabled={disabled} placeholder="email, CPF, teléfono o EVP" {...field} /></FormControl>
                              <p className="text-xs text-muted-foreground">Email, CPF (11 dígitos), CNPJ (14 dígitos), teléfono (+55...) o UUID aleatorio</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {pixMode === 'br_code' && (
                        <FormField
                          control={form.control}
                          name="br_code"
                          rules={{ required: 'Requerido' }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>BR Code</FormLabel>
                              <FormControl><Input disabled={disabled} placeholder="Código completo copia e cola..." {...field} /></FormControl>
                              <p className="text-xs text-muted-foreground">Pega aquí el código QR en formato texto</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name="document_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF / CNPJ <span className="text-xs text-muted-foreground">(opcional)</span></FormLabel>
                            <FormControl><Input disabled={disabled} placeholder="Solo dígitos, sin puntuación" inputMode="numeric" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Tipo de titular — OPCIONAL para PIX */}
                      <FormField
                        control={form.control}
                        name="account_owner_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Titular <span className="text-xs text-muted-foreground">(opcional)</span></FormLabel>
                            <Select disabled={disabled} onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccione (opcional)" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="individual">Persona física (Individual)</SelectItem>
                                <SelectItem value="business">Empresa (Business)</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      {ownerType === 'individual' && (
                        <div className="grid gap-6 md:grid-cols-2">
                          <FormField control={form.control} name="first_name" render={({ field }) => (
                            <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input disabled={disabled} {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="last_name" render={({ field }) => (
                            <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input disabled={disabled} {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      )}
                      {ownerType === 'business' && (
                        <FormField control={form.control} name="business_name" render={({ field }) => (
                          <FormItem><FormLabel>Nombre de la Empresa</FormLabel><FormControl><Input disabled={disabled} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      )}
                    </>
                  )}

                  {/* ── Bre-B ─────────────────────────────────────── */}
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

                  {/* ── Faster Payments (UK) ──────────────────────── */}
                  {selectedRail === 'faster_payments' && (
                    <>
                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="fps_account_number"
                          rules={{
                            required: 'Requerido',
                            minLength: { value: 8, message: 'Exactamente 8 dígitos' },
                            maxLength: { value: 8, message: 'Exactamente 8 dígitos' },
                            pattern: { value: /^\d{8}$/, message: 'Solo dígitos, 8 caracteres' },
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Number (8 dígitos)</FormLabel>
                              <FormControl><Input disabled={disabled} inputMode="numeric" maxLength={8} {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="sort_code"
                          rules={{
                            required: 'Requerido',
                            minLength: { value: 6, message: 'Exactamente 6 dígitos sin guiones' },
                            maxLength: { value: 6, message: 'Exactamente 6 dígitos sin guiones' },
                            pattern: { value: /^\d{6}$/, message: 'Solo dígitos, sin guiones' },
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sort Code (6 dígitos)</FormLabel>
                              <FormControl><Input disabled={disabled} inputMode="numeric" maxLength={6} placeholder="123456" {...field} /></FormControl>
                              <p className="text-xs text-muted-foreground">Sin guiones (ej. 123456, no 12-34-56)</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="account_owner_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Titular <span className="text-xs text-muted-foreground">(opcional)</span></FormLabel>
                            <Select disabled={disabled} onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccione (opcional)" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="individual">Persona física (Individual)</SelectItem>
                                <SelectItem value="business">Empresa (Business)</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      {ownerType === 'individual' && (
                        <div className="grid gap-6 md:grid-cols-2">
                          <FormField control={form.control} name="first_name" render={({ field }) => (
                            <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input disabled={disabled} {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="last_name" render={({ field }) => (
                            <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input disabled={disabled} {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      )}
                      {ownerType === 'business' && (
                        <FormField control={form.control} name="business_name" render={({ field }) => (
                          <FormItem><FormLabel>Nombre de la Empresa</FormLabel><FormControl><Input disabled={disabled} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      )}
                    </>
                  )}

                  {/* ── CO Bank Transfer ──────────────────────────── */}
                  {selectedRail === 'co_bank_transfer' && (
                    <>
                      <FormField
                        control={form.control}
                        name="co_account_number"
                        rules={{ required: 'Requerido' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de Cuenta</FormLabel>
                            <FormControl><Input disabled={disabled} inputMode="numeric" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="bank_code"
                          rules={{ required: 'Requerido' }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Banco</FormLabel>
                              <Select disabled={disabled} onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Seleccione banco" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {CO_BANKS.map((b) => (
                                    <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="co_account_type"
                          rules={{ required: 'Requerido' }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Cuenta</FormLabel>
                              <Select disabled={disabled} onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="checking">Corriente</SelectItem>
                                  <SelectItem value="savings">Ahorros</SelectItem>
                                  <SelectItem value="electronic_deposit">Depósito Electrónico</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="document_type"
                          rules={{ required: 'Requerido' }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Documento</FormLabel>
                              <Select disabled={disabled} onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="cc">CC — Cédula de Ciudadanía</SelectItem>
                                  <SelectItem value="ce">CE — Cédula de Extranjería</SelectItem>
                                  <SelectItem value="nit">NIT — Tax ID Empresarial</SelectItem>
                                  <SelectItem value="rut">RUT — Registro de Trabajador</SelectItem>
                                  <SelectItem value="pa">PA — Pasaporte</SelectItem>
                                  <SelectItem value="ppt">PPT — Permiso de Protección Temporal</SelectItem>
                                  <SelectItem value="ti">TI — Tarjeta de Identidad</SelectItem>
                                  <SelectItem value="rc">RC — Registro Civil</SelectItem>
                                  <SelectItem value="te">TE — Tarjeta de Extranjería</SelectItem>
                                  <SelectItem value="die">DIE — Documento de Identidad Extranjero</SelectItem>
                                  <SelectItem value="nd">ND — No Definido</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="co_document_number"
                          rules={{ required: 'Requerido' }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número de Documento</FormLabel>
                              <FormControl><Input disabled={disabled} inputMode="numeric" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="phone_number"
                        rules={{
                          required: 'Requerido',
                          pattern: { value: /^\+\d{7,15}$/, message: 'Formato E.164 (ej. +573001234567)' },
                        }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono (E.164)</FormLabel>
                            <FormControl><Input disabled={disabled} placeholder="+573001234567" {...field} /></FormControl>
                            <p className="text-xs text-muted-foreground">Incluye el código de país (ej. +57 para Colombia)</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="account_owner_type"
                        rules={{ required: 'Requerido para CO Bank Transfer' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Titular</FormLabel>
                            <Select disabled={disabled} onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccione el tipo de titular" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="individual">Persona física (Individual)</SelectItem>
                                <SelectItem value="business">Empresa (Business)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {ownerType === 'individual' && (
                        <div className="grid gap-6 md:grid-cols-2">
                          <FormField control={form.control} name="first_name" rules={{ required: 'Requerido' }} render={({ field }) => (
                            <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input disabled={disabled} {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="last_name" rules={{ required: 'Requerido' }} render={({ field }) => (
                            <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input disabled={disabled} {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      )}
                      {ownerType === 'business' && (
                        <FormField control={form.control} name="business_name" rules={{ required: 'Requerido' }} render={({ field }) => (
                          <FormItem><FormLabel>Nombre de la Empresa</FormLabel><FormControl><Input disabled={disabled} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      )}
                    </>
                  )}

                  {/* ── Crypto ────────────────────────────────────── */}
                  {selectedRail === 'crypto' && (
                    <>
                      <div className="grid gap-6 md:grid-cols-2">
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
                                  {ALLOWED_NETWORKS.map((net) => (
                                    <SelectItem key={net} value={net}>
                                      {NETWORK_LABELS[net]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="wallet_currency"
                          rules={{ required: 'La moneda es requerida' }}
                          render={({ field }) => {
                            const validTokens = NETWORK_TOKEN_MAP[selectedWalletNetwork as AllowedNetwork] ?? ALLOWED_CRYPTO_CURRENCIES
                            return (
                              <FormItem>
                                <FormLabel>Token / Moneda</FormLabel>
                                <Select disabled={disabled} onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleccione token" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {validTokens.map((cur) => (
                                      <SelectItem key={cur} value={cur}>
                                        {CRYPTO_CURRENCY_LABELS[cur]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )
                          }}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="wallet_address"
                        rules={{
                          required: 'La dirección es requerida',
                          validate: (value) => {
                            const network = form.getValues('wallet_network') as AllowedNetwork
                            if (!validateCryptoAddress(value, network)) {
                              const validator = ADDRESS_VALIDATORS[network]
                              const label = NETWORK_LABELS[network] ?? network
                              return validator
                                ? `Dirección inválida para ${label} — formato esperado: ${validator.description}`
                                : 'Dirección inválida para la red seleccionada'
                            }
                            return true
                          },
                        }}
                        render={({ field }) => {
                          const validator = ADDRESS_VALIDATORS[selectedWalletNetwork as AllowedNetwork]
                          const placeholder = selectedWalletNetwork === 'solana'
                            ? 'Ej: 4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM'
                            : selectedWalletNetwork === 'tron'
                            ? 'T...'
                            : selectedWalletNetwork === 'stellar'
                            ? 'G...'
                            : '0x...'
                          return (
                            <FormItem>
                              <FormLabel>Dirección de Wallet</FormLabel>
                              <FormControl>
                                <Input disabled={disabled} placeholder={placeholder} {...field} />
                              </FormControl>
                              {validator && (
                                <p className="text-xs text-muted-foreground">
                                  {NETWORK_LABELS[selectedWalletNetwork as AllowedNetwork]}: {validator.description}
                                </p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )
                        }}
                      />
                    </>
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
