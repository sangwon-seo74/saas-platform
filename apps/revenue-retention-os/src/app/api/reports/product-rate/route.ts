// GET /api/reports/product-rate?year=2025
// 상품별 갱신율 분석

import { ok, err } from '@/lib/utils'
import { withAuth } from '@/lib/api'
import { createRouteHandlerClient } from '@/lib/supabase/client'

export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year') ?? new Date().getFullYear())
  const { supabase } = createRouteHandlerClient(req)

  const from = `${year}-01-01`
  const to   = `${year}-12-31`

  const { data: renewals, error } = await supabase
    .from('renewals')
    .select(`
      status, result, contract_expires_at,
      contract:contracts!contract_id(
        final_amount,
        product:products!product_id(id, name)
      )
    `)
    .eq('tenant_id', ctx.tenantId)
    .in('status', ['won', 'lost'])
    .gte('contract_expires_at', from)
    .lte('contract_expires_at', to)

  if (error) return err('DB_ERROR', error.message, 500)

  type ProductBucket = {
    product_id: string
    product_name: string
    won: number; lost: number; total: number
    renewed: number; upsell: number; downgrade: number
    won_amount: number
  }

  const productMap = new Map<string, ProductBucket>()

  for (const r of renewals ?? []) {
    const contract = r.contract as unknown as { final_amount: number; product: { id: string; name: string } | null } | null
    const product  = contract?.product
    const key      = product?.id ?? '__none__'
    const name     = product?.name ?? '상품 미지정'
    const amount   = contract?.final_amount ?? 0

    if (!productMap.has(key)) {
      productMap.set(key, { product_id: key, product_name: name, won: 0, lost: 0, total: 0, renewed: 0, upsell: 0, downgrade: 0, won_amount: 0 })
    }
    const row = productMap.get(key)!
    row.total++

    if (r.status === 'won') {
      row.won++
      row.won_amount += amount
      if (r.result === 'upsell')         row.upsell++
      else if (r.result === 'downgrade') row.downgrade++
      else                               row.renewed++
    } else {
      row.lost++
    }
  }

  const products = Array.from(productMap.values())
    .map(p => ({
      ...p,
      rate: p.total > 0 ? Math.round(p.won / p.total * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.won_amount - a.won_amount)

  return ok({ products, year })
}, { roles: ['admin', 'manager'] })
