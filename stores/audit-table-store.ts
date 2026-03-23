import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuditVisibleColumns {
  user: boolean
  role: boolean
  table: boolean
  record: boolean
  action: boolean
  fields: boolean
  reason: boolean
  source: boolean
  date: boolean
}

const defaultVisibleColumns: AuditVisibleColumns = {
  user: true,
  role: true,
  table: true,
  record: true,
  action: true,
  fields: true,
  reason: true,
  source: true,
  date: true,
}

interface AuditTableState {
  visibleColumns: AuditVisibleColumns
  setColumnVisibility: (column: keyof AuditVisibleColumns, visible: boolean) => void
  resetVisibleColumns: () => void
}

export const useAuditTableStore = create<AuditTableState>()(
  persist(
    (set) => ({
      visibleColumns: defaultVisibleColumns,
      setColumnVisibility: (column, visible) =>
        set((state) => ({
          visibleColumns: {
            ...state.visibleColumns,
            [column]: visible,
          },
        })),
      resetVisibleColumns: () => set({ visibleColumns: defaultVisibleColumns }),
    }),
    {
      name: 'audit-table-columns',
    }
  )
)

