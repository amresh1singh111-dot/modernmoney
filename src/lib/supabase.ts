import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          mode: 'home' | 'student';
          display_currency: string;
          home_currency: string | null;
          current_currency: string | null;
          income_source: 'self' | 'parents' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          mode?: 'home' | 'student';
          display_currency?: string;
          home_currency?: string | null;
          current_currency?: string | null;
          income_source?: 'self' | 'parents' | null;
        };
        Update: {
          mode?: 'home' | 'student';
          display_currency?: string;
          home_currency?: string | null;
          current_currency?: string | null;
          income_source?: 'self' | 'parents' | null;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'expense' | 'income';
          icon: string | null;
          color: string | null;
          is_custom: boolean;
          created_at: string;
        };
        Insert: {
          user_id?: string;
          name: string;
          type?: 'expense' | 'income';
          icon?: string | null;
          color?: string | null;
          is_custom?: boolean;
        };
        Update: {
          name?: string;
          type?: 'expense' | 'income';
          icon?: string | null;
          color?: string | null;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: 'income' | 'expense';
          amount_original: number;
          currency_original: string;
          category_id: string | null;
          description: string | null;
          location: string | null;
          transaction_date: string;
          receipt_url: string | null;
          is_recurring: boolean;
          created_at: string;
        };
        Insert: {
          user_id?: string;
          type: 'income' | 'expense';
          amount_original: number;
          currency_original: string;
          category_id?: string | null;
          description?: string | null;
          location?: string | null;
          transaction_date?: string;
          receipt_url?: string | null;
          is_recurring?: boolean;
        };
        Update: {
          type?: 'income' | 'expense';
          amount_original?: number;
          currency_original?: string;
          category_id?: string | null;
          description?: string | null;
          location?: string | null;
          transaction_date?: string;
          receipt_url?: string | null;
          is_recurring?: boolean;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_amount: number;
          saved_amount: number;
          currency: string;
          target_date: string | null;
          icon: string | null;
          color: string | null;
          is_completed: boolean;
          created_at: string;
        };
        Insert: {
          user_id?: string;
          name: string;
          target_amount: number;
          saved_amount?: number;
          currency?: string;
          target_date?: string | null;
          icon?: string | null;
          color?: string | null;
          is_completed?: boolean;
        };
        Update: {
          name?: string;
          target_amount?: number;
          saved_amount?: number;
          currency?: string;
          target_date?: string | null;
          icon?: string | null;
          color?: string | null;
          is_completed?: boolean;
        };
      };
      goal_contributions: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string;
          amount: number;
          contribution_date: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          user_id?: string;
          goal_id: string;
          amount: number;
          contribution_date?: string;
          note?: string | null;
        };
        Update: {
          amount?: number;
          contribution_date?: string;
          note?: string | null;
        };
      };
    };
  };
};
