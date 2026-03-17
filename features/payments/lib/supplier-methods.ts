import type {
  Supplier,
  SupplierAchDetails,
  SupplierPaymentMethod,
  SupplierSwiftDetails,
} from '@/types/supplier'

const METHOD_ORDER: SupplierPaymentMethod[] = ['crypto', 'ach', 'swift']

export function parseSupplierPaymentMethods(
  paymentMethod: Supplier['payment_method'],
  supplier?: Pick<Supplier, 'bank_details' | 'crypto_details'>
) {
  const fromValue = Array.isArray(paymentMethod)
    ? paymentMethod
    : String(paymentMethod ?? '')
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)

  const normalized = new Set<SupplierPaymentMethod>()

  for (const method of fromValue) {
    if (method === 'crypto' || method === 'ach' || method === 'swift') {
      normalized.add(method)
    }

    if (method === 'bank') {
      if (getSupplierAchDetails(supplier as Supplier | undefined)) normalized.add('ach')
      if (getSupplierSwiftDetails(supplier as Supplier | undefined)) normalized.add('swift')
      if (normalized.size === 0) normalized.add('swift')
    }
  }

  if (normalized.size === 0) {
    if (supplier?.crypto_details?.address) normalized.add('crypto')
    if (getSupplierAchDetails(supplier as Supplier | undefined)) normalized.add('ach')
    if (getSupplierSwiftDetails(supplier as Supplier | undefined)) normalized.add('swift')
  }

  return METHOD_ORDER.filter((method) => normalized.has(method))
}

export function serializeSupplierPaymentMethods(methods: SupplierPaymentMethod[]) {
  return METHOD_ORDER.filter((method) => methods.includes(method)).join(',')
}

export function getSupplierAchDetails(supplier?: Supplier | null): SupplierAchDetails | undefined {
  if (!supplier?.bank_details) return undefined

  if (supplier.bank_details.ach) {
    return supplier.bank_details.ach
  }

  if (supplier.bank_details.routing_number && supplier.bank_details.account_number) {
    return {
      bank_name: supplier.bank_details.bank_name ?? '',
      routing_number: supplier.bank_details.routing_number,
      account_number: supplier.bank_details.account_number,
      bank_country: supplier.bank_details.bank_country ?? supplier.country,
    }
  }

  return undefined
}

export function getSupplierSwiftDetails(
  supplier?: Supplier | null
): SupplierSwiftDetails | undefined {
  if (!supplier?.bank_details) return undefined

  if (supplier.bank_details.swift) {
    return supplier.bank_details.swift
  }

  if (supplier.bank_details.swift_code && supplier.bank_details.account_number) {
    return {
      bank_name: supplier.bank_details.bank_name ?? '',
      swift_code: supplier.bank_details.swift_code,
      account_number: supplier.bank_details.account_number,
      bank_country: supplier.bank_details.bank_country ?? supplier.country,
      bank_address: supplier.address,
    }
  }

  return undefined
}
