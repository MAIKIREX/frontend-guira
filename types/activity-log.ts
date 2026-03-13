export interface ActivityLog {
  id: string
  user_id: string
  action: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface AuditLog {
  id: string
  performed_by: string
  role: string
  action: string
  table_name: string
  record_id: string
  previous_values: Record<string, unknown>
  new_values: Record<string, unknown>
  reason: string
  source: string
  created_at: string
}
