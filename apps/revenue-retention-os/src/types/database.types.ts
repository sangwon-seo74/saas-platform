export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_at: string
          call_duration: number | null
          call_result: string | null
          companions: string | null
          company_id: string
          contact_id: string | null
          contract_id: string | null
          created_at: string
          id: string
          next_action: string | null
          next_action_at: string | null
          renewal_id: string | null
          summary: string | null
          tenant_id: string
          type: string
          user_id: string
          visit_purpose: string | null
        }
        Insert: {
          activity_at?: string
          call_duration?: number | null
          call_result?: string | null
          companions?: string | null
          company_id: string
          contact_id?: string | null
          contract_id?: string | null
          created_at?: string
          id?: string
          next_action?: string | null
          next_action_at?: string | null
          renewal_id?: string | null
          summary?: string | null
          tenant_id: string
          type: string
          user_id: string
          visit_purpose?: string | null
        }
        Update: {
          activity_at?: string
          call_duration?: number | null
          call_result?: string | null
          companions?: string | null
          company_id?: string
          contact_id?: string | null
          contract_id?: string | null
          created_at?: string
          id?: string
          next_action?: string | null
          next_action_at?: string | null
          renewal_id?: string | null
          summary?: string | null
          tenant_id?: string
          type?: string
          user_id?: string
          visit_purpose?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_renewal_id_fkey"
            columns: ["renewal_id"]
            isOneToOne: false
            referencedRelation: "renewals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          provider: string
          tenant_id: string
          tested_at: string | null
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          provider: string
          tenant_id: string
          tested_at?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          provider?: string
          tenant_id?: string
          tested_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_city: string | null
          address_detail: string | null
          address_district: string | null
          address_road: string | null
          address_zip: string | null
          assigned_user_id: string | null
          biz_no: string | null
          company_size: string | null
          created_at: string
          employee_count: number | null
          grade: string | null
          id: string
          industry: string | null
          lat: number | null
          lng: number | null
          memo: string | null
          name: string
          renewal_risk: string | null
          revenue_amount: number | null
          revenue_range: string | null
          risk_updated_at: string | null
          status: string
          team_id: string | null
          tenant_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address_city?: string | null
          address_detail?: string | null
          address_district?: string | null
          address_road?: string | null
          address_zip?: string | null
          assigned_user_id?: string | null
          biz_no?: string | null
          company_size?: string | null
          created_at?: string
          employee_count?: number | null
          grade?: string | null
          id?: string
          industry?: string | null
          lat?: number | null
          lng?: number | null
          memo?: string | null
          name: string
          renewal_risk?: string | null
          revenue_amount?: number | null
          revenue_range?: string | null
          risk_updated_at?: string | null
          status?: string
          team_id?: string | null
          tenant_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_city?: string | null
          address_detail?: string | null
          address_district?: string | null
          address_road?: string | null
          address_zip?: string | null
          assigned_user_id?: string | null
          biz_no?: string | null
          company_size?: string | null
          created_at?: string
          employee_count?: number | null
          grade?: string | null
          id?: string
          industry?: string | null
          lat?: number | null
          lng?: number | null
          memo?: string | null
          name?: string
          renewal_risk?: string | null
          revenue_amount?: number | null
          revenue_range?: string | null
          risk_updated_at?: string | null
          status?: string
          team_id?: string | null
          tenant_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_id: string
          created_at: string
          department: string | null
          email: string | null
          id: string
          is_decision_maker: boolean
          is_primary: boolean
          memo: string | null
          mobile: string | null
          name: string
          phone: string | null
          preferred_channel: string | null
          tenant_id: string
          title: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          is_decision_maker?: boolean
          is_primary?: boolean
          memo?: string | null
          mobile?: string | null
          name: string
          phone?: string | null
          preferred_channel?: string | null
          tenant_id: string
          title?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          is_decision_maker?: boolean
          is_primary?: boolean
          memo?: string | null
          mobile?: string | null
          name?: string
          phone?: string | null
          preferred_channel?: string | null
          tenant_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_accounts: {
        Row: {
          account_id: string | null
          contract_id: string
          created_at: string
          expires_at: string | null
          id: string
          issued_at: string | null
          note: string | null
          tenant_id: string
        }
        Insert: {
          account_id?: string | null
          contract_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          note?: string | null
          tenant_id: string
        }
        Update: {
          account_id?: string | null
          contract_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          note?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_accounts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          account_count: number
          amount: number
          assigned_user_id: string | null
          cancel_reason: string | null
          company_id: string
          contract_no: string | null
          created_at: string
          discount_rate: number
          expires_at: string
          final_amount: number | null
          id: string
          is_paid: boolean
          memo: string | null
          paid_at: string | null
          parent_contract_id: string | null
          payment_method: string | null
          product_id: string | null
          renewal_count: number
          started_at: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_count?: number
          amount: number
          assigned_user_id?: string | null
          cancel_reason?: string | null
          company_id: string
          contract_no?: string | null
          created_at?: string
          discount_rate?: number
          expires_at: string
          final_amount?: number | null
          id?: string
          is_paid?: boolean
          memo?: string | null
          paid_at?: string | null
          parent_contract_id?: string | null
          payment_method?: string | null
          product_id?: string | null
          renewal_count?: number
          started_at: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_count?: number
          amount?: number
          assigned_user_id?: string | null
          cancel_reason?: string | null
          company_id?: string
          contract_no?: string | null
          created_at?: string
          discount_rate?: number
          expires_at?: string
          final_amount?: number | null
          id?: string
          is_paid?: boolean
          memo?: string | null
          paid_at?: string | null
          parent_contract_id?: string | null
          payment_method?: string | null
          product_id?: string | null
          renewal_count?: number
          started_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          category: string | null
          channel: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          subject: string | null
          tenant_id: string
          variables: Json | null
        }
        Insert: {
          category?: string | null
          channel: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          subject?: string | null
          tenant_id: string
          variables?: Json | null
        }
        Update: {
          category?: string | null
          channel?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string | null
          tenant_id?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          activity_id: string | null
          channel: string
          company_id: string | null
          contact_id: string | null
          content: string | null
          id: string
          read_at: string | null
          recipient: string
          sent_at: string
          status: string
          template_id: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          activity_id?: string | null
          channel: string
          company_id?: string | null
          contact_id?: string | null
          content?: string | null
          id?: string
          read_at?: string | null
          recipient: string
          sent_at?: string
          status?: string
          template_id?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          activity_id?: string | null
          channel?: string
          company_id?: string | null
          contact_id?: string | null
          content?: string | null
          id?: string
          read_at?: string | null
          recipient?: string
          sent_at?: string
          status?: string
          template_id?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          max_companies: number | null
          max_messages: number | null
          max_users: number | null
          monthly_price: number
          name: string
          yearly_price: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_companies?: number | null
          max_messages?: number | null
          max_users?: number | null
          monthly_price?: number
          name: string
          yearly_price?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_companies?: number | null
          max_messages?: number | null
          max_users?: number | null
          monthly_price?: number
          name?: string
          yearly_price?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          billing_cycle: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          unit_price: number | null
        }
        Insert: {
          billing_cycle?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          unit_price?: number | null
        }
        Update: {
          billing_cycle?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      renewals: {
        Row: {
          assigned_user_id: string | null
          company_id: string
          contract_expires_at: string
          contract_id: string
          created_at: string
          id: string
          lost_reason: string | null
          memo: string | null
          result: string | null
          result_contract_id: string | null
          risk_level: string | null
          risk_score: number | null
          status: string
          target_renewal_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          company_id: string
          contract_expires_at: string
          contract_id: string
          created_at?: string
          id?: string
          lost_reason?: string | null
          memo?: string | null
          result?: string | null
          result_contract_id?: string | null
          risk_level?: string | null
          risk_score?: number | null
          status?: string
          target_renewal_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          company_id?: string
          contract_expires_at?: string
          contract_id?: string
          created_at?: string
          id?: string
          lost_reason?: string | null
          memo?: string | null
          result?: string | null
          result_contract_id?: string | null
          risk_level?: string | null
          risk_score?: number | null
          status?: string
          target_renewal_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewals_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewals_result_contract_id_fkey"
            columns: ["result_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          activity_id: string | null
          assigned_user_id: string
          company_id: string | null
          contract_id: string | null
          created_at: string
          description: string | null
          done_at: string | null
          due_at: string | null
          id: string
          is_auto: boolean
          priority: string
          renewal_id: string | null
          status: string
          tenant_id: string
          title: string
          type: string | null
        }
        Insert: {
          activity_id?: string | null
          assigned_user_id: string
          company_id?: string | null
          contract_id?: string | null
          created_at?: string
          description?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          is_auto?: boolean
          priority?: string
          renewal_id?: string | null
          status?: string
          tenant_id: string
          title: string
          type?: string | null
        }
        Update: {
          activity_id?: string | null
          assigned_user_id?: string
          company_id?: string | null
          contract_id?: string | null
          created_at?: string
          description?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          is_auto?: boolean
          priority?: string
          renewal_id?: string | null
          status?: string
          tenant_id?: string
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_renewal_id_fkey"
            columns: ["renewal_id"]
            isOneToOne: false
            referencedRelation: "renewals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invoices: {
        Row: {
          amount: number
          billing_cycle: string | null
          created_at: string
          due_at: string | null
          id: string
          invoice_no: string | null
          memo: string | null
          paid_at: string | null
          payment_method: string | null
          period_end: string
          period_start: string
          pg_payment_id: string | null
          plan_id: string | null
          processed_by: string | null
          status: string
          subscription_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          billing_cycle?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          invoice_no?: string | null
          memo?: string | null
          paid_at?: string | null
          payment_method?: string | null
          period_end: string
          period_start: string
          pg_payment_id?: string | null
          plan_id?: string | null
          processed_by?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          billing_cycle?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          invoice_no?: string | null
          memo?: string | null
          paid_at?: string | null
          payment_method?: string | null
          period_end?: string
          period_start?: string
          pg_payment_id?: string | null
          plan_id?: string | null
          processed_by?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          billing_cycle: string
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          expires_at: string
          id: string
          next_billing_at: string | null
          pg_customer_id: string | null
          pg_sub_id: string | null
          plan_id: string
          started_at: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          billing_cycle: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          next_billing_at?: string | null
          pg_customer_id?: string | null
          pg_sub_id?: string | null
          plan_id: string
          started_at: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          next_billing_at?: string | null
          pg_customer_id?: string | null
          pg_sub_id?: string | null
          plan_id?: string
          started_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          biz_no: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          biz_no?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          biz_no?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_login_at: string | null
          name: string
          phone: string | null
          role: string
          team_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name: string
          phone?: string | null
          role?: string
          team_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name?: string
          phone?: string | null
          role?: string
          team_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_calc_renewal_risk: { Args: { p_contract_id: string }; Returns: string }
      fn_calc_renewal_score: {
        Args: { p_contract_id: string }
        Returns: number
      }
      fn_my_role: { Args: never; Returns: string }
      fn_my_tenant_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
