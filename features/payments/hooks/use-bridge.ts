'use client'

/**
 * use-bridge.ts — NUEVO HOOK
 *
 * Estado de cuentas externas Bridge y liquidation addresses del usuario.
 * Usado por la sección "Proveedores internacionales" y el flujo de retiro.
 */
import { useCallback, useEffect, useState } from 'react'
import { BridgeService } from '@/services/bridge.service'
import type {
  ExternalAccount,
  LiquidationAddress,
  BridgePayout,
  CreateExternalAccountDto,
  CreateLiquidationAddressDto,
} from '@/services/bridge.service'

export interface BridgeState {
  externalAccounts: ExternalAccount[]
  liquidationAddresses: LiquidationAddress[]
  payouts: BridgePayout[]
}

export function useBridge() {
  const [state, setState] = useState<BridgeState>({
    externalAccounts: [],
    liquidationAddresses: [],
    payouts: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [externalAccounts, liquidationAddresses, payouts] = await Promise.all([
        BridgeService.getExternalAccounts(),
        BridgeService.getLiquidationAddresses(),
        BridgeService.getPayouts(),
      ])

      setState({ externalAccounts, liquidationAddresses, payouts })
    } catch (err) {
      console.error('Failed to load Bridge state', err)
      setError('No se pudo cargar la información de Bridge.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // ── Optimistic updates ────────────────────────────────────────

  const addExternalAccount = useCallback(async (dto: CreateExternalAccountDto) => {
    const account = await BridgeService.createExternalAccount(dto)
    setState((current) => ({
      ...current,
      externalAccounts: [...current.externalAccounts, account],
    }))
    return account
  }, [])

  const removeExternalAccount = useCallback(async (accountId: string) => {
    await BridgeService.deleteExternalAccount(accountId)
    setState((current) => ({
      ...current,
      externalAccounts: current.externalAccounts.filter((a) => a.id !== accountId),
    }))
  }, [])

  const addLiquidationAddress = useCallback(async (dto: CreateLiquidationAddressDto) => {
    const address = await BridgeService.createLiquidationAddress(dto)
    setState((current) => ({
      ...current,
      liquidationAddresses: [...current.liquidationAddresses, address],
    }))
    return address
  }, [])

  const removeLiquidationAddress = useCallback(async (addressId: string) => {
    await BridgeService.deleteLiquidationAddress(addressId)
    setState((current) => ({
      ...current,
      liquidationAddresses: current.liquidationAddresses.filter((a) => a.id !== addressId),
    }))
  }, [])

  return {
    state,
    loading,
    error,
    reload: load,
    addExternalAccount,
    removeExternalAccount,
    addLiquidationAddress,
    removeLiquidationAddress,
  }
}
