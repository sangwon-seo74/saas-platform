// ============================================================
// Revenue Retention OS — Supabase DB 타입
//
// 실제 운영 시 아래 명령으로 자동 생성으로 교체:
//   npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID \
//     > src/types/supabase.ts
//
// 현재 파일은 schema.sql v0.2 기반으로 수동 작성됨
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      // ── SaaS 운영 레이어 ─────────────────────────────────
      plans: {
        Row: {
          id:             string
          name:           string
          code:           'free' | 'standard' | 'pro'
          max_users:      number | null
          max_companies:  number | null
          max_messages:   number | null
          monthly_price:  number
          yearly_price:   number
          is_active:      boolean
          created_at:     string
        }
        Insert: Omit<Database['public']['Tables']['plans']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['plans']['Insert']>
      }

      tenants: {
        Row: {
          id:         string
          name:       string
          biz_no:     string | null
          is_active:  boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>
      }

      tenant_subscriptions: {
        Row: {
          id:               string
          tenant_id:        string
          plan_id:          string
          billing_cycle:    'monthly' | 'yearly'
          started_at:       string
          expires_at:       string
          next_billing_at:  string | null
          status:           'trialing' | 'active' | 'past_due' | 'cancelled'
          pg_customer_id:   string | null
          pg_sub_id:        string | null
          cancelled_at:     string | null
          cancel_reason:    string | null
          created_at:       string
          updated_at:       string
        }
        Insert: Omit<Database['public']['Tables']['tenant_subscriptions']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string; created_at?: string; updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['tenant_subscriptions']['Insert']>
      }

      tenant_invoices: {
        Row: {
          id:               string
          tenant_id:        string
          subscription_id:  string | null
          plan_id:          string | null
          invoice_no:       string | null
          billing_cycle:    'monthly' | 'yearly' | null
          period_start:     string
          period_end:       string
          amount:           number
          status:           'pending' | 'paid' | 'failed' | 'refunded'
          payment_method:   string | null
          paid_at:          string | null
          pg_payment_id:    string | null
          memo:             string | null
          processed_by:     string | null
          due_at:           string | null
          created_at:       string
        }
        Insert: Omit<Database['public']['Tables']['tenant_invoices']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['tenant_invoices']['Insert']>
      }

      // ── 인증/권한 레이어 ──────────────────────────────────
      teams: {
        Row: {
          id:         string
          tenant_id:  string
          name:       string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['teams']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['teams']['Insert']>
      }

      users: {
        Row: {
          id:            string
          tenant_id:     string
          team_id:       string | null
          email:         string
          name:          string
          phone:         string | null
          role:          'admin' | 'manager' | 'sales'
          is_active:     boolean
          last_login_at: string | null
          created_at:    string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }

      // ── 도메인 레이어 ─────────────────────────────────────
      products: {
        Row: {
          id:            string
          tenant_id:     string
          name:          string
          category:      string | null
          unit_price:    number | null
          billing_cycle: 'monthly' | 'yearly'
          description:   string | null
          is_active:     boolean
          created_at:    string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }

      companies: {
        Row: {
          id:               string
          tenant_id:        string
          assigned_user_id: string | null
          team_id:          string | null
          name:             string
          biz_no:           string | null
          industry:         string | null
          website:          string | null
          company_size:     'micro' | 'small' | 'medium' | 'large' | null
          employee_count:   number | null
          revenue_range:    string | null
          revenue_amount:   number | null
          address_road:     string | null
          address_detail:   string | null
          address_city:     string | null
          address_district: string | null
          address_zip:      string | null
          lat:              number | null
          lng:              number | null
          status:           'prospect' | 'active' | 'dormant' | 'churned'
          grade:            string | null
          renewal_risk:     'high' | 'medium' | 'low' | null
          risk_updated_at:  string | null
          memo:             string | null
          created_at:       string
          updated_at:       string
        }
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string; created_at?: string; updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
      }

      contacts: {
        Row: {
          id:                string
          tenant_id:         string
          company_id:        string
          name:              string
          title:             string | null
          department:        string | null
          phone:             string | null
          mobile:            string | null
          email:             string | null
          is_primary:        boolean
          is_decision_maker: boolean
          preferred_channel: 'call' | 'email' | 'kakao' | 'sms' | null
          memo:              string | null
          created_at:        string
        }
        Insert: Omit<Database['public']['Tables']['contacts']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>
      }

      contracts: {
        Row: {
          id:                 string
          tenant_id:          string
          company_id:         string
          product_id:         string | null
          assigned_user_id:   string | null
          contract_no:        string | null
          started_at:         string
          expires_at:         string
          amount:             number
          discount_rate:      number
          final_amount:       number | null
          is_paid:            boolean
          paid_at:            string | null
          payment_method:     string | null
          account_count:      number
          status:             'active' | 'expired' | 'cancelled' | 'renewed'
          cancel_reason:      string | null
          parent_contract_id: string | null
          renewal_count:      number
          memo:               string | null
          created_at:         string
          updated_at:         string
        }
        Insert: Omit<Database['public']['Tables']['contracts']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string; created_at?: string; updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['contracts']['Insert']>
      }

      contract_accounts: {
        Row: {
          id:          string
          tenant_id:   string
          contract_id: string
          account_id:  string | null
          issued_at:   string | null
          expires_at:  string | null
          note:        string | null
          created_at:  string
        }
        Insert: Omit<Database['public']['Tables']['contract_accounts']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['contract_accounts']['Insert']>
      }

      renewals: {
        Row: {
          id:                  string
          tenant_id:           string
          contract_id:         string
          company_id:          string
          assigned_user_id:    string | null
          status:              'pending' | 'contacted' | 'negotiating' | 'won' | 'lost'
          risk_level:          'high' | 'medium' | 'low' | null
          risk_score:          number | null
          contract_expires_at: string
          target_renewal_at:   string | null
          result:              'renewed' | 'churned' | 'upsell' | 'downgrade' | null
          result_contract_id:  string | null
          lost_reason:         string | null
          memo:                string | null
          created_at:          string
          updated_at:          string
        }
        Insert: Omit<Database['public']['Tables']['renewals']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string; created_at?: string; updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['renewals']['Insert']>
      }

      activities: {
        Row: {
          id:             string
          tenant_id:      string
          company_id:     string
          contact_id:     string | null
          user_id:        string
          contract_id:    string | null
          renewal_id:     string | null
          type:           'call' | 'visit' | 'email' | 'sms' | 'kakao'
          activity_at:    string
          call_result:    'connected' | 'no_answer' | 'rejected' | 'scheduled' | null
          call_duration:  number | null
          visit_purpose:  'demo' | 'proposal' | 'contract' | 'followup' | null
          companions:     string | null
          summary:        string | null
          next_action:    string | null
          next_action_at: string | null
          created_at:     string
        }
        Insert: Omit<Database['public']['Tables']['activities']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['activities']['Insert']>
      }

      tasks: {
        Row: {
          id:               string
          tenant_id:        string
          assigned_user_id: string
          company_id:       string | null
          contract_id:      string | null
          renewal_id:       string | null
          activity_id:      string | null
          title:            string
          description:      string | null
          type:             'call' | 'visit' | 'email' | 'renewal' | 'manual' | null
          priority:         'high' | 'medium' | 'low'
          status:           'todo' | 'in_progress' | 'done' | 'cancelled'
          due_at:           string | null
          done_at:          string | null
          is_auto:          boolean
          created_at:       string
        }
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>
      }

      messages: {
        Row: {
          id:          string
          tenant_id:   string
          company_id:  string | null
          contact_id:  string | null
          user_id:     string | null
          activity_id: string | null
          channel:     'email' | 'sms' | 'kakao'
          template_id: string | null
          recipient:   string
          content:     string | null
          status:      'sent' | 'delivered' | 'failed' | 'read'
          sent_at:     string
          read_at:     string | null
        }
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
      }

      message_templates: {
        Row: {
          id:         string
          tenant_id:  string
          name:       string
          channel:    'email' | 'sms' | 'kakao'
          category:   'renewal' | 'intro' | 'followup' | 'custom' | null
          subject:    string | null
          content:    string
          variables:  Json | null
          is_active:  boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['message_templates']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['message_templates']['Insert']>
      }

      api_integrations: {
        Row: {
          id:         string
          tenant_id:  string
          provider:   'kakao' | 'sms' | 'email' | 'naver_map'
          is_active:  boolean
          config:     Json
          tested_at:  string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['api_integrations']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string; created_at?: string; updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['api_integrations']['Insert']>
      }
    }

    Views: Record<string, never>

    Functions: {
      fn_my_tenant_id: { Args: Record<string, never>; Returns: string }
      fn_my_role:      { Args: Record<string, never>; Returns: string }
      fn_calc_renewal_risk:  { Args: { p_contract_id: string }; Returns: string }
      fn_calc_renewal_score: { Args: { p_contract_id: string }; Returns: number }
    }

    Enums: Record<string, never>
  }
}

// ── 편의 타입 축약 ────────────────────────────────────────
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
