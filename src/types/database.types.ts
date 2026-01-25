export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          whatsapp_number: string | null
          country: string | null
          city: string | null
          avatar_url: string | null
          role: 'parent' | 'child'
          family_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          whatsapp_number?: string | null
          country?: string | null
          city?: string | null
          avatar_url?: string | null
          role?: 'parent' | 'child'
          family_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          whatsapp_number?: string | null
          country?: string | null
          city?: string | null
          avatar_url?: string | null
          role?: 'parent' | 'child'
          family_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      families: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          name: string
          max_children: number
          price_monthly: number
          price_yearly: number
          stripe_price_id_monthly: string
          stripe_price_id_yearly: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          max_children: number
          price_monthly: number
          price_yearly: number
          stripe_price_id_monthly: string
          stripe_price_id_yearly: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          max_children?: number
          price_monthly?: number
          price_yearly?: number
          stripe_price_id_monthly?: string
          stripe_price_id_yearly?: string
          created_at?: string
        }
      }
      memberships: {
        Row: {
          id: string
          family_id: string
          plan_id: string
          status: 'active' | 'past_due' | 'canceled' | 'expired'
          billing_cycle: 'monthly' | 'yearly'
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          plan_id: string
          status?: 'active' | 'past_due' | 'canceled' | 'expired'
          billing_cycle: 'monthly' | 'yearly'
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          plan_id?: string
          status?: 'active' | 'past_due' | 'canceled' | 'expired'
          billing_cycle?: 'monthly' | 'yearly'
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      family_codes: {
        Row: {
          id: string
          code: string
          code_type: 'parent' | 'child'
          family_id: string
          profile_id: string | null
          status: 'active' | 'suspended' | 'revoked'
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          code_type: 'parent' | 'child'
          family_id: string
          profile_id?: string | null
          status?: 'active' | 'suspended' | 'revoked'
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          code_type?: 'parent' | 'child'
          family_id?: string
          profile_id?: string | null
          status?: 'active' | 'suspended' | 'revoked'
          created_at?: string
        }
      }
      children: {
        Row: {
          id: string
          family_id: string
          first_name: string
          last_name: string
          birth_date: string
          city: string
          country: string
          family_code_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          first_name: string
          last_name: string
          birth_date: string
          city: string
          country: string
          family_code_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          first_name?: string
          last_name?: string
          birth_date?: string
          city?: string
          country?: string
          family_code_id?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          profile_id: string
          type: string
          title: string
          message: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          type: string
          title: string
          message: string
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          type?: string
          title?: string
          message?: string
          read_at?: string | null
          created_at?: string
        }
      }
      login_sessions: {
        Row: {
          id: string
          profile_id: string
          browser_name: string | null
          browser_version: string | null
          os_name: string | null
          os_version: string | null
          device_type: 'desktop' | 'mobile' | 'tablet' | null
          city: string | null
          country: string | null
          latitude: number | null
          longitude: number | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          browser_name?: string | null
          browser_version?: string | null
          os_name?: string | null
          os_version?: string | null
          device_type?: 'desktop' | 'mobile' | 'tablet' | null
          city?: string | null
          country?: string | null
          latitude?: number | null
          longitude?: number | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          browser_name?: string | null
          browser_version?: string | null
          os_name?: string | null
          os_version?: string | null
          device_type?: 'desktop' | 'mobile' | 'tablet' | null
          city?: string | null
          country?: string | null
          latitude?: number | null
          longitude?: number | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Commonly used types
export type Profile = Tables<'profiles'>
export type Family = Tables<'families'>
export type Plan = Tables<'plans'>
export type Membership = Tables<'memberships'>
export type FamilyCode = Tables<'family_codes'>
export type Child = Tables<'children'>
export type Notification = Tables<'notifications'>
export type LoginSession = Tables<'login_sessions'>
