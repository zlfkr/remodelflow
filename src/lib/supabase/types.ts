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
      project_messages: {
        Row: {
          id: string
          project_id: string
          sender_role: 'owner' | 'customer'
          sender_id: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          sender_role: 'owner' | 'customer'
          sender_id: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          sender_role?: 'owner' | 'customer'
          sender_id?: string
          message?: string
          created_at?: string
        }
      }
      project_designs: {
        Row: {
          id: string
          project_id: string
          file_url: string
          file_name: string
          file_type: string | null
          file_size: number | null
          version: number
          status: 'draft' | 'in_review' | 'approved' | 'revised'
          uploaded_by: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          file_url: string
          file_name: string
          file_type?: string | null
          file_size?: number | null
          version?: number
          status?: 'draft' | 'in_review' | 'approved' | 'revised'
          uploaded_by: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          file_url?: string
          file_name?: string
          file_type?: string | null
          file_size?: number | null
          version?: number
          status?: 'draft' | 'in_review' | 'approved' | 'revised'
          uploaded_by?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      design_approvals: {
        Row: {
          id: string
          design_id: string
          approved_by: string
          approved_at: string
          comment: string | null
        }
        Insert: {
          id?: string
          design_id: string
          approved_by: string
          approved_at?: string
          comment?: string | null
        }
        Update: {
          id?: string
          design_id?: string
          approved_by?: string
          approved_at?: string
          comment?: string | null
        }
      }
      project_activity: {
        Row: {
          id: string
          project_id: string
          type: 'design_uploaded' | 'design_approved' | 'status_changed' | 'message_sent' | 'project_created'
          description: string
          metadata: Json | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          type: 'design_uploaded' | 'design_approved' | 'status_changed' | 'message_sent' | 'project_created'
          description: string
          metadata?: Json | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          type?: 'design_uploaded' | 'design_approved' | 'status_changed' | 'message_sent' | 'project_created'
          description?: string
          metadata?: Json | null
          created_by?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          project_id: string
          type: 'new_message' | 'design_uploaded' | 'design_approved'
          title: string
          message: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          type: 'new_message' | 'design_uploaded' | 'design_approved'
          title: string
          message: string
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          type?: 'new_message' | 'design_uploaded' | 'design_approved'
          title?: string
          message?: string
          read_at?: string | null
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
