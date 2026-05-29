import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Building2, MapPin, Phone, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CLIENT_TYPE_LABEL, formatNoVisitDays, cn } from '@/lib/utils'
import type { Client } from '@/types/domain'

export const metadata: Metadata = { title: '거래처 관리' }

async function getClients(tenantId: string, q?: string, type?: string) {
  const supabase = await createClient()
  let query = supabase
    .schema('lso')
    .from('clients')
    .select('id, name, client_type, phone, address, region, status, last_visited_at, lat, lng')
    .eq('tenant_id', tenantId)
    .order('name')
    .limit(100)

  if (q)    query = query.ilike('name', `%${q}%`)
  if (type && type !== 'all') query = query.eq('client_type', type)

  const { data } = await query
  return (data ?? []) as unknown as Client[]
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const { q, type } = await searchParams
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id') ?? ''
  const role     = headersList.get('x-user-role') ?? 'rep'

  const clients = await getClients(tenantId, q, type)

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-dk-text">거래처 관리</h1>
          <p className="text-xs text-dk-muted mt-0.5">총 {clients.length}개</p>
        </div>
        {(role === 'admin' || role === 'manager') && (
          <Link
            href="/app/clients/new"
            className="px-3 py-1.5 bg-dk-accent text-white text-sm font-semibold rounded-lg hover:bg-dk-accentHover transition-colors"
          >
            + 거래처 등록
          </Link>
        )}
      </div>

      <form className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dk-dim" />
          <input
            name="q"
            defaultValue={q}
            placeholder="업체명 검색..."
            className="w-full pl-9 pr-3 py-2 bg-dk-surface border border-dk-border rounded-lg text-sm text-dk-text placeholder-dk-dim focus:outline-none focus:border-dk-border2"
          />
        </div>
        <select
          name="type"
          defaultValue={type ?? 'all'}
          className="px-3 py-2 bg-dk-surface border border-dk-border rounded-lg text-sm text-dk-text focus:outline-none focus:border-dk-border2"
        >
          <option value="all">전체 유형</option>
          {Object.entries(CLIENT_TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-dk-surface2 text-dk-text text-sm rounded-lg border border-dk-border hover:border-dk-border2 transition-colors"
        >
          검색
        </button>
      </form>

      <div className="space-y-2">
        {clients.length === 0 ? (
          <div className="py-16 text-center text-dk-dim text-sm">
            {q ? `"${q}"에 해당하는 거래처가 없습니다` : '등록된 거래처가 없습니다'}
          </div>
        ) : (
          clients.map(client => (
            <Link
              key={client.id}
              href={`/app/clients/${client.id}`}
              className="flex items-center gap-3 p-3 bg-dk-surface border border-dk-border rounded-xl hover:border-dk-border2 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-dk-surface2 flex items-center justify-center shrink-0 group-hover:bg-tint-blue transition-colors">
                <Building2 className="w-5 h-5 text-dk-muted group-hover:text-dk-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-dk-text truncate">{client.name}</p>
                  <span className={cn(
                    'shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium',
                    client.status === 'active' ? 'bg-tint-green border border-tint-green-border text-dk-green' : 'bg-dk-surface2 text-dk-dim'
                  )}>
                    {CLIENT_TYPE_LABEL[client.client_type] ?? client.client_type}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {client.address && (
                    <span className="flex items-center gap-1 text-xs text-dk-dim truncate">
                      <MapPin className="w-3 h-3 shrink-0" />{client.address}
                    </span>
                  )}
                  {client.phone && (
                    <span className="flex items-center gap-1 text-xs text-dk-dim shrink-0">
                      <Phone className="w-3 h-3" />{client.phone}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-dk-muted">{formatNoVisitDays(client.last_visited_at)}</p>
                {!client.lat && <p className="text-[10px] text-dk-dim mt-0.5">위치 없음</p>}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
