// Archivo GENERADO con npm run db:tipos. No editar a mano.

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
            "alias_productos": {
                  Row: {
                    "created_at": string,"descripcion_original": string,"empresa_id": string,"id": string,"producto_id": string,"proveedor_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"descripcion_original": string,"empresa_id": string,"id"?: string,"producto_id": string,"proveedor_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"descripcion_original"?: string,"empresa_id"?: string,"id"?: string,"producto_id"?: string,"proveedor_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alias_productos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alias_productos_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alias_productos_proveedor_id_fkey"
      columns: ["proveedor_id"]
isOneToOne: false
      referencedRelation: "proveedores"
      referencedColumns: ["id"]
    }
                  ]
                },"categorias": {
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
                },"documentos_compra": {
                  Row: {
                    "confirmado_en": string | null,"confirmado_por": string | null,"created_at": string,"datos_extraidos": Json | null,"empresa_id": string,"estado": string,"fecha": string | null,"id": string,"imagen_url": string | null,"iva": number | null,"neto": number | null,"numero": string | null,"proveedor_id": string | null,"tipo": string,"total": number | null,"updated_at": string,"usuario_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "confirmado_en"?: string | null,"confirmado_por"?: string | null,"created_at"?: string,"datos_extraidos"?: Json | null,"empresa_id": string,"estado"?: string,"fecha"?: string | null,"id"?: string,"imagen_url"?: string | null,"iva"?: number | null,"neto"?: number | null,"numero"?: string | null,"proveedor_id"?: string | null,"tipo"?: string,"total"?: number | null,"updated_at"?: string,"usuario_id"?: string | null
                  }
                  Update: {
                    "confirmado_en"?: string | null,"confirmado_por"?: string | null,"created_at"?: string,"datos_extraidos"?: Json | null,"empresa_id"?: string,"estado"?: string,"fecha"?: string | null,"id"?: string,"imagen_url"?: string | null,"iva"?: number | null,"neto"?: number | null,"numero"?: string | null,"proveedor_id"?: string | null,"tipo"?: string,"total"?: number | null,"updated_at"?: string,"usuario_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "documentos_compra_confirmado_por_fkey"
      columns: ["confirmado_por"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documentos_compra_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documentos_compra_proveedor_id_fkey"
      columns: ["proveedor_id"]
isOneToOne: false
      referencedRelation: "proveedores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documentos_compra_usuario_id_fkey"
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
                },"items_documento": {
                  Row: {
                    "cantidad": number,"created_at": string,"descripcion_original": string,"documento_id": string,"empresa_id": string,"id": string,"precio_unitario": number,"producto_id": string | null,"total": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"created_at"?: string,"descripcion_original": string,"documento_id": string,"empresa_id": string,"id"?: string,"precio_unitario": number,"producto_id"?: string | null,"total": number,"updated_at"?: string
                  }
                  Update: {
                    "cantidad"?: number,"created_at"?: string,"descripcion_original"?: string,"documento_id"?: string,"empresa_id"?: string,"id"?: string,"precio_unitario"?: number,"producto_id"?: string | null,"total"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "items_documento_documento_id_fkey"
      columns: ["documento_id"]
isOneToOne: false
      referencedRelation: "documentos_compra"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "items_documento_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "items_documento_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    }
                  ]
                },"movimientos_stock": {
                  Row: {
                    "cantidad": number,"costo_unitario": number | null,"created_at": string,"empresa_id": string,"fecha": string,"id": string,"motivo": string | null,"producto_id": string,"referencia_id": string | null,"tipo": string,"updated_at": string,"usuario_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"costo_unitario"?: number | null,"created_at"?: string,"empresa_id": string,"fecha"?: string,"id"?: string,"motivo"?: string | null,"producto_id": string,"referencia_id"?: string | null,"tipo": string,"updated_at"?: string,"usuario_id"?: string | null
                  }
                  Update: {
                    "cantidad"?: number,"costo_unitario"?: number | null,"created_at"?: string,"empresa_id"?: string,"fecha"?: string,"id"?: string,"motivo"?: string | null,"producto_id"?: string,"referencia_id"?: string | null,"tipo"?: string,"updated_at"?: string,"usuario_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "movimientos_stock_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_stock_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_stock_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    }
                  ]
                },"productos": {
                  Row: {
                    "activo": boolean,"categoria_id": string | null,"codigo_barras": string | null,"costo_promedio": number,"created_at": string,"empresa_id": string,"id": string,"nombre": string,"precio_venta": number,"stock_actual": number,"stock_minimo": number,"ultimo_movimiento_en": string | null,"unidad": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"categoria_id"?: string | null,"codigo_barras"?: string | null,"costo_promedio"?: number,"created_at"?: string,"empresa_id": string,"id"?: string,"nombre": string,"precio_venta"?: number,"stock_actual"?: number,"stock_minimo"?: number,"ultimo_movimiento_en"?: string | null,"unidad"?: string,"updated_at"?: string
                  }
                  Update: {
                    "activo"?: boolean,"categoria_id"?: string | null,"codigo_barras"?: string | null,"costo_promedio"?: number,"created_at"?: string,"empresa_id"?: string,"id"?: string,"nombre"?: string,"precio_venta"?: number,"stock_actual"?: number,"stock_minimo"?: number,"ultimo_movimiento_en"?: string | null,"unidad"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "productos_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "productos_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                },"proveedores": {
                  Row: {
                    "created_at": string,"empresa_id": string,"id": string,"nombre": string,"rut": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"empresa_id": string,"id"?: string,"nombre": string,"rut"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"empresa_id"?: string,"id"?: string,"nombre"?: string,"rut"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "proveedores_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
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
            "confirmar_documento":
{ Args: { "p_datos": Json,"p_documento_id": string }; Returns: number
                           },
"costo_promedio_ponderado":
{ Args: { "p_cantidad": number,"p_costo_anterior": number,"p_costo_nuevo": number,"p_stock_anterior": number }; Returns: number
                           },
"costos_de_mi_negocio":
{ Args: Record<PropertyKey, never>; Returns: {
              "costo_promedio": number,"producto_id": string
            }[]
                           },
"crear_categorias_base":
{ Args: { "p_empresa_id": string }; Returns: undefined
                           },
"crear_documento":
{ Args: { "p_imagen_url": string }; Returns: string
                           },
"crear_producto":
{ Args: { "p_categoria_id": string,"p_codigo_barras": string,"p_costo": number,"p_nombre": string,"p_precio_venta": number,"p_stock_inicial": number,"p_stock_minimo": number,"p_unidad": string }; Returns: string
                           },
"crear_vendedor":
{ Args: { "p_empresa_id": string,"p_nombre": string,"p_pin": string }; Returns: string
                           },
"descartar_documento":
{ Args: { "p_documento_id": string }; Returns: string
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
"normalizar_descripcion":
{ Args: { "p_texto": string }; Returns: string
                           },
"puedo_modificar":
{ Args: { "p_empresa_id": string }; Returns: boolean
                           },
"registrar_conteo":
{ Args: { "p_conteos": Json }; Returns: number
                           },
"registrar_negocio":
{ Args: { "p_comuna": string,"p_correo": string,"p_ip": string,"p_nombre": string,"p_nombre_negocio": string,"p_rut_empresa": string,"p_rut_usuario": string,"p_usuario_id": string,"p_version_legal": string }; Returns: string
                           },
"registrar_salida":
{ Args: { "p_cantidad": number,"p_motivo": string,"p_producto_id": string }; Returns: undefined
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
