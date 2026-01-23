export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'owner' | 'customer'
          full_name: string | null
          phone: string | null
          created_at: string
        }
        Insert: {
          id: string
          role?: 'owner' | 'customer'
          full_name?: string | null
          phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'owner' | 'customer'
          full_name?: string | null
          phone?: string | null
          created_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          owner_id: string
          email: string
          full_name: string | null
          phone: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          email: string
          full_name?: string | null
          phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          owner_id: string
          customer_id: string
          name: string
          status: 'draft' | 'in_progress' | 'review' | 'approved' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          customer_id: string
          name: string
          status?: 'draft' | 'in_progress' | 'review' | 'approved' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          customer_id?: string
          name?: string
          status?: 'draft' | 'in_progress' | 'review' | 'approved' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      project_invites: {
        Row: {
          id: string
          project_id: string
          token: string
          email: string
          expires_at: string
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          token: string
          email: string
          expires_at: string
          used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          token?: string
          email?: string
          expires_at?: string
          used_at?: string | null
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
      user_role: 'owner' | 'customer'
      project_status: 'draft' | 'in_progress' | 'review' | 'approved' | 'completed'
    }
  }
}
