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
          phone: string
          full_name: string
          default_delivery_address: string | null
          language: 'vi' | 'en'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          phone: string
          full_name: string
          default_delivery_address?: string | null
          language?: 'vi' | 'en'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone?: string
          full_name?: string
          default_delivery_address?: string | null
          language?: 'vi' | 'en'
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name_vi: string
          name_en: string
          slug: string
          sort_order: number
          icon: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          name_vi: string
          name_en: string
          slug: string
          sort_order?: number
          icon?: string | null
          is_active?: boolean
        }
        Update: {
          name_vi?: string
          name_en?: string
          slug?: string
          sort_order?: number
          icon?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          category_id: string
          category_slug?: string
          name_vi: string
          name_en: string
          description_vi: string | null
          description_en: string | null
          price_m: number | null
          price_l: number | null
          image_url: string | null
          is_available: boolean
          is_featured: boolean
          is_new: boolean
          is_recommended: boolean
          tags: string[]
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          category_id?: string
          category_slug?: string
          name_vi: string
          name_en: string
          description_vi?: string | null
          description_en?: string | null
          price_m?: number | null
          price_l?: number | null
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_recommended?: boolean
          tags?: string[]
          sort_order?: number
          created_at?: string
        }
        Update: {
          category_id?: string
          category_slug?: string
          name_vi?: string
          name_en?: string
          description_vi?: string | null
          description_en?: string | null
          price_m?: number | null
          price_l?: number | null
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_recommended?: boolean
          tags?: string[]
          sort_order?: number
        }
        Relationships: []
      }
      addons: {
        Row: {
          id: string
          name_vi: string
          name_en: string
          price: number
          is_active: boolean
        }
        Insert: {
          id?: string
          name_vi: string
          name_en: string
          price: number
          is_active?: boolean
        }
        Update: {
          name_vi?: string
          name_en?: string
          price?: number
          is_active?: boolean
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          id: string
          code: string
          type: 'percent' | 'fixed'
          value: number
          min_order_amount: number
          max_discount: number | null
          usage_limit: number | null
          used_count: number
          expires_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          type: 'percent' | 'fixed'
          value: number
          min_order_amount?: number
          max_discount?: number | null
          usage_limit?: number | null
          used_count?: number
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          code?: string
          type?: 'percent' | 'fixed'
          value?: number
          min_order_amount?: number
          max_discount?: number | null
          usage_limit?: number | null
          used_count?: number
          expires_at?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          order_number: string
          user_id: string
          delivery_address: string
          recipient_name: string
          recipient_phone: string
          total_amount: number
          discount_amount: number
          final_amount: number
          payment_method: 'cash' | 'transfer'
          payment_status: 'pending' | 'paid' | 'failed'
          order_status: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled'
          voucher_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number?: string
          user_id: string
          delivery_address: string
          recipient_name: string
          recipient_phone: string
          total_amount: number
          discount_amount?: number
          final_amount: number
          payment_method: 'cash' | 'transfer'
          payment_status?: 'pending' | 'paid' | 'failed' | string
          order_status?: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled' | string
          voucher_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          delivery_address?: string
          recipient_name?: string
          recipient_phone?: string
          payment_status?: 'pending' | 'paid' | 'failed' | string
          order_status?: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled' | string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          product_name_vi: string
          product_name_en: string
          size: 'M' | 'L'
          quantity: number
          unit_price: number
          addon_ids: string[]
          notes: string | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          product_name_vi: string
          product_name_en: string
          size: 'M' | 'L'
          quantity: number
          unit_price: number
          addon_ids?: string[]
          notes?: string | null
        }
        Update: {
          quantity?: number
          unit_price?: number
          notes?: string | null
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          id: string
          order_id: string
          status: string
          note: string | null
          changed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          status: string
          note?: string | null
          changed_by?: string | null
        }
        Update: {
          note?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          id: string
          order_id: string
          user_id: string
          score: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          user_id: string
          score: number
          comment?: string | null
        }
        Update: {
          score?: number
          comment?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
