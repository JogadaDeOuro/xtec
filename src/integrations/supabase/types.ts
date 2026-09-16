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
      admin_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          after_value: Json | null
          before_value: Json | null
          created_at: string
          id: string
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          id?: string
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          id?: string
          organization_id?: string | null
        }
        Relationships: []
      }
      billing_records: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          due_date: string | null
          external_id: string | null
          id: string
          method: string | null
          notes: string | null
          organization_id: string
          paid_at: string | null
          status: string
          subscription_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          external_id?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          status?: string
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          external_id?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          {
            foreignKeyName: "contract_signatures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          organization_id: string | null
          proposal_type: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          organization_id?: string | null
          proposal_type?: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          organization_id?: string | null
          proposal_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          potencia_w?: number
          updated_at?: string
          warranty_defect_years?: number
          warranty_performance_years?: number
        }
        Relationships: [
          {
            foreignKeyName: "equipment_catalog_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_feature_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean | null
          expires_at: string | null
          feature_code: string
          id: string
          limit_value: number | null
          organization_id: string
          reason: string | null
          starts_at: string
          unlimited: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean | null
          expires_at?: string | null
          feature_code: string
          id?: string
          limit_value?: number | null
          organization_id: string
          reason?: string | null
          starts_at?: string
          unlimited?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean | null
          expires_at?: string | null
          feature_code?: string
          id?: string
          limit_value?: number | null
          organization_id?: string
          reason?: string | null
          starts_at?: string
          unlimited?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "organization_feature_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          document: string | null
          email: string | null
          id: string
          legal_name: string | null
          name: string
          owner_user_id: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          name: string
          owner_user_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          owner_user_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      plan_features: {
        Row: {
          created_at: string
          enabled: boolean
          feature_code: string
          id: string
          limit_value: number | null
          period: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_code: string
          id?: string
          limit_value?: number | null
          period?: string
          plan_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_code?: string
          id?: string
          limit_value?: number | null
          period?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          billing_interval: string
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
          public: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing_interval?: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number
          public?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing_interval?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          public?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
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
          organization_id: string | null
          tracking_token: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          organization_id?: string | null
          tracking_token?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          organization_id?: string | null
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
          {
            foreignKeyName: "project_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_settings: {
        Row: {
          config: Json
          created_at: string
          id: string
          organization_id: string | null
          scope: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          organization_id?: string | null
          scope?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          organization_id?: string | null
          scope?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          accepted_at: string | null
          area_m2: number
          client_id: string | null
          client_name: string
          comissao: number
          condicao_pagamento: string | null
          condicoes_alternativas: string[]
          consultor: string | null
          consumo_medio: number
          created_at: string
          desagio_pct: number
          desconto: number
          doc_config: Json | null
          economia_anual: number
          economia_mensal: number
          finalidade: string
          garantia_estendida: boolean
          garantia_estendida_valor: number
          id: string
          manutencao_itens: string[]
          margem: number
          num_modulos: number
          numero: string | null
          organization_id: string | null
          origem_ref: string | null
          origem_tipo: string | null
          pagamento_config: Json
          payback_anos: number
          potencia_kwp: number
          potencia_modulo_w: number
          producao_estimada: number
          public_token: string
          status: string
          system_type: string
          tarifa_kwh: number
          template_id: string | null
          tipo: string
          updated_at: string
          user_id: string | null
          valor_por_modulo: number
          valor_sistema: number
          versao: number
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          area_m2?: number
          client_id?: string | null
          client_name: string
          comissao?: number
          condicao_pagamento?: string | null
          condicoes_alternativas?: string[]
          consultor?: string | null
          consumo_medio?: number
          created_at?: string
          desagio_pct?: number
          desconto?: number
          doc_config?: Json | null
          economia_anual?: number
          economia_mensal?: number
          finalidade?: string
          garantia_estendida?: boolean
          garantia_estendida_valor?: number
          id?: string
          manutencao_itens?: string[]
          margem?: number
          num_modulos?: number
          numero?: string | null
          organization_id?: string | null
          origem_ref?: string | null
          origem_tipo?: string | null
          pagamento_config?: Json
          payback_anos?: number
          potencia_kwp?: number
          potencia_modulo_w?: number
          producao_estimada?: number
          public_token?: string
          status?: string
          system_type?: string
          tarifa_kwh?: number
          template_id?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string | null
          valor_por_modulo?: number
          valor_sistema?: number
          versao?: number
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          area_m2?: number
          client_id?: string | null
          client_name?: string
          comissao?: number
          condicao_pagamento?: string | null
          condicoes_alternativas?: string[]
          consultor?: string | null
          consumo_medio?: number
          created_at?: string
          desagio_pct?: number
          desconto?: number
          doc_config?: Json | null
          economia_anual?: number
          economia_mensal?: number
          finalidade?: string
          garantia_estendida?: boolean
          garantia_estendida_valor?: number
          id?: string
          manutencao_itens?: string[]
          margem?: number
          num_modulos?: number
          numero?: string | null
          organization_id?: string | null
          origem_ref?: string | null
          origem_tipo?: string | null
          pagamento_config?: Json
          payback_anos?: number
          potencia_kwp?: number
          potencia_modulo_w?: number
          producao_estimada?: number
          public_token?: string
          status?: string
          system_type?: string
          tarifa_kwh?: number
          template_id?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string | null
          valor_por_modulo?: number
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
          {
            foreignKeyName: "proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          position?: number
          project_stage_id?: string
          responsavel?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_items_project_stage_id_fkey"
            columns: ["project_stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string
          external_subscription_id: string | null
          grace_until: string | null
          id: string
          next_billing_at: string | null
          organization_id: string
          payment_provider: string | null
          plan_id: string | null
          restricted_at: string | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          external_subscription_id?: string | null
          grace_until?: string | null
          id?: string
          next_billing_at?: string | null
          organization_id: string
          payment_provider?: string | null
          plan_id?: string | null
          restricted_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          external_subscription_id?: string | null
          grace_until?: string | null
          id?: string
          next_billing_at?: string | null
          organization_id?: string
          payment_provider?: string | null
          plan_id?: string | null
          restricted_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
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
          organization_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      admin_list_organizations: { Args: never; Returns: Json }
      admin_platform_overview: { Args: never; Returns: Json }
      get_client_portal: { Args: { _document: string }; Returns: Json }
      get_contract_for_signing: { Args: { _token: string }; Returns: Json }
      get_my_account_summary: { Args: never; Returns: Json }
      get_public_proposal: {
        Args: { _token: string }
        Returns: {
          accepted_at: string | null
          area_m2: number
          client_id: string | null
          client_name: string
          comissao: number
          condicao_pagamento: string | null
          condicoes_alternativas: string[]
          consultor: string | null
          consumo_medio: number
          created_at: string
          desagio_pct: number
          desconto: number
          doc_config: Json | null
          economia_anual: number
          economia_mensal: number
          finalidade: string
          garantia_estendida: boolean
          garantia_estendida_valor: number
          id: string
          manutencao_itens: string[]
          margem: number
          num_modulos: number
          numero: string | null
          organization_id: string | null
          origem_ref: string | null
          origem_tipo: string | null
          pagamento_config: Json
          payback_anos: number
          potencia_kwp: number
          potencia_modulo_w: number
          producao_estimada: number
          public_token: string
          status: string
          system_type: string
          tarifa_kwh: number
          template_id: string | null
          tipo: string
          updated_at: string
          user_id: string | null
          valor_por_modulo: number
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
      signup_create_organization: {
        Args: { _document?: string; _name: string; _phone?: string }
        Returns: string
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
      app_role: ["admin", "vendedor"],
    },
  },
} as const
