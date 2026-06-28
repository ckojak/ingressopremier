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
  public: {
    Tables: {
      checkin_staff: {
        Row: {
          access_code: string | null
          created_at: string
          created_by: string | null
          email: string | null
          event_id: string
          id: string
          is_active: boolean
          last_access_at: string | null
          name: string | null
          user_id: string | null
        }
        Insert: {
          access_code?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          last_access_at?: string | null
          name?: string | null
          user_id?: string | null
        }
        Update: {
          access_code?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          last_access_at?: string | null
          name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkin_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          event_id: string
          id: string
          is_active: boolean
          max_uses: number | null
          min_purchase_amount: number | null
          organizer_id: string | null
          updated_at: string
          used_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          event_id: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase_amount?: number | null
          organizer_id?: string | null
          updated_at?: string
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          event_id?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase_amount?: number | null
          organizer_id?: string | null
          updated_at?: string
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          banner_url: string | null
          category: string | null
          city: string | null
          contact: string | null
          created_at: string
          description: string | null
          end_date: string | null
          highlighted: boolean
          id: string
          image_url: string | null
          is_online: boolean
          online_url: string | null
          organizer_id: string
          short_description: string | null
          slug: string | null
          start_date: string
          state: string | null
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
          venue_address: string | null
          venue_name: string | null
          website: string | null
        }
        Insert: {
          banner_url?: string | null
          category?: string | null
          city?: string | null
          contact?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          highlighted?: boolean
          id?: string
          image_url?: string | null
          is_online?: boolean
          online_url?: string | null
          organizer_id: string
          short_description?: string | null
          slug?: string | null
          start_date: string
          state?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
          venue_address?: string | null
          venue_name?: string | null
          website?: string | null
        }
        Update: {
          banner_url?: string | null
          category?: string | null
          city?: string | null
          contact?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          highlighted?: boolean
          id?: string
          image_url?: string | null
          is_online?: boolean
          online_url?: string | null
          organizer_id?: string
          short_description?: string | null
          slug?: string | null
          start_date?: string
          state?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
          venue_address?: string | null
          venue_name?: string | null
          website?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          quantity: number
          ticket_type_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          quantity?: number
          ticket_type_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          quantity?: number
          ticket_type_id?: string
          unit_price?: number
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
            foreignKeyName: "order_items_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_cpf: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          event_id: string | null
          id: string
          mp_payment_id: string | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_method: string | null
          pix_qr_code: string | null
          pix_qr_code_base64: string | null
          service_fee: number
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          event_id?: string | null
          id?: string
          mp_payment_id?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_method?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          service_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          event_id?: string | null
          id?: string
          mp_payment_id?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_method?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          service_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ticket_transfers: {
        Row: {
          completed_at: string | null
          created_at: string
          from_user_id: string | null
          id: string
          status: string
          ticket_id: string
          to_email: string | null
          to_user_email: string | null
          to_user_id: string | null
          transfer_code: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          from_user_id?: string | null
          id?: string
          status?: string
          ticket_id: string
          to_email?: string | null
          to_user_email?: string | null
          to_user_id?: string | null
          transfer_code?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          from_user_id?: string | null
          id?: string
          status?: string
          ticket_id?: string
          to_email?: string | null
          to_user_email?: string | null
          to_user_id?: string | null
          transfer_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_transfers_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          is_active: boolean
          is_complimentary: boolean
          max_per_order: number
          name: string
          position: number
          price: number
          quantity: number
          quantity_available: number
          quantity_sold: number
          sale_end: string | null
          sale_start: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          is_complimentary?: boolean
          max_per_order?: number
          name: string
          position?: number
          price?: number
          quantity?: number
          quantity_available?: number
          quantity_sold?: number
          sale_end?: string | null
          sale_start?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          is_complimentary?: boolean
          max_per_order?: number
          name?: string
          position?: number
          price?: number
          quantity?: number
          quantity_available?: number
          quantity_sold?: number
          sale_end?: string | null
          sale_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          attendee_email: string | null
          attendee_name: string | null
          checked_in_at: string | null
          created_at: string
          event_id: string | null
          id: string
          is_complimentary: boolean
          is_used: boolean
          order_item_id: string | null
          qr_code: string | null
          recipient_email: string | null
          recipient_name: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_code: string
          ticket_type_id: string | null
          transfer_status: string
          updated_at: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          attendee_email?: string | null
          attendee_name?: string | null
          checked_in_at?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          is_complimentary?: boolean
          is_used?: boolean
          order_item_id?: string | null
          qr_code?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_code?: string
          ticket_type_id?: string | null
          transfer_status?: string
          updated_at?: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          attendee_email?: string | null
          attendee_name?: string | null
          checked_in_at?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          is_complimentary?: boolean
          is_used?: boolean
          order_item_id?: string | null
          qr_code?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_code?: string
          ticket_type_id?: string | null
          transfer_status?: string
          updated_at?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_ticket_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "producer" | "client" | "organizer"
      event_status:
        | "draft"
        | "pending"
        | "published"
        | "rejected"
        | "cancelled"
        | "completed"
      order_status: "pending" | "paid" | "failed" | "refunded" | "cancelled"
      ticket_status: "active" | "used" | "cancelled" | "transferred"
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
  public: {
    Enums: {
      app_role: ["admin", "producer", "client", "organizer"],
      event_status: [
        "draft",
        "pending",
        "published",
        "rejected",
        "cancelled",
        "completed",
      ],
      order_status: ["pending", "paid", "failed", "refunded", "cancelled"],
      ticket_status: ["active", "used", "cancelled", "transferred"],
    },
  },
} as const
