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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_type: string
          commodity: string | null
          id: string
          message: string
          offer_id: string | null
          savings_annual_est: number | null
          sent_at: string
          sent_via: string
          user_id: string
        }
        Insert: {
          alert_type: string
          commodity?: string | null
          id?: string
          message: string
          offer_id?: string | null
          savings_annual_est?: number | null
          sent_at?: string
          sent_via?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          commodity?: string | null
          id?: string
          message?: string
          offer_id?: string | null
          savings_annual_est?: number | null
          sent_at?: string
          sent_via?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          affiliate_lead_consent: boolean
          analytics_consent: boolean
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          affiliate_lead_consent?: boolean
          analytics_consent?: boolean
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          affiliate_lead_consent?: boolean
          analytics_consent?: boolean
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      consumption_band_defaults: {
        Row: {
          annual_value: number
          band: string
          commodity: string
          id: string
        }
        Insert: {
          annual_value: number
          band: string
          commodity: string
          id?: string
        }
        Update: {
          annual_value?: number
          band?: string
          commodity?: string
          id?: string
        }
        Relationships: []
      }
      current_contract: {
        Row: {
          commodity: string
          created_at: string
          expiry_date: string
          fixed_fee_monthly: number
          id: string
          offer_name: string | null
          price_type: string
          supplier_name: string | null
          unit_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          commodity: string
          created_at?: string
          expiry_date: string
          fixed_fee_monthly?: number
          id?: string
          offer_name?: string | null
          price_type: string
          supplier_name?: string | null
          unit_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          commodity?: string
          created_at?: string
          expiry_date?: string
          fixed_fee_monthly?: number
          id?: string
          offer_name?: string | null
          price_type?: string
          supplier_name?: string | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      import_runs: {
        Row: {
          errors: Json | null
          finished_at: string | null
          id: string
          source: string
          started_at: string
          status: string
        }
        Insert: {
          errors?: Json | null
          finished_at?: string | null
          id?: string
          source?: string
          started_at?: string
          status?: string
        }
        Update: {
          errors?: Json | null
          finished_at?: string | null
          id?: string
          source?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          created_at: string
          enable_expiry_reminders: boolean
          expiry_offsets_days: number[]
          id: string
          max_better_offer_frequency_days: number
          min_savings_annual: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enable_expiry_reminders?: boolean
          expiry_offsets_days?: number[]
          id?: string
          max_better_offer_frequency_days?: number
          min_savings_annual?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enable_expiry_reminders?: boolean
          expiry_offsets_days?: number[]
          id?: string
          max_better_offer_frequency_days?: number
          min_savings_annual?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          commodity: string
          fixed_fee_monthly_est: number | null
          id: string
          imported_at: string
          offer_name: string
          price_type: string | null
          raw: Json | null
          source: string
          source_offer_id: string
          supplier_name: string
          unit_price_est: number | null
          url_offer: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          commodity: string
          fixed_fee_monthly_est?: number | null
          id?: string
          imported_at?: string
          offer_name: string
          price_type?: string | null
          raw?: Json | null
          source?: string
          source_offer_id: string
          supplier_name: string
          unit_price_est?: number | null
          url_offer?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          commodity?: string
          fixed_fee_monthly_est?: number | null
          id?: string
          imported_at?: string
          offer_name?: string
          price_type?: string | null
          raw?: Json | null
          source?: string
          source_offer_id?: string
          supplier_name?: string
          unit_price_est?: number | null
          url_offer?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      user_supply: {
        Row: {
          annual_kwh: number | null
          annual_smc: number | null
          cap: string
          commodity: string
          consumption_band: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_kwh?: number | null
          annual_smc?: number | null
          cap: string
          commodity: string
          consumption_band?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_kwh?: number | null
          annual_smc?: number | null
          cap?: string
          commodity?: string
          consumption_band?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
    Enums: {},
  },
} as const
