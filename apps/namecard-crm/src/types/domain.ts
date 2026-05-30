// namecard-crm 도메인 타입

export interface Company {
  id: string
  tenant_id: string
  name: string
  address: string | null
  website: string | null
  main_phone: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  tenant_id: string
  company_id: string | null
  name: string
  department: string | null
  title: string | null
  mobile: string | null
  fax: string | null
  email: string | null
  is_vip: boolean
  last_contacted_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  company?: Pick<Company, 'id' | 'name' | 'address' | 'website' | 'main_phone'>
  tags?: Tag[]
}

export interface BusinessCard {
  id: string
  tenant_id: string
  contact_id: string | null
  front_image_url: string | null
  back_image_url: string | null
  thumbnail_url: string | null
  recognized_data: RecognizedCardData | null
  recognition_status: 'pending' | 'completed' | 'failed'
  created_at: string
}

export interface RecognizedCardData {
  company_name: string | null
  contact_name: string | null
  title: string | null
  department: string | null
  phone: string | null
  mobile: string | null
  fax: string | null
  email: string | null
  website: string | null
  address: string | null
  biz_no: string | null
}

export type ActivityType = 'memo' | 'call' | 'visit' | 'consultation'

export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  memo:         '메모',
  call:         '전화',
  visit:        '방문',
  consultation: '상담',
}

export interface ActivityAttachment {
  url: string
  name: string
  size: number
}

export interface Activity {
  id: string
  tenant_id: string
  contact_id: string
  type: ActivityType
  content: string | null
  attachments: ActivityAttachment[]
  created_by: string | null
  created_at: string
  updated_at: string
  creator?: { name: string }
}

export interface Tag {
  id: string
  tenant_id: string
  name: string
  color: string
}

export interface DashboardStats {
  total_contacts: number
  vip_contacts: number
  no_contact_30: number
  no_contact_60: number
  recent_contacts: ContactSummary[]
  recent_activities: ActivitySummary[]
}

export interface ContactSummary {
  id: string
  name: string
  title: string | null
  company_name: string | null
  created_at: string
}

export interface ActivitySummary {
  id: string
  type: ActivityType
  content: string | null
  contact_name: string
  created_at: string
}
