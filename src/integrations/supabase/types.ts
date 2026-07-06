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
      booking_drafts: {
        Row: {
          completed: boolean
          created_at: string
          email: string
          id: string
          last_seen_at: string
          name: string | null
          reminder_sent_at: string | null
          scheduled_at: string | null
          service_catalog_id: string | null
          session_token: string
          step: number
        }
        Insert: {
          completed?: boolean
          created_at?: string
          email: string
          id?: string
          last_seen_at?: string
          name?: string | null
          reminder_sent_at?: string | null
          scheduled_at?: string | null
          service_catalog_id?: string | null
          session_token?: string
          step?: number
        }
        Update: {
          completed?: boolean
          created_at?: string
          email?: string
          id?: string
          last_seen_at?: string
          name?: string | null
          reminder_sent_at?: string | null
          scheduled_at?: string | null
          service_catalog_id?: string | null
          session_token?: string
          step?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_drafts_service_catalog_id_fkey"
            columns: ["service_catalog_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          quantity: number | null
          service_catalog_id: string | null
          session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          quantity?: number | null
          service_catalog_id?: string | null
          session_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          quantity?: number | null
          service_catalog_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_service_catalog_id_fkey"
            columns: ["service_catalog_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_sessions: {
        Row: {
          created_at: string
          email: string
          name: string | null
          reminder_sent_at: string | null
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          name?: string | null
          reminder_sent_at?: string | null
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          name?: string | null
          reminder_sent_at?: string | null
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      chairs: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          zone: string
          zones: string[]
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          zone?: string
          zones?: string[]
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          zone?: string
          zones?: string[]
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          postcode: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          postcode?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          postcode?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_dispatch_log: {
        Row: {
          created_at: string
          dedupe_key: string
          id: string
          recipient_email: string
          template_name: string
        }
        Insert: {
          created_at?: string
          dedupe_key: string
          id?: string
          recipient_email: string
          template_name: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string
          id?: string
          recipient_email?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      estimates: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          items: Json
          job_id: string | null
          labor_hours: number | null
          labor_rate: number | null
          status: string
          subtotal: number
          total: number
          travel_cost: number | null
          vat: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          items?: Json
          job_id?: string | null
          labor_hours?: number | null
          labor_rate?: number | null
          status?: string
          subtotal?: number
          total?: number
          travel_cost?: number | null
          vat?: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          items?: Json
          job_id?: string | null
          labor_hours?: number | null
          labor_rate?: number | null
          status?: string
          subtotal?: number
          total?: number
          travel_cost?: number | null
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          employee_id: string
          id: string
          receipt_path: string | null
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          employee_id: string
          id?: string
          receipt_path?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          employee_id?: string
          id?: string
          receipt_path?: string | null
        }
        Relationships: []
      }
      hair_profiles: {
        Row: {
          created_at: string
          customer_id: string
          goal: string
          id: string
          preference: string
          texture: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          goal?: string
          id?: string
          preference?: string
          texture?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          goal?: string
          id?: string
          preference?: string
          texture?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          category: string
          created_at: string | null
          id: string
          image_path: string | null
          low_stock_threshold: number
          name: string
          price: number
          quantity: number
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          id?: string
          image_path?: string | null
          low_stock_threshold?: number
          name: string
          price?: number
          quantity?: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          image_path?: string | null
          low_stock_threshold?: number
          name?: string
          price?: number
          quantity?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          type: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          invoice_id: string
          quantity?: number
          type?: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          type?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          id: string
          job_id: string
          payment_method: string | null
          signature: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          stripe_id: string | null
          total: number
          updated_at: string
          vat: number
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          payment_method?: string | null
          signature?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_id?: string | null
          total?: number
          updated_at?: string
          vat?: number
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          payment_method?: string | null
          signature?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_id?: string | null
          total?: number
          updated_at?: string
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_photos: {
        Row: {
          created_at: string
          id: string
          issue_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_photos_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issue_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_submissions: {
        Row: {
          created_at: string
          customer_id: string
          description: string
          hair_profile_id: string | null
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string
          hair_profile_id?: string | null
          id?: string
          status?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string
          hair_profile_id?: string | null
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_submissions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_submissions_vehicle_id_fkey"
            columns: ["hair_profile_id"]
            isOneToOne: false
            referencedRelation: "hair_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_addons: {
        Row: {
          addon_service_id: string
          created_at: string
          duration_minutes_snapshot: number
          id: string
          job_id: string
          price_snapshot: number
        }
        Insert: {
          addon_service_id: string
          created_at?: string
          duration_minutes_snapshot?: number
          id?: string
          job_id: string
          price_snapshot?: number
        }
        Update: {
          addon_service_id?: string
          created_at?: string
          duration_minutes_snapshot?: number
          id?: string
          job_id?: string
          price_snapshot?: number
        }
        Relationships: []
      }
      job_notes: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          job_id: string
        }
        Insert: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          job_id: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_notes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          job_id: string
          photo_type: string | null
          storage_path: string
          uploaded_by: string | null
          visible_to_customer: boolean | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          job_id: string
          photo_type?: string | null
          storage_path: string
          uploaded_by?: string | null
          visible_to_customer?: boolean | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          job_id?: string
          photo_type?: string | null
          storage_path?: string
          uploaded_by?: string | null
          visible_to_customer?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          allow_overlap: boolean
          assigned_to: string | null
          chair_id: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          deposit_amount: number
          deposit_paid_amount: number
          deposit_paid_at: string | null
          deposit_required: boolean
          hair_profile_id: string | null
          id: string
          manage_token: string | null
          notes: string | null
          pay_amount: number | null
          pay_type: string
          progress: string | null
          scheduled_at: string | null
          service_catalog_id: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          source: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          type: Database["public"]["Enums"]["job_type"]
          updated_at: string
          urgency: string
        }
        Insert: {
          allow_overlap?: boolean
          assigned_to?: string | null
          chair_id?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          deposit_amount?: number
          deposit_paid_amount?: number
          deposit_paid_at?: string | null
          deposit_required?: boolean
          hair_profile_id?: string | null
          id?: string
          manage_token?: string | null
          notes?: string | null
          pay_amount?: number | null
          pay_type?: string
          progress?: string | null
          scheduled_at?: string | null
          service_catalog_id?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          source?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          type?: Database["public"]["Enums"]["job_type"]
          updated_at?: string
          urgency?: string
        }
        Update: {
          allow_overlap?: boolean
          assigned_to?: string | null
          chair_id?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          deposit_amount?: number
          deposit_paid_amount?: number
          deposit_paid_at?: string | null
          deposit_required?: boolean
          hair_profile_id?: string | null
          id?: string
          manage_token?: string | null
          notes?: string | null
          pay_amount?: number | null
          pay_type?: string
          progress?: string | null
          scheduled_at?: string | null
          service_catalog_id?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          source?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          type?: Database["public"]["Enums"]["job_type"]
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_chair_id_fkey"
            columns: ["chair_id"]
            isOneToOne: false
            referencedRelation: "chairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_service_catalog_id_fkey"
            columns: ["service_catalog_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_vehicle_id_fkey"
            columns: ["hair_profile_id"]
            isOneToOne: false
            referencedRelation: "hair_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_interactions: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          lead_id: string
          type: string
        }
        Insert: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          lead_id: string
          type?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ai_score: number
          assigned_to: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          priority: string
          service_requested: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_score?: number
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          priority?: string
          service_requested?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_score?: number
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          priority?: string
          service_requested?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          created_at: string | null
          decline_reason: string | null
          end_date: string
          id: string
          reason: string | null
          staff_id: string
          start_date: string
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          decline_reason?: string | null
          end_date: string
          id?: string
          reason?: string | null
          staff_id: string
          start_date: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          decline_reason?: string | null
          end_date?: string
          id?: string
          reason?: string | null
          staff_id?: string
          start_date?: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          customer_id: string
          direction: Database["public"]["Enums"]["message_direction"]
          id: string
        }
        Insert: {
          content?: string
          created_at?: string
          customer_id: string
          direction?: Database["public"]["Enums"]["message_direction"]
          id?: string
        }
        Update: {
          content?: string
          created_at?: string
          customer_id?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
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
          created_at: string
          customer_id: string | null
          id: string
          notes: string | null
          shipping_address: string | null
          shipping_name: string | null
          shipping_phone: string | null
          status: string
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          shipping_address?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          shipping_address?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          compare_at_price: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          is_on_promo: boolean
          name: string
          price: number
          sale_price: number | null
          sku: string | null
          stock_quantity: number
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          category?: string
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_on_promo?: boolean
          name: string
          price?: number
          sale_price?: number | null
          sku?: string | null
          stock_quantity?: number
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_on_promo?: boolean
          name?: string
          price?: number
          sale_price?: number | null
          sku?: string | null
          stock_quantity?: number
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bookable: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          pay_rate: number | null
          phone: string | null
          postcode: string | null
          skills: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bookable?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          pay_rate?: number | null
          phone?: string | null
          postcode?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bookable?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          pay_rate?: number | null
          phone?: string | null
          postcode?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          price: number
          quote_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          price?: number
          quote_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          price?: number
          quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          estimated_date: string | null
          estimated_price: number
          id: string
          labor_estimate: number
          lead_id: string
          location_type: string
          parts_cost_estimate: number
          signature: string | null
          status: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          estimated_date?: string | null
          estimated_price?: number
          id?: string
          labor_estimate?: number
          lead_id: string
          location_type?: string
          parts_cost_estimate?: number
          signature?: string | null
          status?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          estimated_date?: string | null
          estimated_price?: number
          id?: string
          labor_estimate?: number
          lead_id?: string
          location_type?: string
          parts_cost_estimate?: number
          signature?: string | null
          status?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      service_addons: {
        Row: {
          addon_id: string
          created_at: string
          discount_pct: number
          id: string
          service_id: string
          sort_order: number
        }
        Insert: {
          addon_id: string
          created_at?: string
          discount_pct?: number
          id?: string
          service_id: string
          sort_order?: number
        }
        Update: {
          addon_id?: string
          created_at?: string
          discount_pct?: number
          id?: string
          service_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      service_catalog: {
        Row: {
          base_price: number
          category: string | null
          created_at: string
          deposit_amount: number
          deposit_required: boolean
          description: string | null
          duration_minutes: number | null
          estimated_hours: number | null
          featured_style: boolean
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_on_promo: boolean
          is_seasonal: boolean | null
          name: string
          sale_price: number | null
          target_audience: string
          upsell_product_id: string | null
        }
        Insert: {
          base_price?: number
          category?: string | null
          created_at?: string
          deposit_amount?: number
          deposit_required?: boolean
          description?: string | null
          duration_minutes?: number | null
          estimated_hours?: number | null
          featured_style?: boolean
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_on_promo?: boolean
          is_seasonal?: boolean | null
          name?: string
          sale_price?: number | null
          target_audience?: string
          upsell_product_id?: string | null
        }
        Update: {
          base_price?: number
          category?: string | null
          created_at?: string
          deposit_amount?: number
          deposit_required?: boolean
          description?: string | null
          duration_minutes?: number | null
          estimated_hours?: number | null
          featured_style?: boolean
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_on_promo?: boolean
          is_seasonal?: boolean | null
          name?: string
          sale_price?: number | null
          target_audience?: string
          upsell_product_id?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      swap_requests: {
        Row: {
          created_at: string
          from_mechanic_id: string
          id: string
          job_id: string
          reason: string | null
          resolved_at: string | null
          status: string
          to_mechanic_id: string | null
        }
        Insert: {
          created_at?: string
          from_mechanic_id: string
          id?: string
          job_id: string
          reason?: string | null
          resolved_at?: string | null
          status?: string
          to_mechanic_id?: string | null
        }
        Update: {
          created_at?: string
          from_mechanic_id?: string
          id?: string
          job_id?: string
          reason?: string | null
          resolved_at?: string | null
          status?: string
          to_mechanic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "swap_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          archived: boolean
          created_at: string
          duration_seconds: number | null
          end_time: string | null
          id: string
          job_id: string | null
          mechanic_id: string
          notes: string | null
          start_time: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          job_id?: string | null
          mechanic_id: string
          notes?: string | null
          start_time?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          job_id?: string | null
          mechanic_id?: string
          notes?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
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
      waitlist: {
        Row: {
          assigned_chair_id: string | null
          client_name: string
          created_at: string | null
          customer_id: string | null
          estimated_wait_minutes: number | null
          id: string
          notes: string | null
          phone: string | null
          position: number
          service_catalog_id: string | null
          status: string
        }
        Insert: {
          assigned_chair_id?: string | null
          client_name: string
          created_at?: string | null
          customer_id?: string | null
          estimated_wait_minutes?: number | null
          id?: string
          notes?: string | null
          phone?: string | null
          position?: number
          service_catalog_id?: string | null
          status?: string
        }
        Update: {
          assigned_chair_id?: string | null
          client_name?: string
          created_at?: string | null
          customer_id?: string | null
          estimated_wait_minutes?: number | null
          id?: string
          notes?: string | null
          phone?: string | null
          position?: number
          service_catalog_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_assigned_chair_id_fkey"
            columns: ["assigned_chair_id"]
            isOneToOne: false
            referencedRelation: "chairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_customer_id_fkey"
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recompute_profile_bookable: {
        Args: { _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "mechanic" | "customer" | "super_admin"
      invoice_status: "draft" | "sent" | "paid" | "archived"
      job_status: "pending" | "confirmed" | "in_progress" | "completed" | "paid"
      job_type: "mobile" | "garage"
      message_direction: "inbound" | "outbound"
      service_type: "service" | "repair" | "diagnostics"
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
      app_role: ["admin", "mechanic", "customer", "super_admin"],
      invoice_status: ["draft", "sent", "paid", "archived"],
      job_status: ["pending", "confirmed", "in_progress", "completed", "paid"],
      job_type: ["mobile", "garage"],
      message_direction: ["inbound", "outbound"],
      service_type: ["service", "repair", "diagnostics"],
    },
  },
} as const
