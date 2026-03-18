'use client'

import { useEffect, useState } from 'react'
import { SupportService } from '@/services/support.service'
import { SupportTicket } from '@/types/support'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

export function StaffSupportList() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await SupportService.getAllTickets()
        setTickets(data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const getStatusBadge = (status: string | undefined) => {
    switch(status) {
      case 'open': return <Badge variant="default">Abierto</Badge>
      case 'in_progress': return <Badge variant="secondary">En Progreso</Badge>
case 'resolved': return <Badge variant="outline" className="border-emerald-400/40 text-emerald-300">Resuelto</Badge>
      case 'closed': return <Badge variant="outline">Cerrado</Badge>
      default: return null
    }
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tickets de Soporte (Staff)</CardTitle>
        <CardDescription>Bandeja general de solicitudes de los clientes.</CardDescription>
      </CardHeader>
      <CardContent>
         <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                 <TableRow><TableCell colSpan={4} className="text-center">No hay tickets activos.</TableCell></TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="text-sm whitespace-nowrap">{new Date(ticket.created_at || '').toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm">{(ticket as unknown as { profiles?: { full_name: string } }).profiles?.full_name || ticket.contact_email}</TableCell>
                    <TableCell className="font-medium text-sm">{ticket.subject}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
         </Table>
      </CardContent>
    </Card>
  )
}
