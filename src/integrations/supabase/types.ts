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
      allocations: {
        Row: {
          allocated_hours: number
          created_at: string
          id: string
          person_id: string | null
          project_scope_id: string | null
        }
        Insert: {
          allocated_hours: number
          created_at?: string
          id?: string
          person_id?: string | null
          project_scope_id?: string | null
        }
        Update: {
          allocated_hours?: number
          created_at?: string
          id?: string
          person_id?: string | null
          project_scope_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allocations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_project_scope_id_fkey"
            columns: ["project_scope_id"]
            isOneToOne: false
            referencedRelation: "project_scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      billability_rule_conditions: {
        Row: {
          created_at: string
          field: string
          id: string
          logic_operator: string
          operator: string
          rule_id: string
          value: string
        }
        Insert: {
          created_at?: string
          field: string
          id?: string
          logic_operator?: string
          operator?: string
          rule_id: string
          value?: string
        }
        Update: {
          created_at?: string
          field?: string
          id?: string
          logic_operator?: string
          operator?: string
          rule_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "billability_rule_conditions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "billability_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      billability_rules: {
        Row: {
          created_at: string
          id: string
          is_billable: boolean
          logic_operator: string
          name: string
          priority: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_billable?: boolean
          logic_operator?: string
          name?: string
          priority?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_billable?: boolean
          logic_operator?: string
          name?: string
          priority?: number
        }
        Relationships: []
      }
      client_team_allocations: {
        Row: {
          client_name: string
          created_at: string
          id: string
          person_id: string
          priority: number
          role_id: string
        }
        Insert: {
          client_name: string
          created_at?: string
          id?: string
          person_id: string
          priority?: number
          role_id: string
        }
        Update: {
          client_name?: string
          created_at?: string
          id?: string
          person_id?: string
          priority?: number
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_team_allocations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_team_allocations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_allocations: {
        Row: {
          allocation_id: string
          created_at: string
          date: string
          hours: number
          id: string
        }
        Insert: {
          allocation_id: string
          created_at?: string
          date: string
          hours: number
          id?: string
        }
        Update: {
          allocation_id?: string
          created_at?: string
          date?: string
          hours?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_allocations_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "allocations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_imports: {
        Row: {
          dataset: string
          id: string
          last_imported_at: string
          row_count: number
        }
        Insert: {
          dataset: string
          id?: string
          last_imported_at?: string
          row_count?: number
        }
        Update: {
          dataset?: string
          id?: string
          last_imported_at?: string
          row_count?: number
        }
        Relationships: []
      }
      people: {
        Row: {
          annual_salary: number | null
          code: string | null
          created_at: string
          employment_end_date: string | null
          employment_start_date: string | null
          id: string
          imc_percentage: number | null
          monthly_salary: number | null
          name: string
          office: string
          overall_end_date: string | null
          overall_start_date: string | null
          role_id: string | null
          status: string | null
          team: string | null
          type: string | null
          uk_percentage: number | null
          us_percentage: number | null
        }
        Insert: {
          annual_salary?: number | null
          code?: string | null
          created_at?: string
          employment_end_date?: string | null
          employment_start_date?: string | null
          id?: string
          imc_percentage?: number | null
          monthly_salary?: number | null
          name: string
          office?: string
          overall_end_date?: string | null
          overall_start_date?: string | null
          role_id?: string | null
          status?: string | null
          team?: string | null
          type?: string | null
          uk_percentage?: number | null
          us_percentage?: number | null
        }
        Update: {
          annual_salary?: number | null
          code?: string | null
          created_at?: string
          employment_end_date?: string | null
          employment_start_date?: string | null
          id?: string
          imc_percentage?: number | null
          monthly_salary?: number | null
          name?: string
          office?: string
          overall_end_date?: string | null
          overall_start_date?: string | null
          role_id?: string | null
          status?: string | null
          team?: string | null
          type?: string | null
          uk_percentage?: number | null
          us_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "people_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      phase_allocations: {
        Row: {
          allocation_id: string | null
          created_at: string
          hours: number
          id: string
          phase_id: string
          project_scope_id: string | null
        }
        Insert: {
          allocation_id?: string | null
          created_at?: string
          hours?: number
          id?: string
          phase_id: string
          project_scope_id?: string | null
        }
        Update: {
          allocation_id?: string | null
          created_at?: string
          hours?: number
          id?: string
          phase_id?: string
          project_scope_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phase_allocations_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase_allocations_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase_allocations_project_scope_id_fkey"
            columns: ["project_scope_id"]
            isOneToOne: false
            referencedRelation: "project_scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      project_monthly_revenue: {
        Row: {
          created_at: string
          id: string
          month_date: string
          project_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          month_date: string
          project_id: string
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          month_date?: string
          project_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_monthly_revenue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phases: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          phase_name: string
          project_id: string
          sort_order: number
          start_date: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          phase_name: string
          project_id: string
          sort_order: number
          start_date?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          phase_name?: string
          project_id?: string
          sort_order?: number
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_scopes: {
        Row: {
          created_at: string
          id: string
          phase_percentages: Json | null
          project_id: string | null
          role_id: string | null
          scoped_hours: number
        }
        Insert: {
          created_at?: string
          id?: string
          phase_percentages?: Json | null
          project_id?: string | null
          role_id?: string | null
          scoped_hours: number
        }
        Update: {
          created_at?: string
          id?: string
          phase_percentages?: Json | null
          project_id?: string | null
          role_id?: string | null
          scoped_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_scopes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_scopes_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_cost: number | null
          bdb_hours: number | null
          budget_cost: number | null
          close_date: string | null
          contracted_infl_cost: number | null
          created_at: string
          created_date: string | null
          deal_value_derisked: number | null
          duration_weeks: number | null
          duration_weeks_rounded: number | null
          end_date: string
          end_week: string | null
          extra_data: Json | null
          fee_calc_currency: string | null
          fx_lock_date: string | null
          fx_rate_gbp: number | null
          fx_rate_usd: number | null
          gp_check: string | null
          gp_full_value: number | null
          gp_full_value_per_day: number | null
          gp_margin_pct: number | null
          gross_budget: number | null
          hard_costs: number | null
          hub: string | null
          id: string
          industry: string | null
          infl_production_costs: number | null
          last_fee_calc_url: string | null
          lead_source: string | null
          media_cost: number | null
          new_repeat: string | null
          office: string | null
          opportunity_number: string | null
          opportunity_owner: string | null
          opportunity_record_type: string | null
          original_lead_source: string | null
          paid_media_fees: number | null
          parent_account: string | null
          phase1_end: string | null
          phase1_name: string | null
          phase1_start: string | null
          phase2_end: string | null
          phase2_name: string | null
          phase2_start: string | null
          phase3_end: string | null
          phase3_name: string | null
          phase3_start: string | null
          phase4_end: string | null
          phase4_name: string | null
          phase4_start: string | null
          price: number | null
          probability: number | null
          rate_card_discount: number
          rate_card_id: string | null
          revenue: number | null
          sf_account: string | null
          stage: string | null
          start_date: string
          start_week: string | null
          title: string
          total_fees: number | null
          ultimate_parent: string | null
          updated_at: string
          value_per_week_phase1: number | null
          value_per_week_phase2: number | null
          value_per_week_phase3: number | null
          value_per_week_phase4: number | null
        }
        Insert: {
          actual_cost?: number | null
          bdb_hours?: number | null
          budget_cost?: number | null
          close_date?: string | null
          contracted_infl_cost?: number | null
          created_at?: string
          created_date?: string | null
          deal_value_derisked?: number | null
          duration_weeks?: number | null
          duration_weeks_rounded?: number | null
          end_date: string
          end_week?: string | null
          extra_data?: Json | null
          fee_calc_currency?: string | null
          fx_lock_date?: string | null
          fx_rate_gbp?: number | null
          fx_rate_usd?: number | null
          gp_check?: string | null
          gp_full_value?: number | null
          gp_full_value_per_day?: number | null
          gp_margin_pct?: number | null
          gross_budget?: number | null
          hard_costs?: number | null
          hub?: string | null
          id?: string
          industry?: string | null
          infl_production_costs?: number | null
          last_fee_calc_url?: string | null
          lead_source?: string | null
          media_cost?: number | null
          new_repeat?: string | null
          office?: string | null
          opportunity_number?: string | null
          opportunity_owner?: string | null
          opportunity_record_type?: string | null
          original_lead_source?: string | null
          paid_media_fees?: number | null
          parent_account?: string | null
          phase1_end?: string | null
          phase1_name?: string | null
          phase1_start?: string | null
          phase2_end?: string | null
          phase2_name?: string | null
          phase2_start?: string | null
          phase3_end?: string | null
          phase3_name?: string | null
          phase3_start?: string | null
          phase4_end?: string | null
          phase4_name?: string | null
          phase4_start?: string | null
          price?: number | null
          probability?: number | null
          rate_card_discount?: number
          rate_card_id?: string | null
          revenue?: number | null
          sf_account?: string | null
          stage?: string | null
          start_date: string
          start_week?: string | null
          title: string
          total_fees?: number | null
          ultimate_parent?: string | null
          updated_at?: string
          value_per_week_phase1?: number | null
          value_per_week_phase2?: number | null
          value_per_week_phase3?: number | null
          value_per_week_phase4?: number | null
        }
        Update: {
          actual_cost?: number | null
          bdb_hours?: number | null
          budget_cost?: number | null
          close_date?: string | null
          contracted_infl_cost?: number | null
          created_at?: string
          created_date?: string | null
          deal_value_derisked?: number | null
          duration_weeks?: number | null
          duration_weeks_rounded?: number | null
          end_date?: string
          end_week?: string | null
          extra_data?: Json | null
          fee_calc_currency?: string | null
          fx_lock_date?: string | null
          fx_rate_gbp?: number | null
          fx_rate_usd?: number | null
          gp_check?: string | null
          gp_full_value?: number | null
          gp_full_value_per_day?: number | null
          gp_margin_pct?: number | null
          gross_budget?: number | null
          hard_costs?: number | null
          hub?: string | null
          id?: string
          industry?: string | null
          infl_production_costs?: number | null
          last_fee_calc_url?: string | null
          lead_source?: string | null
          media_cost?: number | null
          new_repeat?: string | null
          office?: string | null
          opportunity_number?: string | null
          opportunity_owner?: string | null
          opportunity_record_type?: string | null
          original_lead_source?: string | null
          paid_media_fees?: number | null
          parent_account?: string | null
          phase1_end?: string | null
          phase1_name?: string | null
          phase1_start?: string | null
          phase2_end?: string | null
          phase2_name?: string | null
          phase2_start?: string | null
          phase3_end?: string | null
          phase3_name?: string | null
          phase3_start?: string | null
          phase4_end?: string | null
          phase4_name?: string | null
          phase4_start?: string | null
          price?: number | null
          probability?: number | null
          rate_card_discount?: number
          rate_card_id?: string | null
          revenue?: number | null
          sf_account?: string | null
          stage?: string | null
          start_date?: string
          start_week?: string | null
          title?: string
          total_fees?: number | null
          ultimate_parent?: string | null
          updated_at?: string
          value_per_week_phase1?: number | null
          value_per_week_phase2?: number | null
          value_per_week_phase3?: number | null
          value_per_week_phase4?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_cards: {
        Row: {
          created_at: string
          currency: string
          hourly_rate: number
          id: string
          name: string
          role_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          hourly_rate: number
          id?: string
          name: string
          role_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          hourly_rate?: number
          id?: string
          name?: string
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_cards_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          billable_capacity_hours: number
          created_at: string
          id: string
          name: string
        }
        Insert: {
          billable_capacity_hours?: number
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          billable_capacity_hours?: number
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          created_at: string
          date: string
          hours: number
          id: string
          notes: string | null
          person_id: string | null
          person_name: string | null
          project_code: string | null
          project_id: string | null
          project_name: string | null
        }
        Insert: {
          created_at?: string
          date: string
          hours: number
          id?: string
          notes?: string | null
          person_id?: string | null
          person_name?: string | null
          project_code?: string | null
          project_id?: string | null
          project_name?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          hours?: number
          id?: string
          notes?: string | null
          person_id?: string | null
          person_name?: string | null
          project_code?: string | null
          project_id?: string | null
          project_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_time_entries_for_import: {
        Args: { _from_date?: string }
        Returns: number
      }
      get_person_hours_in_range: {
        Args: { _end_date: string; _person_ids: string[]; _start_date: string }
        Returns: {
          last_entry_date: string
          person_id: string
          total_hours: number
        }[]
      }
      get_project_costs: {
        Args: never
        Returns: {
          cost_gbp_staff: number
          cost_usd_staff: number
          project_id: string
          total_hours: number
        }[]
      }
      get_project_costs_by_role: {
        Args: never
        Returns: {
          cost_gbp_staff: number
          cost_usd_staff: number
          project_id: string
          role_id: string
          total_hours: number
        }[]
      }
      get_project_costs_monthly: {
        Args: { _end_date: string; _start_date: string }
        Returns: {
          cost_gbp_staff: number
          cost_usd_staff: number
          month_date: string
          project_id: string
          total_hours: number
        }[]
      }
      get_project_hours: {
        Args: never
        Returns: {
          project_id: string
          total_hours: number
        }[]
      }
      get_project_hours_by_role: {
        Args: never
        Returns: {
          project_id: string
          role_id: string
          total_hours: number
        }[]
      }
      get_project_people: {
        Args: never
        Returns: {
          person_id: string
          project_id: string
        }[]
      }
      get_project_person_hours: {
        Args: never
        Returns: {
          person_id: string
          project_id: string
          total_hours: number
        }[]
      }
      get_role_hours_for_projects: {
        Args: { _cutoff_date: string; _project_ids: string[] }
        Returns: {
          role_name: string
          total_hours: number
        }[]
      }
      get_utilisation_summary: {
        Args: { _end_date: string; _start_date: string }
        Returns: {
          leave_hours: number
          person_id: string
          project_id: string
          total_hours: number
        }[]
      }
      get_utilisation_summary_monthly: {
        Args: { _end_date: string; _start_date: string }
        Returns: {
          leave_hours: number
          month_date: string
          person_id: string
          project_id: string
          total_hours: number
        }[]
      }
      relink_and_delete_people: {
        Args: { delete_ids: string[]; mapping: Json }
        Returns: Json
      }
      relink_time_entries_from_fallbacks: { Args: never; Returns: Json }
      relink_time_entries_to_people: { Args: never; Returns: number }
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
