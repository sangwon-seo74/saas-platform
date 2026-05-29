export type ClientType = 'restaurant' | 'bar' | 'wholesale' | 'retail' | 'other'
export type ClientStatus = 'active' | 'inactive' | 'suspended'
export type VisitStatus = 'planned' | 'checked_in' | 'completed' | 'cancelled'
export type VisitType = 'sales' | 'delivery' | 'collection' | 'other'
export type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled'
export type UserRole = 'admin' | 'manager' | 'rep'

export interface Client {
  id: string
  tenant_id: string
  name: string
  client_type: ClientType
  biz_no: string | null
  owner_name: string | null
  phone: string | null
  mobile: string | null
  address: string | null
  address_detail: string | null
  lat: number | null
  lng: number | null
  region: string | null
  status: ClientStatus
  notes: string | null
  last_visited_at: string | null
  created_at: string
  updated_at: string
}

export interface Visit {
  id: string
  tenant_id: string
  client_id: string
  rep_user_id: string
  status: VisitStatus
  visit_type: VisitType
  purpose: string | null
  result: string | null
  check_in_at: string | null
  check_out_at: string | null
  lat: number | null
  lng: number | null
  photos: string[]
  created_at: string
  updated_at: string
  client?: Client
  rep?: RepUser
}

export interface VisitItem {
  id: string
  visit_id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number | null
  memo: string | null
}

export interface Product {
  id: string
  tenant_id: string
  name: string
  category: string | null
  unit: string
  price: number | null
  is_active: boolean
  created_at: string
}

export interface SalesAssignment {
  id: string
  tenant_id: string
  rep_user_id: string
  client_id: string
  assigned_at: string
  assigned_by: string | null
  is_active: boolean
}

export interface RepLocation {
  rep_user_id: string
  tenant_id: string
  lat: number
  lng: number
  accuracy: number | null
  updated_at: string
  rep?: RepUser
}

export interface RepUser {
  id: string
  name: string
  email: string
  role: UserRole
  tenant_id: string
  is_active: boolean
}

export interface DashboardStats {
  totalClients: number
  activeReps: number
  todayVisits: number
  weekVisits: number
}

export interface ApiResponse<T> {
  data: T | null
  error: { code: string; message: string } | null
}
