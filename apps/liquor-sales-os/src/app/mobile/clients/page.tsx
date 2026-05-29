import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Building2, MapPin, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CLIENT_TYPE_LABEL, formatNoVisitDays } from '@/lib/utils'
import type { Client } from '@/types/domain'

export const metadata: Metadata = { title: '내 거래처' }

export default async function MobileClientsPage() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const userId   = headersList.get('x-user-id')   ?? ''

  const supabase = await createClient()

  const { data: assignments } = await supabase
    .schema('lso')
    .from('sales_assignments')
    .select('client_id')
    .eq('tenant_id', tenantId)
    .eq('rep_user_id', userId)
    .eq('is_active', true)

  const clientIds = (assignments ?? []).map(a => a.client_id)

  const clients: Client[] = []
  if (clientIds.length > 0) {
    const { data } = await supabase
      .schema('lso')
      .from('clients')
      .select('id, name, client_type, phone, mobile, address, last_visited_at, status')
      .in('id', clientIds)
      .eq('status', 'active')
      .order('name')
    if (data) clients.push(...(data as unknown as Client[]))
  }

  return (
    <div className="pb-4">
      <div className="px-4 py-4 border-b border-dk-border bg-dk-surface">
        <h1 className="text-base font-bold text-dk-text">내 거래처</h1>
        <p className="text-xs text-dk-muted mt-0.5">담당 {clients.length}개</p>
      </div>

      <div className="divide-y divide-dk-border">
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-dk-dim text-sm gap-2">
            <Building2 className="w-6 h-6" />배정된 거래처가 없습니다
          </div>
        ) : (
          clients.map(client => (
            <Link
              key={client.id}
              href={`/app/clients/${client.id}`}
              className="flex items-center gap-3 px-4 py-4 hover:bg-dk-surface2 active:bg-dk-surface2 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-dk-surface2 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-dk-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-dk-text truncate">{client.name}</p>
                  <span className="text-[10px] text-dk-dim shrink-0">
                    {CLIENT_TYPE_LABEL[client.client_type] ?? client.client_type}
                  </span>
                </div>
                {client.address && (
                  <p className="flex items-center gap-1 text-xs text-dk-dim mt-0.5 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />{client.address}
                  </p>
                )}
                {client.phone && (
                  <p className="flex items-center gap-1 text-xs text-dk-dim mt-0.5">
                    <Phone className="w-3 h-3 shrink-0" />{client.phone}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-dk-muted">{formatNoVisitDays(client.last_visited_at)}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
