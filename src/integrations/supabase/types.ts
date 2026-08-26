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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          city: string | null
          client_type: string
          concessionaria: string | null
          consumo_medio: number | null
          created_at: string
          document: string | null
          email: string | null
          favorite: boolean | null
          id: string
          name: string
          notes: string | null
          origem: string | null
          phone: string | null
          project_location: string | null
          state: string | null
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string | null
          vendedor: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_type?: string
          concessionaria?: string | null
          consumo_medio?: number | null
          created_at?: string
          document?: string | null
          email?: string | null
          favorite?: boolean | null
          id?: string
          name: string
          notes?: string | null
          origem?: string | null
          phone?: string | null
          project_location?: string | null
          state?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
          vendedor?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          client_type?: string
          concessionaria?: string | null
          consumo_medio?: number | null
          created_at?: string
          document?: string | null
          email?: string | null
          favorite?: boolean | null
          id?: string
          name?: string
          notes?: string | null
          origem?: string | null
          phone?: string | null
          project_location?: string | null
          state?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
          vendedor?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      contract_signatures: {
        Row: {
          contract_id: string
          created_at: string
          document: string
          email: string | null
          hash: string
          id: string
          ip: string | null
          location: string | null
          name: string
          signature_font: string | null
          signed_at: string
          signer_type: string
          user_agent: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          document: string
          email?: string | null
          hash: string
          id?: string
          ip?: string | null
          location?: string | null
          name: string
          signature_font?: string | null
          signed_at?: string
          signer_type: string
          user_agent?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          document?: string
          email?: string | null
          hash?: string
          id?: string
          ip?: string | null
          location?: string | null
          name?: string
          signature_font?: string | null
          signed_at?: string
          signer_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_address: string | null
          client_city: string | null
          client_document: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          client_state: string | null
          condicao_pagamento: string | null
          created_at: string
          garantia_estendida: boolean
          garantia_estendida_valor: number
          id: string
          potencia_kwp: number
          proposal_id: string | null
          signed_at: string | null
          signing_token: string | null
          status: string
          system_type: string
          updated_at: string
          user_id: string | null
          valor: number
        }
        Insert: {
          client_address?: string | null
          client_city?: string | null
          client_document?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          client_state?: string | null
          condicao_pagamento?: string | null
          created_at?: string
          garantia_estendida?: boolean
          garantia_estendida_valor?: number
          id?: string
          potencia_kwp?: number
          proposal_id?: string | null
          signed_at?: string | null
          signing_token?: string | null
          status?: string
          system_type?: string
          updated_at?: string
          user_id?: string | null
          valor?: number
        }
        Update: {
          client_address?: string | null
          client_city?: string | null
          client_document?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          client_state?: string | null
          condicao_pagamento?: string | null
          created_at?: string
          garantia_estendida?: boolean
          garantia_estendida_valor?: number
          id?: string
          potencia_kwp?: number
          proposal_id?: string | null
          signed_at?: string | null
          signing_token?: string | null
          status?: string
          system_type?: string
          updated_at?: string
          user_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_catalog: {
        Row: {
          active: boolean
          category: string
          created_at: string
          datasheet_url: string | null
          description: string | null
          efficiency: number
          id: string
          image_url: string | null
          manufacturer: string
          model: string
          notes: string | null
          potencia_w: number
          updated_at: string
          warranty_defect_years: number
          warranty_performance_years: number
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          datasheet_url?: string | null
          description?: string | null
          efficiency?: number
          id?: string
          image_url?: string | null
          manufacturer?: string
          model?: string
          notes?: string | null
          potencia_w?: number
          updated_at?: string
          warranty_defect_years?: number
          warranty_performance_years?: number
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          datasheet_url?: string | null
          description?: string | null
          efficiency?: number
          id?: string
          image_url?: string | null
          manufacturer?: string
          model?: string
          notes?: string | null
          potencia_w?: number
          updated_at?: string
          warranty_defect_years?: number
          warranty_performance_years?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_stages: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          tracking_token: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          tracking_token?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          tracking_token?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_settings: {
        Row: {
          config: Json
          created_at: string
          id: string
          scope: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          scope?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          scope?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      proposal_templates: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          accepted_at: string | null
          client_id: string | null
          client_name: string
          comissao: number
          condicao_pagamento: string | null
          condicoes_alternativas: string[]
          consultor: string | null
          consumo_medio: number
          created_at: string
          desconto: number
          doc_config: Json | null
          economia_anual: number
          economia_mensal: number
          garantia_estendida: boolean
          garantia_estendida_valor: number
          id: string
          margem: number
          num_modulos: number
          numero: string | null
          payback_anos: number
          potencia_kwp: number
          potencia_modulo_w: number
          producao_estimada: number
          public_token: string
          status: string
          system_type: string
          tarifa_kwh: number
          template_id: string | null
          updated_at: string
          user_id: string | null
          valor_sistema: number
          versao: number
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          client_id?: string | null
          client_name: string
          comissao?: number
          condicao_pagamento?: string | null
          condicoes_alternativas?: string[]
          consultor?: string | null
          consumo_medio?: number
          created_at?: string
          desconto?: number
          doc_config?: Json | null
          economia_anual?: number
          economia_mensal?: number
          garantia_estendida?: boolean
          garantia_estendida_valor?: number
          id?: string
          margem?: number
          num_modulos?: number
          numero?: string | null
          payback_anos?: number
          potencia_kwp?: number
          potencia_modulo_w?: number
          producao_estimada?: number
          public_token?: string
          status?: string
          system_type?: string
          tarifa_kwh?: number
          template_id?: string | null
          updated_at?: string
          user_id?: string | null
          valor_sistema?: number
          versao?: number
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          client_id?: string | null
          client_name?: string
          comissao?: number
          condicao_pagamento?: string | null
          condicoes_alternativas?: string[]
          consultor?: string | null
          consumo_medio?: number
          created_at?: string
          desconto?: number
          doc_config?: Json | null
          economia_anual?: number
          economia_mensal?: number
          garantia_estendida?: boolean
          garantia_estendida_valor?: number
          id?: string
          margem?: number
          num_modulos?: number
          numero?: string | null
          payback_anos?: number
          potencia_kwp?: number
          potencia_modulo_w?: number
          producao_estimada?: number
          public_token?: string
          status?: string
          system_type?: string
          tarifa_kwh?: number
          template_id?: string | null
          updated_at?: string
          user_id?: string | null
          valor_sistema?: number
          versao?: number
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_items: {
        Row: {
          created_at: string | null
          data_prevista: string | null
          data_real: string | null
          id: string
          name: string
          observacoes: string | null
          position: number
          project_stage_id: string
          responsavel: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          data_prevista?: string | null
          data_real?: string | null
          id?: string
          name: string
          observacoes?: string | null
          position?: number
          project_stage_id: string
          responsavel?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          data_prevista?: string | null
          data_real?: string | null
          id?: string
          name?: string
          observacoes?: string | null
          position?: number
          project_stage_id?: string
          responsavel?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_items_project_stage_id_fkey"
            columns: ["project_stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_page_permissions: {
        Row: {
          created_at: string
          id: string
          page_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_key?: string
          user_id?: string
        }
        Relationships: []
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
      accept_proposal_public:
        | {
            Args: { _document: string; _garantia: boolean; _token: string }
            Returns: Json
          }
        | {
            Args: {
              _condicao?: string
              _document: string
              _garantia: boolean
              _token: string
            }
            Returns: Json
          }
      get_client_portal: { Args: { _document: string }; Returns: Json }
      get_contract_for_signing: { Args: { _token: string }; Returns: Json }
      get_public_proposal: {
        Args: { _token: string }
        Returns: {
          accepted_at: string | null
          client_id: string | null
          client_name: string
          comissao: number
          condicao_pagamento: string | null
          condicoes_alternativas: string[]
          consultor: string | null
          consumo_medio: number
          created_at: string
          desconto: number
          doc_config: Json | null
          economia_anual: number
          economia_mensal: number
          garantia_estendida: boolean
          garantia_estendida_valor: number
          id: string
          margem: number
          num_modulos: number
          numero: string | null
          payback_anos: number
          potencia_kwp: number
          potencia_modulo_w: number
          producao_estimada: number
          public_token: string
          status: string
          system_type: string
          tarifa_kwh: number
          template_id: string | null
          updated_at: string
          user_id: string | null
          valor_sistema: number
          versao: number
          viewed_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "proposals"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_public_tracking: { Args: { _token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      sign_contract_public: {
        Args: {
          _document: string
          _email: string
          _hash: string
          _ip: string
          _location: string
          _name: string
          _signature_font: string
          _token: string
          _user_agent: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "vendedor"
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
      app_role: ["admin", "vendedor"],
    },
  },
} as const
