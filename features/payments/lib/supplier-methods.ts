import type {
  Supplier,
  SupplierAchDetails,
  SupplierPaymentMethod,
  SupplierSwiftDetails,
} from '@/types/supplier'

const METHOD_ORDER: SupplierPaymentMethod[] = ['crypto', 'ach', 'swift']

export function parseSupplierPaymentMethods(
  paymentRail: string | undefined | null,
  supplier?: Supplier | null
) {
  const fromValue = Array.isArray(paymentRail)
    ? paymentRail
    : String(paymentRail ?? '')
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
    if (supplier?.bank_details?.wallet_address) normalized.add('crypto')
    if (getSupplierAchDetails(supplier)) normalized.add('ach')
    if (getSupplierSwiftDetails(supplier)) normalized.add('swift')
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
      bank_name: (supplier.bank_details.bank_name as string) ?? '',
      routing_number: supplier.bank_details.routing_number as string,
      account_number: supplier.bank_details.account_number as string,
      bank_country: (supplier.bank_details.bank_country as string) ?? supplier.country,
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
      bank_name: (supplier.bank_details.bank_name as string) ?? '',
      swift_code: supplier.bank_details.swift_code as string,
      account_number: supplier.bank_details.account_number as string,
      bank_country: (supplier.bank_details.bank_country as string) ?? supplier.country,
      bank_address: (supplier.bank_details.bank_address as string) ?? '',
    }
  }

  return undefined
}
