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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          check_in: string
          check_out: string | null
          id: string
          in_lat: number | null
          in_lng: number | null
          note: string | null
          out_lat: number | null
          out_lng: number | null
          user_id: string
        }
        Insert: {
          check_in?: string
          check_out?: string | null
          id?: string
          in_lat?: number | null
          in_lng?: number | null
          note?: string | null
          out_lat?: number | null
          out_lng?: number | null
          user_id?: string
        }
        Update: {
          check_in?: string
          check_out?: string | null
          id?: string
          in_lat?: number | null
          in_lng?: number | null
          note?: string | null
          out_lat?: number | null
          out_lng?: number | null
          user_id?: string
        }
        Relationships: []
      }
      customer_accounts: {
        Row: {
          created_at: string
          customer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          phone: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          phone: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string
        }
        Relationships: []
      }
      delivery_proofs: {
        Row: {
          created_at: string
          delivered_at: string
          driver_id: string
          lat: number
          lng: number
          order_id: string
          photo_path: string | null
          recipient_name: string
          signature_path: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string
          driver_id: string
          lat: number
          lng: number
          order_id: string
          photo_path?: string | null
          recipient_name: string
          signature_path?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string
          driver_id?: string
          lat?: number
          lng?: number
          order_id?: string
          photo_path?: string | null
          recipient_name?: string
          signature_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_proofs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          driver_id: string
          lat: number
          lng: number
          updated_at: string
        }
        Insert: {
          driver_id: string
          lat: number
          lng: number
          updated_at?: string
        }
        Update: {
          driver_id?: string
          lat?: number
          lng?: number
          updated_at?: string
        }
        Relationships: []
      }
      employee_pay: {
        Row: {
          base_salary: number
          daily_hours: number
          housing_allowance: number
          other_allowance: number
          overtime_rate: number
          shift_start: string
          transport_allowance: number
          updated_at: string
          user_id: string
          work_days: number
        }
        Insert: {
          base_salary?: number
          daily_hours?: number
          housing_allowance?: number
          other_allowance?: number
          overtime_rate?: number
          shift_start?: string
          transport_allowance?: number
          updated_at?: string
          user_id: string
          work_days?: number
        }
        Update: {
          base_salary?: number
          daily_hours?: number
          housing_allowance?: number
          other_allowance?: number
          overtime_rate?: number
          shift_start?: string
          transport_allowance?: number
          updated_at?: string
          user_id?: string
          work_days?: number
        }
        Relationships: []
      }
      invite_links: {
        Row: {
          active: boolean
          clicks: number
          code: string
          created_at: string
          created_by: string | null
          goal: string | null
          id: string
          label: string
        }
        Insert: {
          active?: boolean
          clicks?: number
          code: string
          created_at?: string
          created_by?: string | null
          goal?: string | null
          id?: string
          label: string
        }
        Update: {
          active?: boolean
          clicks?: number
          code?: string
          created_at?: string
          created_by?: string | null
          goal?: string | null
          id?: string
          label?: string
        }
        Relationships: []
      }
      invite_signups: {
        Row: {
          created_at: string
          invite_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          invite_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          invite_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_signups_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invite_links"
            referencedColumns: ["id"]
          },
        ]
      }
      leaves: {
        Row: {
          created_at: string
          end_date: string
          id: string
          kind: string
          paid: boolean
          reason: string | null
          start_date: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          kind?: string
          paid?: boolean
          reason?: string | null
          start_date: string
          status?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          kind?: string
          paid?: boolean
          reason?: string | null
          start_date?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      message_examples: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          product_name: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string
          id?: string
          product_name?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          product_name?: string | null
        }
        Relationships: []
      }
      order_events: {
        Row: {
          actor: string | null
          created_at: string
          id: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor?: string | null
          created_at?: string
          id?: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor?: string | null
          created_at?: string
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          price: number
          product_id: string
          qty: number
        }
        Insert: {
          id?: string
          order_id: string
          price?: number
          product_id: string
          qty: number
        }
        Update: {
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          created_at: string
          customer_id: string
          delivery_at: string | null
          driver_id: string | null
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          number: number
          phone: string | null
          rep_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_id: string
          delivery_at?: string | null
          driver_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          number?: never
          phone?: string | null
          rep_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_id?: string
          delivery_at?: string | null
          driver_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          number?: never
          phone?: string | null
          rep_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_adjustments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          kind: string
          month: string
          note: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          month: string
          note?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          month?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
          sku: string | null
          stock: number
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price?: number
          sku?: string | null
          stock?: number
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
          sku?: string | null
          stock?: number
          unit?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          order_id: string | null
          product_id: string
          qty: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string | null
          product_id: string
          qty: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string | null
          product_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          ai_follow_up: string | null
          ai_summary: string | null
          created_at: string
          customer_id: string
          has_order: boolean
          id: string
          lat: number | null
          lng: number | null
          note: string | null
          photo_path: string | null
          rep_id: string
        }
        Insert: {
          ai_follow_up?: string | null
          ai_summary?: string | null
          created_at?: string
          customer_id: string
          has_order?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string | null
          photo_path?: string | null
          rep_id?: string
        }
        Update: {
          ai_follow_up?: string | null
          ai_summary?: string | null
          created_at?: string
          customer_id?: string
          has_order?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string | null
          photo_path?: string | null
          rep_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_order: { Args: { _order_id: string }; Returns: boolean }
      complete_invite_signup: { Args: { _code: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      record_invite_click: { Args: { _code: string }; Returns: undefined }
      save_visit_ai_summary: {
        Args: { _follow_up: string; _summary: string; _visit_id: string }
        Returns: undefined
      }
      set_user_role: {
        Args: {
          _enabled: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      submit_customer_order: { Args: { payload: Json }; Returns: string }
      submit_delivery_proof: { Args: { payload: Json }; Returns: string }
      sync_field_record: { Args: { payload: Json }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "rep" | "warehouse" | "driver" | "customer"
      order_status:
        | "new"
        | "preparing"
        | "ready"
        | "assigned"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "rep", "warehouse", "driver", "customer"],
      order_status: [
        "new",
        "preparing",
        "ready",
        "assigned",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
