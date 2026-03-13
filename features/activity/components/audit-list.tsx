'use client'

import { useEffect, useState } from 'react'
import { ActivityService } from '@/services/activity.service'
import { AuditLog } from '@/types/activity-log'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2 } from 'lucide-react'

export function AuditList() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
         const data = await ActivityService.getAuditLogs()
        setLogs(data)
      } catch {
         console.error('Failed to load audit logs')
      } finally {
         setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Auditoría (Staff & Admin)</CardTitle>
        <CardDescription>Últimas 50 acciones críticas realizadas internamente.</CardDescription>
      </CardHeader>
      <CardContent>
         <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Tabla</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                 <TableRow><TableCell colSpan={6} className="text-center">Sin auditoría registrada.</TableCell></TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{(log as unknown as { profiles?: { full_name: string } }).profiles?.full_name || log.performed_by}</TableCell>
                    <TableCell className="text-sm">{log.role}</TableCell>
                    <TableCell className="font-medium text-sm capitalize">{log.action}</TableCell>
                    <TableCell className="text-sm">{log.table_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.reason || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
         </Table>
      </CardContent>
    </Card>
  )
}
