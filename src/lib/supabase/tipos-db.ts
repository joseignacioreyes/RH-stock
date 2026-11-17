// Archivo GENERADO con "npm run db:tipos". No editar a mano.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "categorias": {
                  Row: {
                    "created_at": string,"empresa_id": string,"icono": string,"id": string,"margen_objetivo": number,"nombre": string,"orden": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"empresa_id": string,"icono"?: string,"id"?: string,"margen_objetivo"?: number,"nombre": string,"orden"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"empresa_id"?: string,"icono"?: string,"id"?: string,"margen_objetivo"?: number,"nombre"?: string,"orden"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "categorias_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"consentimientos": {
                  Row: {
                    "aceptado": boolean,"created_at": string,"fecha": string,"id": string,"ip": string | null,"tipo": string,"updated_at": string,"usuario_id": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aceptado": boolean,"created_at"?: string,"fecha"?: string,"id"?: string,"ip"?: string | null,"tipo": string,"updated_at"?: string,"usuario_id": string,"version": string
                  }
                  Update: {
                    "aceptado"?: boolean,"created_at"?: string,"fecha"?: string,"id"?: string,"ip"?: string | null,"tipo"?: string,"updated_at"?: string,"usuario_id"?: string,"version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consentimientos_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    }
                  ]
                },"empresas": {
                  Row: {
                    "comuna": string,"creada_en": string,"created_at": string,"dia_pago": number,"es_demo": boolean,"estado_suscripcion": string,"id": string,"nombre_fantasia": string,"plan": string,"razon_social": string | null,"rut": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comuna"?: string,"creada_en"?: string,"created_at"?: string,"dia_pago"?: number,"es_demo"?: boolean,"estado_suscripcion"?: string,"id"?: string,"nombre_fantasia": string,"plan"?: string,"razon_social"?: string | null,"rut": string,"updated_at"?: string
                  }
                  Update: {
                    "comuna"?: string,"creada_en"?: string,"created_at"?: string,"dia_pago"?: number,"es_demo"?: boolean,"estado_suscripcion"?: string,"id"?: string,"nombre_fantasia"?: string,"plan"?: string,"razon_social"?: string | null,"rut"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"usuarios": {
                  Row: {
                    "correo": string,"created_at": string,"empresa_id": string | null,"id": string,"nombre": string,"rol": string,"rut": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "correo": string,"created_at"?: string,"empresa_id"?: string | null,"id": string,"nombre": string,"rol": string,"rut": string,"updated_at"?: string
                  }
                  Update: {
                    "correo"?: string,"created_at"?: string,"empresa_id"?: string | null,"id"?: string,"nombre"?: string,"rol"?: string,"rut"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "usuarios_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"vendedores": {
                  Row: {
                    "activo": boolean,"created_at": string,"empresa_id": string,"id": string,"nombre": string,"pin_hash": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"created_at"?: string,"empresa_id": string,"id"?: string,"nombre": string,"pin_hash": string,"updated_at"?: string
                  }
                  Update: {
                    "activo"?: boolean,"created_at"?: string,"empresa_id"?: string,"id"?: string,"nombre"?: string,"pin_hash"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vendedores_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "crear_categorias_base":
{ Args: { "p_empresa_id": string }; Returns: undefined
                           },
"crear_vendedor":
{ Args: { "p_empresa_id": string,"p_nombre": string,"p_pin": string }; Returns: string
                           },
"es_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"mi_empresa_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"mi_rol":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"puedo_modificar":
{ Args: { "p_empresa_id": string }; Returns: boolean
                           },
"registrar_negocio":
{ Args: { "p_comuna": string,"p_correo": string,"p_ip": string,"p_nombre": string,"p_nombre_negocio": string,"p_rut_empresa": string,"p_rut_usuario": string,"p_usuario_id": string,"p_version_legal": string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
