'use client'

import { useEffect, useState } from 'react'
import { ActivityService } from '@/services/activity.service'
import { ActivityLog } from '@/types/activity-log'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { GuiraLoadingInline } from '@/components/shared/guira-loading'

export function ActivityList() {
  const { user } = useAuthStore()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      try {
         const data = await ActivityService.getUserActivity()
         setLogs(data)
      } catch {
         console.error('Failed to load activity')
      } finally {
         setLoading(false)
      }
    }
    load()
  }, [user])

  if (loading) return <div className="flex justify-center p-8"><GuiraLoadingInline /></div>
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad Reciente</CardTitle>
        <CardDescription>Registro de las últimas 50 interacciones operativas con tu cuenta.</CardDescription>
      </CardHeader>
      <CardContent>
         <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                 <TableRow><TableCell colSpan={2} className="text-center">Sin actividad registrada.</TableCell></TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-medium text-sm capitalize">{log.action.replace(/_/g, ' ')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
         </Table>
      </CardContent>
    </Card>
  )
}
