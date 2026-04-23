import { z } from 'zod'
import { ALLOWED_NETWORKS, validateCryptoAddress, ADDRESS_VALIDATORS, type AllowedNetwork } from '@/lib/guira-crypto-config'
import { isValidRoute, isValidOffRampRoute, getOffRampMinAmount, FIAT_BO_ALLOWED_DESTINATION_CURRENCIES, getFiatBoStaticMinAmount } from '@/features/payments/lib/bridge-route-catalog'

export const paymentOrderSchema = z
  .object({
    route: z.enum([
      'bolivia_to_exterior',
      'world_to_bolivia',
      'us_to_wallet',
      'crypto_to_crypto',
      'wallet_ramp_deposit',
      'wallet_ramp_withdraw',
      'wallet_to_fiat',
    ]),
    receive_variant: z.enum(['bank_account', 'bank_qr', 'wallet']).optional(),
    ui_method_group: z.enum(['bank', 'crypto']).optional(),
    supplier_id: z.string().optional(),
    amount_origin: z.coerce.number().positive('El monto debe ser mayor a cero.'),
    amount_converted: z.coerce.number().nonnegative('Ingresa un monto destino valido.'),
    fee_total: z.coerce.number().nonnegative('Ingresa una fee valida.'),
    exchange_rate_applied: z.coerce.number().positive('Ingresa un tipo de cambio valido.'),
    origin_currency: z.string().trim().min(1, 'Selecciona la moneda origen.'),
    destination_currency: z.string().trim().min(1, 'Selecciona la moneda destino.'),
    delivery_method: z.enum(['swift', 'ach', 'crypto']).optional(),
    payment_reason: z.string().trim().optional().default(''),
    intended_amount: z.coerce.number().nonnegative('Ingresa un monto valido.').optional().default(0),
    destination_address: z.string().trim().optional().default(''),
    stablecoin: z.string().trim().min(2, 'Ingresa la stablecoin.'),
    funding_method: z.enum(['bs', 'crypto', 'ach', 'wallet']).optional(),
    swift_bank_name: z.string().trim().optional(),
    swift_code: z.string().trim().optional(),
    swift_iban: z.string().trim().optional(),
    swift_bank_address: z.string().trim().optional(),
    swift_country: z.string().trim().optional(),
    ach_routing_number: z.string().trim().optional(),
    ach_account_number: z.string().trim().optional(),
    ach_bank_name: z.string().trim().optional(),
    crypto_address: z.string().trim().optional(),
    crypto_network: z.string().trim().optional(),
    source_crypto_network: z.string().trim().optional(),
    source_crypto_address: z.string().trim().optional(),
    destination_account_holder: z.string().trim().optional(),
    destination_qr_url: z.string().trim().optional(),
    wallet_ramp_method: z.enum(['fiat_bo', 'crypto', 'fiat_us']).optional(),
    wallet_ramp_wallet_id: z.string().optional(),
    wallet_ramp_va_id: z.string().optional(),
    wallet_ramp_source_network: z.string().optional(),
    wallet_ramp_source_address: z.string().optional(),
    wallet_ramp_destination_currency: z.string().optional(),
    // Wallet withdraw (bridge_wallet_to_fiat_bo / crypto / fiat_us) fields
    wallet_ramp_withdraw_method: z.enum(['fiat_bo', 'crypto', 'fiat_us']).optional(),
    withdraw_bank_name: z.string().trim().optional(),
    withdraw_account_number: z.string().trim().optional(),
    withdraw_account_holder: z.string().trim().optional(),
    // wallet_to_fiat: origen on-chain
    wallet_to_fiat_source_network: z.string().trim().optional(),
    wallet_to_fiat_source_address: z.string().trim().optional(),
    wallet_to_fiat_source_currency: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {

    // ── wallet_to_fiat validations ──
    if (value.route === 'wallet_to_fiat') {
      const VALID_NETWORKS = ['ethereum', 'solana', 'tron', 'polygon', 'stellar']
      if (!value.wallet_to_fiat_source_network) {
        ctx.addIssue({ code: 'custom', message: 'Selecciona la red de origen.', path: ['wallet_to_fiat_source_network'] })
      } else if (!VALID_NETWORKS.includes(value.wallet_to_fiat_source_network)) {
        ctx.addIssue({ code: 'custom', message: `Red inválida. Opciones: ${VALID_NETWORKS.join(', ')}`, path: ['wallet_to_fiat_source_network'] })
      }
      if (!value.wallet_to_fiat_source_currency) {
        ctx.addIssue({ code: 'custom', message: 'Selecciona el token de origen (usdc / usdt).', path: ['wallet_to_fiat_source_currency'] })
      }
      if (!value.wallet_to_fiat_source_address || value.wallet_to_fiat_source_address.trim().length < 10) {
        ctx.addIssue({ code: 'custom', message: 'Ingresa la dirección on-chain de origen.', path: ['wallet_to_fiat_source_address'] })
      }
      if (!value.supplier_id) {
        ctx.addIssue({ code: 'custom', message: 'Selecciona un proveedor fiat destino.', path: ['supplier_id'] })
      }
      if (!value.payment_reason || value.payment_reason.trim().length < 5) {
        ctx.addIssue({ code: 'custom', message: 'El motivo del retiro es obligatorio (mín. 5 caracteres).', path: ['payment_reason'] })
      }
      return
    }

    if (value.route === 'wallet_ramp_deposit') {
      if (!value.wallet_ramp_method) {
        ctx.addIssue({ code: 'custom', message: 'Debes seleccionar un método de fondeo.', path: ['wallet_ramp_method'] })
      }
      
      if (value.wallet_ramp_method === 'fiat_bo' || value.wallet_ramp_method === 'crypto') {
        if (!value.wallet_ramp_wallet_id) {
          ctx.addIssue({ code: 'custom', message: 'Selecciona una billetera destino.', path: ['wallet_ramp_wallet_id'] })
        }
      }

      if (value.wallet_ramp_method === 'fiat_us') {
        if (!value.wallet_ramp_va_id) {
          ctx.addIssue({ code: 'custom', message: 'Selecciona tu cuenta virtual origen.', path: ['wallet_ramp_va_id'] })
        }
      }

      if (value.wallet_ramp_method === 'crypto') {
        if (!value.wallet_ramp_source_network) {
          ctx.addIssue({ code: 'custom', message: 'Selecciona la red de origen.', path: ['wallet_ramp_source_network'] })
        }
        // source_address ya no es requerido: Bridge acepta depósitos desde cualquier
        // dirección gracias a features.allow_any_from_address = true.
      }

      // ── Validar token de destino para fiat_bo y crypto ──
      if (value.wallet_ramp_method === 'fiat_bo' || value.wallet_ramp_method === 'crypto') {
        if (!value.wallet_ramp_destination_currency) {
          ctx.addIssue({ code: 'custom', message: 'Selecciona el token de destino.', path: ['wallet_ramp_destination_currency'] })
        }
      }

      // ── Validar que fiat_bo destino sea USD-pegged (EURC excluido Etapa 1) ──
      if (value.wallet_ramp_method === 'fiat_bo' && value.wallet_ramp_destination_currency) {
        if (!(FIAT_BO_ALLOWED_DESTINATION_CURRENCIES as readonly string[]).includes(value.wallet_ramp_destination_currency.toLowerCase())) {
          ctx.addIssue({ code: 'custom', message: 'Solo tokens USD-pegged (USDC, USDT, USDB, PYUSD) están disponibles para fondeo con BOB.', path: ['wallet_ramp_destination_currency'] })
        }
      }

      // ── Validar compatibilidad de ruta Bridge para crypto ──
      if (
        value.wallet_ramp_method === 'crypto' &&
        value.wallet_ramp_source_network &&
        value.origin_currency &&
        value.wallet_ramp_destination_currency
      ) {
        if (!isValidRoute(
          value.wallet_ramp_source_network,
          value.origin_currency.toLowerCase(),
          value.wallet_ramp_destination_currency.toLowerCase()
        )) {
          ctx.addIssue({
            code: 'custom',
            message: 'Esta combinación de red/moneda origen/destino no es soportada por Bridge.',
            path: ['wallet_ramp_destination_currency']
          })
        }
      }

      // Early return to avoid triggering interbank route validations
      return
    }

    // ── Wallet withdraw route validations
    if (value.route === 'wallet_ramp_withdraw') {
      if (!value.wallet_ramp_withdraw_method) {
        ctx.addIssue({ code: 'custom', message: 'Debes seleccionar un método de retiro.', path: ['wallet_ramp_withdraw_method'] })
      }
      
      if (!value.wallet_ramp_wallet_id) {
        ctx.addIssue({ code: 'custom', message: 'Selecciona la wallet de origen.', path: ['wallet_ramp_wallet_id'] })
      }

      if (value.wallet_ramp_withdraw_method === 'fiat_bo') {
        // Validar token de origen obligatorio
        if (!value.origin_currency || value.origin_currency.trim().length === 0) {
          ctx.addIssue({ code: 'custom', message: 'Selecciona el token de origen.', path: ['origin_currency'] })
        } else {
          // Validar monto mínimo según catálogo Bridge
          const staticMin = getFiatBoStaticMinAmount(value.origin_currency)
          if (staticMin > 0 && (value.amount_origin ?? 0) > 0 && (value.amount_origin ?? 0) < staticMin) {
            ctx.addIssue({ code: 'custom', message: `Monto mínimo para ${value.origin_currency.toUpperCase()}: ${staticMin}`, path: ['amount_origin'] })
          }
        }
        // La validación de cuenta bancaria se realiza en el backend.
        // El backend verifica que exista en client_bank_accounts y que esté aprobada.
        // No se requieren campos manuales de banco desde el formulario.
      } else if (value.wallet_ramp_withdraw_method === 'crypto') {
        if (!value.crypto_address) {
          ctx.addIssue({ code: 'custom', message: 'La direccion cripto es obligatoria.', path: ['crypto_address'] })
        }
        if (!value.crypto_network) {
           ctx.addIssue({ code: 'custom', message: 'La red es obligatoria.', path: ['crypto_network'] })
        }
        if (!value.origin_currency || value.origin_currency.trim().length === 0) {
          ctx.addIssue({ code: 'custom', message: 'Selecciona el token de origen.', path: ['origin_currency'] })
        }
        if (!value.destination_currency || value.destination_currency.trim().length === 0) {
          ctx.addIssue({ code: 'custom', message: 'Selecciona el token de destino.', path: ['destination_currency'] })
        }
        // Validar formato de dirección según red seleccionada
        if (
          value.crypto_address &&
          value.crypto_network &&
          (ALLOWED_NETWORKS as readonly string[]).includes(value.crypto_network)
        ) {
          const network = value.crypto_network as AllowedNetwork
          if (!validateCryptoAddress(value.crypto_address, network)) {
            const validator = ADDRESS_VALIDATORS[network]
            ctx.addIssue({
              code: 'custom',
              message: `Dirección inválida para ${network}. Formato: ${validator?.description ?? 'desconocido'}`,
              path: ['crypto_address'],
            })
          }
        }
        // Validar que la ruta off-ramp sea soportada por Bridge
        if (value.origin_currency && value.crypto_network && value.destination_currency) {
          if (!isValidOffRampRoute(value.origin_currency, value.crypto_network, value.destination_currency)) {
            ctx.addIssue({
              code: 'custom',
              message: 'Esta combinación de token origen / red / token destino no es soportada por Bridge.',
              path: ['destination_currency'],
            })
          } else {
            // Validar monto mínimo según la ruta seleccionada
            const minAmount = getOffRampMinAmount(value.origin_currency, value.crypto_network, value.destination_currency)
            const amount = Number(value.amount_origin)
            if (minAmount > 0 && (!amount || amount < minAmount)) {
              ctx.addIssue({
                code: 'custom',
                message: `El monto mínimo para esta ruta es ${minAmount} ${value.origin_currency.toUpperCase()}.`,
                path: ['amount_origin'],
              })
            }
          }
        }
      } else if (value.wallet_ramp_withdraw_method === 'fiat_us') {
        if (!value.origin_currency || value.origin_currency.trim().length === 0) {
          ctx.addIssue({ code: 'custom', message: 'Selecciona el token de origen.', path: ['origin_currency'] })
        }
        if (!value.supplier_id) {
          ctx.addIssue({ code: 'custom', message: 'Selecciona un proveedor para el retiro.', path: ['supplier_id'] })
        }
      }
      
      return
    }

    // Enforce delivery_method and destination_address for non-wallet-ramp routes
    if (!value.delivery_method) {
      ctx.addIssue({ code: 'custom', message: 'Selecciona un método de entrega.', path: ['delivery_method'] })
    }

    if (!value.destination_address || value.destination_address.length < 3) {
      ctx.addIssue({ code: 'custom', message: 'Ingresa el destino.', path: ['destination_address'] })
    }

    if (value.route === 'bolivia_to_exterior' && !value.supplier_id) {
      ctx.addIssue({
        code: 'custom',
        message: 'Selecciona un proveedor o beneficiario antes de continuar.',
        path: ['supplier_id'],
      })
    }

    if (value.route === 'bolivia_to_exterior' && !value.ui_method_group) {
      ctx.addIssue({
        code: 'custom',
        message: 'Selecciona si el envio sale por banco o por crypto.',
        path: ['ui_method_group'],
      })
    }

    if ((value.route === 'bolivia_to_exterior' || value.route === 'crypto_to_crypto' || value.route === 'world_to_bolivia') && (value.payment_reason?.length ?? 0) < 5) {
      ctx.addIssue({
        code: 'custom',
        message: 'Describe el motivo del pago.',
        path: ['payment_reason'],
      })
    }

    if (value.route === 'bolivia_to_exterior') {
      if (!value.funding_method) {
        ctx.addIssue({
          code: 'custom',
          message: 'Selecciona el funding method documentado.',
          path: ['funding_method'],
        })
      }
    }

    if (value.route === 'world_to_bolivia') {
      const requiredFields: Array<[keyof typeof value, string]> = [
        ['ach_account_number', 'La cuenta bancaria es obligatoria.'],
        ['ach_bank_name', 'El banco es obligatorio.'],
        ['destination_account_holder', 'El nombre del titular de la cuenta destino es obligatorio.'],
      ]

      requiredFields.forEach(([field, message]) => {
        if (!value[field]) {
          ctx.addIssue({ code: 'custom', message, path: [field] })
        }
      })
    }

    if (value.delivery_method === 'crypto') {
      if (!value.crypto_address) {
        ctx.addIssue({
          code: 'custom',
          message: 'La direccion cripto es obligatoria.',
          path: ['crypto_address'],
        })
      }
      if (!value.crypto_network) {
        ctx.addIssue({
          code: 'custom',
          message: 'La red es obligatoria.',
          path: ['crypto_network'],
        })
      }
    }

    if (value.route === 'crypto_to_crypto') {
      if (!value.source_crypto_network) {
        ctx.addIssue({
          code: 'custom',
          message: 'La red de origen es obligatoria.',
          path: ['source_crypto_network'],
        })
      }
      if (!value.source_crypto_address) {
        ctx.addIssue({
          code: 'custom',
          message: 'La dirección cripto de origen es obligatoria.',
          path: ['source_crypto_address'],
        })
      }
    }
  })

export type PaymentOrderFormValues = z.infer<typeof paymentOrderSchema>

