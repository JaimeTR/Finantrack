// ============================================
// SUPABASE TYPES - AUTO-GENERATED FROM DATABASE
// ============================================
// Estos tipos se pueden generar automáticamente con:
// npx supabase gen types typescript --project-id "tu-proyecto" > src/lib/supabase/types.ts
// ============================================

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
      users: {
        Row: {
          id: string
          email: string
          name: string
          photo_url: string | null
          photo_path: string | null
          account_type: 'Free' | 'Premium' | 'Student'
          role: 'user' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          photo_url?: string | null
          photo_path?: string | null
          account_type?: 'Free' | 'Premium' | 'Student'
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          photo_url?: string | null
          photo_path?: string | null
          account_type?: 'Free' | 'Premium' | 'Student'
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          description: string
          amount: number
          type: 'income' | 'expense'
          category: string
          date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          description: string
          amount: number
          type: 'income' | 'expense'
          category: string
          date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          description?: string
          amount?: number
          type?: 'income' | 'expense'
          category?: string
          date?: string
          created_at?: string
          updated_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category: string
          amount: number
          spent: number
          period: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: string
          amount: number
          spent?: number
          period: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          amount?: number
          spent?: number
          period?: string
          created_at?: string
          updated_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          target_amount: number
          current_amount: number
          target_date: string | null
          status: 'active' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          target_amount: number
          current_amount?: number
          target_date?: string | null
          status?: 'active' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          target_amount?: number
          current_amount?: number
          target_date?: string | null
          status?: 'active' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      goal_contributions: {
        Row: {
          id: string
          goal_id: string
          user_id: string
          amount: number
          notes: string | null
          contributed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          user_id: string
          amount: number
          notes?: string | null
          contributed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          goal_id?: string
          user_id?: string
          amount?: number
          notes?: string | null
          contributed_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      recent_transactions_view: {
        Row: {
          id: string | null
          user_id: string | null
          user_name: string | null
          user_email: string | null
          description: string | null
          amount: number | null
          type: string | null
          category: string | null
          date: string | null
          created_at: string | null
        }
      }
      goals_progress_view: {
        Row: {
          id: string | null
          user_id: string | null
          user_name: string | null
          goal_name: string | null
          target_amount: number | null
          current_amount: number | null
          progress_percentage: number | null
          target_date: string | null
          status: string | null
          contribution_count: number | null
          created_at: string | null
        }
      }
    }
    Functions: {
      get_financial_summary: {
        Args: {
          p_user_id: string
          p_period: string
        }
        Returns: {
          total_income: number
          total_expenses: number
          balance: number
          transaction_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// ============================================
// HELPER TYPES
// ============================================

export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

export type Budget = Database['public']['Tables']['budgets']['Row']
export type BudgetInsert = Database['public']['Tables']['budgets']['Insert']
export type BudgetUpdate = Database['public']['Tables']['budgets']['Update']

export type Goal = Database['public']['Tables']['goals']['Row']
export type GoalInsert = Database['public']['Tables']['goals']['Insert']
export type GoalUpdate = Database['public']['Tables']['goals']['Update']

export type GoalContribution = Database['public']['Tables']['goal_contributions']['Row']
export type GoalContributionInsert = Database['public']['Tables']['goal_contributions']['Insert']
export type GoalContributionUpdate = Database['public']['Tables']['goal_contributions']['Update']

// Tipos para las vistas
export type RecentTransactionView = Database['public']['Views']['recent_transactions_view']['Row']
export type GoalProgressView = Database['public']['Views']['goals_progress_view']['Row']

// Tipo para el resumen financiero
export type FinancialSummary = Database['public']['Functions']['get_financial_summary']['Returns'][0]
