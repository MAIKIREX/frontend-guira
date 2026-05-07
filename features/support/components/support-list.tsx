'use client'

import { useEffect, useState } from 'react'
import { SupportService } from '@/services/support.service'
import { SupportTicket } from '@/types/support'
import { useAuthStore } from '@/stores/auth-store'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { GuiraLoadingInline } from '@/components/shared/guira-loading'

export function SupportList() {
  const { user } = useAuthStore()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTickets = async () => {
      if (!user) return
      try {
        const data = await SupportService.getTickets()
        setTickets(data)
      } finally {
        setLoading(false)
      }
    }
    fetchTickets()
  }, [user])

  const getStatusBadge = (status: string | undefined) => {
    switch(status) {
      case 'open': return <Badge variant="default">Abierto</Badge>
      case 'in_progress': return <Badge variant="secondary">En Progreso</Badge>
      case 'resolved': return <Badge variant="outline" className="border-emerald-400/40 text-emerald-300">Resuelto</Badge>
      case 'closed': return <Badge variant="outline">Cerrado</Badge>
      default: return null
    }
  }

  if (loading) return <div className="flex justify-center p-8"><GuiraLoadingInline /></div>
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Mis Tickets de Soporte
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Historial de solicitudes de asistencia.
        </p>
      </div>
      
      <div className="rounded-lg border border-border/40 bg-background/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-medium">Fecha</TableHead>
              <TableHead className="font-medium">Asunto</TableHead>
              <TableHead className="font-medium">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No has creado ningún ticket.</TableCell></TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.id} className="hover:bg-muted/30">
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(ticket.created_at || '').toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium text-sm">{ticket.subject}</TableCell>
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
