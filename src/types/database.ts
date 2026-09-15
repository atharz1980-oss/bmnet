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
      blog_content_blocks: {
        Row: {
          block_type: Database["public"]["Enums"]["blog_block_type"]
          content: Json
          created_at: string
          id: string
          post_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          block_type: Database["public"]["Enums"]["blog_block_type"]
          content: Json
          created_at?: string
          id?: string
          post_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          block_type?: Database["public"]["Enums"]["blog_block_type"]
          content?: Json
          created_at?: string
          id?: string
          post_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_content_blocks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_tags: {
        Row: {
          created_at: string
          post_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category: string
          cover_alt: string | null
          cover_path: string
          created_at: string
          excerpt: string
          id: string
          publish_status: Database["public"]["Enums"]["publish_status"]
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string
          cover_alt?: string | null
          cover_path?: string
          created_at?: string
          excerpt?: string
          id?: string
          publish_status?: Database["public"]["Enums"]["publish_status"]
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string
          cover_alt?: string | null
          cover_path?: string
          created_at?: string
          excerpt?: string
          id?: string
          publish_status?: Database["public"]["Enums"]["publish_status"]
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      commerce_settings: {
        Row: {
          balance_due_days: number | null
          commercial_registration: string
          deposit_enabled: boolean
          deposit_type: string
          deposit_value: number | null
          full_payment_enabled: boolean
          id: boolean
          invoice_email: string
          invoice_phone: string
          legal_name: string
          legal_name_en: string
          national_address: string
          national_short_address: string
          policies_approved: boolean
          prices_include_tax: boolean
          tax_rate_bps: number | null
          unified_number: string
          updated_at: string
          vat_number: string
          vat_status: string
        }
        Insert: {
          balance_due_days?: number | null
          commercial_registration?: string
          deposit_enabled?: boolean
          deposit_type?: string
          deposit_value?: number | null
          full_payment_enabled?: boolean
          id?: boolean
          invoice_email?: string
          invoice_phone?: string
          legal_name?: string
          legal_name_en?: string
          national_address?: string
          national_short_address?: string
          policies_approved?: boolean
          prices_include_tax?: boolean
          tax_rate_bps?: number | null
          unified_number?: string
          updated_at?: string
          vat_number?: string
          vat_status?: string
        }
        Update: {
          balance_due_days?: number | null
          commercial_registration?: string
          deposit_enabled?: boolean
          deposit_type?: string
          deposit_value?: number | null
          full_payment_enabled?: boolean
          id?: boolean
          invoice_email?: string
          invoice_phone?: string
          legal_name?: string
          legal_name_en?: string
          national_address?: string
          national_short_address?: string
          policies_approved?: boolean
          prices_include_tax?: boolean
          tax_rate_bps?: number | null
          unified_number?: string
          updated_at?: string
          vat_number?: string
          vat_status?: string
        }
        Relationships: []
      }
      community_content_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_content_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "community_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_content_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "community_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "community_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      community_notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "community_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      community_portfolio_media: {
        Row: {
          alt_text: string
          created_at: string
          id: string
          media_type: string
          project_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt_text?: string
          created_at?: string
          id?: string
          media_type?: string
          project_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          id?: string
          media_type?: string
          project_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_portfolio_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "community_portfolio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      community_portfolio_projects: {
        Row: {
          category: string | null
          cover_path: string | null
          created_at: string
          description: string | null
          id: string
          location_name: string | null
          project_date: string | null
          published: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          cover_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location_name?: string | null
          project_date?: string | null
          published?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          cover_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location_name?: string | null
          project_date?: string | null
          published?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_portfolio_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      community_post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
          status: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "community_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      community_post_media: {
        Row: {
          alt_text: string
          created_at: string
          id: string
          media_type: string
          post_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt_text?: string
          created_at?: string
          id?: string
          media_type?: string
          post_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          id?: string
          media_type?: string
          post_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          camera: string | null
          caption: string
          category: string | null
          created_at: string
          id: string
          lens: string | null
          location_name: string | null
          status: string
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id: string
          camera?: string | null
          caption?: string
          category?: string | null
          created_at?: string
          id?: string
          lens?: string | null
          location_name?: string | null
          status?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_id?: string
          camera?: string | null
          caption?: string
          category?: string | null
          created_at?: string
          id?: string
          lens?: string | null
          location_name?: string | null
          status?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "community_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      community_profiles: {
        Row: {
          available_for_work: boolean
          avatar_path: string | null
          bio: string | null
          city: string | null
          country: string | null
          cover_path: string | null
          created_at: string
          display_name: string
          experience_level: string
          instagram_url: string | null
          specialties: string[]
          status: string
          updated_at: string
          user_id: string
          username: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          available_for_work?: boolean
          avatar_path?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          cover_path?: string | null
          created_at?: string
          display_name: string
          experience_level?: string
          instagram_url?: string | null
          specialties?: string[]
          status?: string
          updated_at?: string
          user_id: string
          username: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          available_for_work?: boolean
          avatar_path?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          cover_path?: string | null
          created_at?: string
          display_name?: string
          experience_level?: string
          instagram_url?: string | null
          specialties?: string[]
          status?: string
          updated_at?: string
          user_id?: string
          username?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      community_saved_posts: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      community_user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "community_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "community_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_settings: {
        Row: {
          address: string
          channel_address: boolean
          channel_email: boolean
          channel_instagram: boolean
          channel_main_mobile: boolean
          channel_maps: boolean
          channel_secondary_phone: boolean
          channel_tiktok: boolean
          channel_whatsapp: boolean
          channel_working_hours: boolean
          email: string
          id: number
          instagram_url: string
          main_mobile: string
          maps_url: string | null
          secondary_phone: string | null
          tiktok_url: string
          updated_at: string
          whatsapp_message: string
          whatsapp_number: string
          working_hours: string
        }
        Insert: {
          address?: string
          channel_address?: boolean
          channel_email?: boolean
          channel_instagram?: boolean
          channel_main_mobile?: boolean
          channel_maps?: boolean
          channel_secondary_phone?: boolean
          channel_tiktok?: boolean
          channel_whatsapp?: boolean
          channel_working_hours?: boolean
          email?: string
          id?: number
          instagram_url?: string
          main_mobile?: string
          maps_url?: string | null
          secondary_phone?: string | null
          tiktok_url?: string
          updated_at?: string
          whatsapp_message?: string
          whatsapp_number?: string
          working_hours?: string
        }
        Update: {
          address?: string
          channel_address?: boolean
          channel_email?: boolean
          channel_instagram?: boolean
          channel_main_mobile?: boolean
          channel_maps?: boolean
          channel_secondary_phone?: boolean
          channel_tiktok?: boolean
          channel_whatsapp?: boolean
          channel_working_hours?: boolean
          email?: string
          id?: number
          instagram_url?: string
          main_mobile?: string
          maps_url?: string | null
          secondary_phone?: string | null
          tiktok_url?: string
          updated_at?: string
          whatsapp_message?: string
          whatsapp_number?: string
          working_hours?: string
        }
        Relationships: []
      }
      corporate_request_notes: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          note: string
          request_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          note: string
          request_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          note?: string
          request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corporate_request_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_request_notes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "corporate_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_request_timeline: {
        Row: {
          actor_id: string | null
          created_at: string
          description: string
          event_type: Database["public"]["Enums"]["corporate_request_event"]
          from_status: Database["public"]["Enums"]["request_status"] | null
          id: string
          request_id: string
          to_status: Database["public"]["Enums"]["request_status"] | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          description?: string
          event_type: Database["public"]["Enums"]["corporate_request_event"]
          from_status?: Database["public"]["Enums"]["request_status"] | null
          id?: string
          request_id: string
          to_status?: Database["public"]["Enums"]["request_status"] | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          description?: string
          event_type?: Database["public"]["Enums"]["corporate_request_event"]
          from_status?: Database["public"]["Enums"]["request_status"] | null
          id?: string
          request_id?: string
          to_status?: Database["public"]["Enums"]["request_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "corporate_request_timeline_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_request_timeline_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "corporate_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_requests: {
        Row: {
          archived_at: string | null
          assigned_to: string | null
          company_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          notes: string
          phone: string
          requested_course: string
          status: Database["public"]["Enums"]["request_status"]
          trainee_count: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_to?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          email?: string
          id?: string
          notes?: string
          phone?: string
          requested_course?: string
          status?: Database["public"]["Enums"]["request_status"]
          trainee_count?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_to?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          notes?: string
          phone?: string
          requested_course?: string
          status?: Database["public"]["Enums"]["request_status"]
          trainee_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corporate_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_curriculum_days: {
        Row: {
          course_id: string
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_curriculum_days_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_curriculum_items: {
        Row: {
          created_at: string
          day_id: string
          description: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_id: string
          description?: string | null
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_id?: string
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_curriculum_items_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "course_curriculum_days"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          course_id: string
          created_at: string
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          created_at: string
          description: string
          duration_seconds: number
          free_preview: boolean
          id: string
          module_id: string
          published: boolean
          sort_order: number
          title: string
          updated_at: string
          video_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          duration_seconds?: number
          free_preview?: boolean
          id?: string
          module_id: string
          published?: boolean
          sort_order?: number
          title: string
          updated_at?: string
          video_id?: string
        }
        Update: {
          created_at?: string
          description?: string
          duration_seconds?: number
          free_preview?: boolean
          id?: string
          module_id?: string
          published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          id: string
          sort_order: number
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          sort_order?: number
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sessions: {
        Row: {
          batch_name: string | null
          capacity: number
          city: string
          course_id: string
          created_at: string
          end_date: string | null
          end_time: string
          id: string
          location: string
          price_override: number | null
          registered_count: number
          start_date: string
          start_time: string
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
        }
        Insert: {
          batch_name?: string | null
          capacity?: number
          city?: string
          course_id: string
          created_at?: string
          end_date?: string | null
          end_time: string
          id?: string
          location?: string
          price_override?: number | null
          registered_count?: number
          start_date: string
          start_time: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Update: {
          batch_name?: string | null
          capacity?: number
          city?: string
          course_id?: string
          created_at?: string
          end_date?: string | null
          end_time?: string
          id?: string
          location?: string
          price_override?: number | null
          registered_count?: number
          start_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          audience: string[]
          category: Database["public"]["Enums"]["course_category"]
          created_at: string
          description: string
          discount_percent: number | null
          duration_days: number
          duration_hours: number
          featured: boolean
          id: string
          image_alt: string
          image_path: string
          is_free: boolean
          language: string
          level: Database["public"]["Enums"]["course_level"]
          name: string
          operational_status:
            | Database["public"]["Enums"]["course_operational_status"]
            | null
          original_price: number | null
          outcomes: string[]
          price: number
          publish_status: Database["public"]["Enums"]["course_publish_status"]
          request_quote: boolean
          requirements: string[]
          seo_description: string | null
          seo_title: string | null
          short_description: string
          show_price: boolean
          slug: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          audience?: string[]
          category: Database["public"]["Enums"]["course_category"]
          created_at?: string
          description?: string
          discount_percent?: number | null
          duration_days?: number
          duration_hours?: number
          featured?: boolean
          id?: string
          image_alt?: string
          image_path?: string
          is_free?: boolean
          language?: string
          level?: Database["public"]["Enums"]["course_level"]
          name: string
          operational_status?:
            | Database["public"]["Enums"]["course_operational_status"]
            | null
          original_price?: number | null
          outcomes?: string[]
          price?: number
          publish_status?: Database["public"]["Enums"]["course_publish_status"]
          request_quote?: boolean
          requirements?: string[]
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string
          show_price?: boolean
          slug: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          audience?: string[]
          category?: Database["public"]["Enums"]["course_category"]
          created_at?: string
          description?: string
          discount_percent?: number | null
          duration_days?: number
          duration_hours?: number
          featured?: boolean
          id?: string
          image_alt?: string
          image_path?: string
          is_free?: boolean
          language?: string
          level?: Database["public"]["Enums"]["course_level"]
          name?: string
          operational_status?:
            | Database["public"]["Enums"]["course_operational_status"]
            | null
          original_price?: number | null
          outcomes?: string[]
          price?: number
          publish_status?: Database["public"]["Enums"]["course_publish_status"]
          request_quote?: boolean
          requirements?: string[]
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string
          show_price?: boolean
          slug?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      footer_links: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          label: string
          link_group: Database["public"]["Enums"]["footer_link_group"]
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          label: string
          link_group: Database["public"]["Enums"]["footer_link_group"]
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
          link_group?: Database["public"]["Enums"]["footer_link_group"]
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      footer_settings: {
        Row: {
          about_text: string
          copyright: string
          id: number
          updated_at: string
        }
        Insert: {
          about_text?: string
          copyright?: string
          id?: number
          updated_at?: string
        }
        Update: {
          about_text?: string
          copyright?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      homepage_accreditations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_path: string
          name: string
          sort_order: number
          updated_at: string
          url: string | null
          visible: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_path?: string
          name: string
          sort_order?: number
          updated_at?: string
          url?: string | null
          visible?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_path?: string
          name?: string
          sort_order?: number
          updated_at?: string
          url?: string | null
          visible?: boolean
        }
        Relationships: []
      }
      homepage_categories: {
        Row: {
          category_key: Database["public"]["Enums"]["course_category"]
          created_at: string
          cta_label: string
          enabled: boolean
          id: string
          image_alt: string | null
          image_path: string
          short_description: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category_key: Database["public"]["Enums"]["course_category"]
          created_at?: string
          cta_label?: string
          enabled?: boolean
          id?: string
          image_alt?: string | null
          image_path?: string
          short_description?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category_key?: Database["public"]["Enums"]["course_category"]
          created_at?: string
          cta_label?: string
          enabled?: boolean
          id?: string
          image_alt?: string | null
          image_path?: string
          short_description?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_cta: {
        Row: {
          background_image_alt: string | null
          background_image_path: string | null
          description: string
          id: number
          primary_cta_text: string
          primary_cta_url: string
          secondary_cta_text: string
          secondary_cta_url: string
          title: string
          updated_at: string
        }
        Insert: {
          background_image_alt?: string | null
          background_image_path?: string | null
          description?: string
          id?: number
          primary_cta_text?: string
          primary_cta_url?: string
          secondary_cta_text?: string
          secondary_cta_url?: string
          title?: string
          updated_at?: string
        }
        Update: {
          background_image_alt?: string | null
          background_image_path?: string | null
          description?: string
          id?: number
          primary_cta_text?: string
          primary_cta_url?: string
          secondary_cta_text?: string
          secondary_cta_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_featured_course_items: {
        Row: {
          course_id: string
          created_at: string
          featured_courses_id: number
          id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          featured_courses_id: number
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          featured_courses_id?: number
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_featured_course_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_featured_course_items_featured_courses_id_fkey"
            columns: ["featured_courses_id"]
            isOneToOne: false
            referencedRelation: "homepage_featured_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_featured_courses: {
        Row: {
          id: number
          mode: Database["public"]["Enums"]["homepage_selection_mode"]
          updated_at: string
        }
        Insert: {
          id?: number
          mode?: Database["public"]["Enums"]["homepage_selection_mode"]
          updated_at?: string
        }
        Update: {
          id?: number
          mode?: Database["public"]["Enums"]["homepage_selection_mode"]
          updated_at?: string
        }
        Relationships: []
      }
      homepage_hero: {
        Row: {
          description: string
          id: number
          image_alt: string
          image_path: string
          primary_cta_text: string
          primary_cta_url: string
          secondary_cta_text: string
          secondary_cta_url: string
          title: string
          updated_at: string
        }
        Insert: {
          description?: string
          id?: number
          image_alt?: string
          image_path?: string
          primary_cta_text?: string
          primary_cta_url?: string
          secondary_cta_text?: string
          secondary_cta_url?: string
          title?: string
          updated_at?: string
        }
        Update: {
          description?: string
          id?: number
          image_alt?: string
          image_path?: string
          primary_cta_text?: string
          primary_cta_url?: string
          secondary_cta_text?: string
          secondary_cta_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_partners: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_path: string
          name: string
          sort_order: number
          updated_at: string
          url: string | null
          visible: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_path?: string
          name: string
          sort_order?: number
          updated_at?: string
          url?: string | null
          visible?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_path?: string
          name?: string
          sort_order?: number
          updated_at?: string
          url?: string | null
          visible?: boolean
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          enabled: boolean
          section_key: Database["public"]["Enums"]["homepage_section"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          section_key: Database["public"]["Enums"]["homepage_section"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          section_key?: Database["public"]["Enums"]["homepage_section"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      homepage_statistics: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          label: string
          prefix: string | null
          sort_order: number
          suffix: string | null
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          label: string
          prefix?: string | null
          sort_order?: number
          suffix?: string | null
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
          prefix?: string | null
          sort_order?: number
          suffix?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      homepage_testimonial_items: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          testimonial_id: string
          testimonials_section_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number
          testimonial_id: string
          testimonials_section_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          testimonial_id?: string
          testimonials_section_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_testimonial_items_testimonial_id_fkey"
            columns: ["testimonial_id"]
            isOneToOne: true
            referencedRelation: "testimonials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_testimonial_items_testimonials_section_id_fkey"
            columns: ["testimonials_section_id"]
            isOneToOne: false
            referencedRelation: "homepage_testimonials"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_testimonials: {
        Row: {
          description: string
          id: number
          mode: Database["public"]["Enums"]["homepage_selection_mode"]
          title: string
          updated_at: string
        }
        Insert: {
          description?: string
          id?: number
          mode?: Database["public"]["Enums"]["homepage_selection_mode"]
          title?: string
          updated_at?: string
        }
        Update: {
          description?: string
          id?: number
          mode?: Database["public"]["Enums"]["homepage_selection_mode"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_upcoming_course: {
        Row: {
          id: number
          manual_course_id: string | null
          manual_session_id: string | null
          mode: Database["public"]["Enums"]["homepage_selection_mode"]
          updated_at: string
        }
        Insert: {
          id?: number
          manual_course_id?: string | null
          manual_session_id?: string | null
          mode?: Database["public"]["Enums"]["homepage_selection_mode"]
          updated_at?: string
        }
        Update: {
          id?: number
          manual_course_id?: string | null
          manual_session_id?: string | null
          mode?: Database["public"]["Enums"]["homepage_selection_mode"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_upcoming_course_manual_course_id_fkey"
            columns: ["manual_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_upcoming_course_manual_session_id_fkey"
            columns: ["manual_session_id"]
            isOneToOne: false
            referencedRelation: "course_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_why_us: {
        Row: {
          description: string
          id: number
          title: string
          updated_at: string
        }
        Insert: {
          description?: string
          id?: number
          title?: string
          updated_at?: string
        }
        Update: {
          description?: string
          id?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_why_us_items: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          icon_key: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          enabled?: boolean
          icon_key?: string | null
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          icon_key?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      learning_path_courses: {
        Row: {
          course_id: string
          created_at: string
          path_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          path_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          path_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_courses_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          created_at: string
          description: string
          discount_percent: number
          featured: boolean
          id: string
          image_alt: string
          image_path: string
          level: Database["public"]["Enums"]["course_level"]
          name: string
          publish_status: Database["public"]["Enums"]["publish_status"]
          short_description: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          discount_percent?: number
          featured?: boolean
          id?: string
          image_alt?: string
          image_path?: string
          level?: Database["public"]["Enums"]["course_level"]
          name: string
          publish_status?: Database["public"]["Enums"]["publish_status"]
          short_description?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          discount_percent?: number
          featured?: boolean
          id?: string
          image_alt?: string
          image_path?: string
          level?: Database["public"]["Enums"]["course_level"]
          name?: string
          publish_status?: Database["public"]["Enums"]["publish_status"]
          short_description?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_pages: {
        Row: {
          content: string
          created_at: string
          id: string
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          alt_text: string
          bucket: string
          caption: string | null
          created_at: string
          file_name: string
          height: number | null
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string
          bucket?: string
          caption?: string | null
          created_at?: string
          file_name: string
          height?: number | null
          id?: string
          mime_type: string
          size_bytes?: number
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string
          bucket?: string
          caption?: string | null
          created_at?: string
          file_name?: string
          height?: number | null
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_credentials: {
        Row: {
          deposit_approved: boolean
          encrypted_payload: string
          environment: Database["public"]["Enums"]["payment_environment"]
          merchant_approved: boolean
          provider: Database["public"]["Enums"]["payment_provider"]
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          deposit_approved?: boolean
          encrypted_payload: string
          environment: Database["public"]["Enums"]["payment_environment"]
          merchant_approved?: boolean
          provider: Database["public"]["Enums"]["payment_provider"]
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          deposit_approved?: boolean
          encrypted_payload?: string
          environment?: Database["public"]["Enums"]["payment_environment"]
          merchant_approved?: boolean
          provider?: Database["public"]["Enums"]["payment_provider"]
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          created_at: string
          display_name: string | null
          enabled: boolean
          environment: Database["public"]["Enums"]["payment_environment"]
          id: string
          provider: Database["public"]["Enums"]["payment_provider"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          enabled?: boolean
          environment?: Database["public"]["Enums"]["payment_environment"]
          id?: string
          provider: Database["public"]["Enums"]["payment_provider"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          enabled?: boolean
          environment?: Database["public"]["Enums"]["payment_environment"]
          id?: string
          provider?: Database["public"]["Enums"]["payment_provider"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: Database["public"]["Enums"]["permission_action"]
          module: Database["public"]["Enums"]["admin_module"]
        }
        Insert: {
          action: Database["public"]["Enums"]["permission_action"]
          module: Database["public"]["Enums"]["admin_module"]
        }
        Update: {
          action?: Database["public"]["Enums"]["permission_action"]
          module?: Database["public"]["Enums"]["admin_module"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          id: string
          last_active_at: string | null
          name: string
          role_id: string
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          id?: string
          last_active_at?: string | null
          name: string
          role_id: string
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          id?: string
          last_active_at?: string | null
          name?: string
          role_id?: string
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          action: Database["public"]["Enums"]["permission_action"]
          module: Database["public"]["Enums"]["admin_module"]
          role_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["permission_action"]
          module: Database["public"]["Enums"]["admin_module"]
          role_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["permission_action"]
          module?: Database["public"]["Enums"]["admin_module"]
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_module_action_fkey"
            columns: ["module", "action"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["module", "action"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string
          id: string
          key: string | null
          kind: Database["public"]["Enums"]["role_kind"]
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          key?: string | null
          kind?: Database["public"]["Enums"]["role_kind"]
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          key?: string | null
          kind?: Database["public"]["Enums"]["role_kind"]
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_settings: {
        Row: {
          bing_verification: string | null
          default_meta_description: string
          google_verification: string | null
          id: number
          index_site: boolean
          og_image_path: string
          site_title: string
          social_image_path: string
          updated_at: string
        }
        Insert: {
          bing_verification?: string | null
          default_meta_description?: string
          google_verification?: string | null
          id?: number
          index_site?: boolean
          og_image_path?: string
          site_title?: string
          social_image_path?: string
          updated_at?: string
        }
        Update: {
          bing_verification?: string | null
          default_meta_description?: string
          google_verification?: string | null
          id?: number
          index_site?: boolean
          og_image_path?: string
          site_title?: string
          social_image_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          city: string
          country: string
          currency: string
          default_language: string
          favicon_path: string
          id: number
          logo_dark_path: string
          logo_light_path: string
          site_name_ar: string
          site_name_en: string
          timezone: string
          updated_at: string
        }
        Insert: {
          city?: string
          country?: string
          currency?: string
          default_language?: string
          favicon_path?: string
          id?: number
          logo_dark_path?: string
          logo_light_path?: string
          site_name_ar?: string
          site_name_en?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          city?: string
          country?: string
          currency?: string
          default_language?: string
          favicon_path?: string
          id?: number
          logo_dark_path?: string
          logo_light_path?: string
          site_name_ar?: string
          site_name_en?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          enabled: boolean
          label: string
          platform: Database["public"]["Enums"]["social_platform"]
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          enabled?: boolean
          label?: string
          platform: Database["public"]["Enums"]["social_platform"]
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Update: {
          enabled?: boolean
          label?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          created_at: string
          featured: boolean
          id: string
          name: string
          rating: number
          review: string
          reviewed_at: string | null
          role: string | null
          source: Database["public"]["Enums"]["testimonial_source"]
          source_url: string | null
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          featured?: boolean
          id?: string
          name: string
          rating: number
          review: string
          reviewed_at?: string | null
          role?: string | null
          source?: Database["public"]["Enums"]["testimonial_source"]
          source_url?: string | null
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          featured?: boolean
          id?: string
          name?: string
          rating?: number
          review?: string
          reviewed_at?: string | null
          role?: string | null
          source?: Database["public"]["Enums"]["testimonial_source"]
          source_url?: string | null
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      trainers: {
        Row: {
          bio: string
          created_at: string
          id: string
          image_alt: string | null
          image_path: string
          instagram_url: string | null
          linkedin_url: string | null
          name: string
          short_bio: string
          skills: string[]
          specialty: string
          status: Database["public"]["Enums"]["trainer_status"]
          title: string
          updated_at: string
          website_url: string | null
          years_experience: number
        }
        Insert: {
          bio?: string
          created_at?: string
          id?: string
          image_alt?: string | null
          image_path?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          name: string
          short_bio?: string
          skills?: string[]
          specialty?: string
          status?: Database["public"]["Enums"]["trainer_status"]
          title: string
          updated_at?: string
          website_url?: string | null
          years_experience?: number
        }
        Update: {
          bio?: string
          created_at?: string
          id?: string
          image_alt?: string | null
          image_path?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          name?: string
          short_bio?: string
          skills?: string[]
          specialty?: string
          status?: Database["public"]["Enums"]["trainer_status"]
          title?: string
          updated_at?: string
          website_url?: string | null
          years_experience?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      save_course_atomic: {
        Args: {
          p_course: Json
          p_course_id: string
          p_curriculum?: Json
          p_sessions?: Json
        }
        Returns: string
      }
    }
    Enums: {
      admin_module:
        | "dashboard"
        | "courses"
        | "sessions"
        | "trainers"
        | "paths"
        | "homepage"
        | "testimonials"
        | "blog"
        | "corporate-requests"
        | "media"
        | "legal"
        | "settings"
        | "payments"
        | "users"
        | "roles"
        | "community"
      blog_block_type: "paragraph" | "heading" | "image" | "quote" | "list"
      corporate_request_event:
        | "request-created"
        | "status-changed"
        | "note-added"
      course_category:
        | "in-person-individuals"
        | "in-person-corporates"
        | "online"
        | "private"
      course_level: "beginner" | "intermediate" | "advanced" | "all-levels"
      course_operational_status:
        | "coming-soon"
        | "registration-open"
        | "full"
        | "completed"
      course_publish_status: "draft" | "published"
      footer_link_group: "quick" | "legal" | "social"
      homepage_section:
        | "hero"
        | "statistics"
        | "upcoming-course"
        | "course-categories"
        | "featured-courses"
        | "why-us"
        | "accreditations"
        | "partners"
        | "testimonials"
        | "cta"
      homepage_selection_mode: "automatic" | "manual"
      payment_environment: "test" | "production"
      payment_provider: "moyasar" | "tabby" | "tamara"
      permission_action:
        | "view"
        | "create"
        | "edit"
        | "delete"
        | "publish"
        | "manage"
      publish_status: "draft" | "published"
      request_status:
        | "new"
        | "contacted"
        | "preparing-offer"
        | "offer-sent"
        | "agreed"
        | "closed"
      role_kind: "system" | "custom"
      session_status: "upcoming" | "open" | "full" | "closed" | "completed"
      social_platform:
        | "instagram"
        | "tiktok"
        | "snapchat"
        | "x"
        | "youtube"
        | "facebook"
        | "linkedin"
        | "telegram"
        | "pinterest"
        | "threads"
        | "behance"
        | "whatsapp"
        | "email"
        | "website"
      testimonial_source: "google" | "manual"
      trainer_status: "active" | "hidden"
      user_status: "active" | "invited" | "suspended"
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
      admin_module: [
        "dashboard",
        "courses",
        "sessions",
        "trainers",
        "paths",
        "homepage",
        "testimonials",
        "blog",
        "corporate-requests",
        "media",
        "legal",
        "settings",
        "payments",
        "users",
        "roles",
        "community",
      ],
      blog_block_type: ["paragraph", "heading", "image", "quote", "list"],
      corporate_request_event: [
        "request-created",
        "status-changed",
        "note-added",
      ],
      course_category: [
        "in-person-individuals",
        "in-person-corporates",
        "online",
        "private",
      ],
      course_level: ["beginner", "intermediate", "advanced", "all-levels"],
      course_operational_status: [
        "coming-soon",
        "registration-open",
        "full",
        "completed",
      ],
      course_publish_status: ["draft", "published"],
      footer_link_group: ["quick", "legal", "social"],
      homepage_section: [
        "hero",
        "statistics",
        "upcoming-course",
        "course-categories",
        "featured-courses",
        "why-us",
        "accreditations",
        "partners",
        "testimonials",
        "cta",
      ],
      homepage_selection_mode: ["automatic", "manual"],
      payment_environment: ["test", "production"],
      payment_provider: ["moyasar", "tabby", "tamara"],
      permission_action: [
        "view",
        "create",
        "edit",
        "delete",
        "publish",
        "manage",
      ],
      publish_status: ["draft", "published"],
      request_status: [
        "new",
        "contacted",
        "preparing-offer",
        "offer-sent",
        "agreed",
        "closed",
      ],
      role_kind: ["system", "custom"],
      session_status: ["upcoming", "open", "full", "closed", "completed"],
      social_platform: [
        "instagram",
        "tiktok",
        "snapchat",
        "x",
        "youtube",
        "facebook",
        "linkedin",
        "telegram",
        "pinterest",
        "threads",
        "behance",
        "whatsapp",
        "email",
        "website",
      ],
      testimonial_source: ["google", "manual"],
      trainer_status: ["active", "hidden"],
      user_status: ["active", "invited", "suspended"],
    },
  },
} as const
