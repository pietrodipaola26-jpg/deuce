export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      game_players: {
        Row: {
          attendance: Database["public"]["Enums"]["attendance"]
          game_id: string
          is_host: boolean
          joined_at: string
          player_id: string
        }
        Insert: {
          attendance?: Database["public"]["Enums"]["attendance"]
          game_id: string
          is_host?: boolean
          joined_at?: string
          player_id: string
        }
        Update: {
          attendance?: Database["public"]["Enums"]["attendance"]
          game_id?: string
          is_host?: boolean
          joined_at?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "game_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          cancelled_at: string | null
          cancelled_reason: string | null
          created_at: string
          host_id: string
          id: string
          indoor: boolean
          level_max: number
          level_min: number
          minutes: number
          note: string | null
          price_cents: number
          provides: string[]
          sport: Database["public"]["Enums"]["sport"]
          spots: number
          starts_at: string
          status: Database["public"]["Enums"]["game_status"]
          surface: Database["public"]["Enums"]["surface"]
          taken: number
          updated_at: string
          venue_id: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          host_id: string
          id?: string
          indoor?: boolean
          level_max: number
          level_min: number
          minutes: number
          note?: string | null
          price_cents: number
          provides?: string[]
          sport: Database["public"]["Enums"]["sport"]
          spots: number
          starts_at: string
          status?: Database["public"]["Enums"]["game_status"]
          surface: Database["public"]["Enums"]["surface"]
          taken?: number
          updated_at?: string
          venue_id: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          host_id?: string
          id?: string
          indoor?: boolean
          level_max?: number
          level_min?: number
          minutes?: number
          note?: string | null
          price_cents?: number
          provides?: string[]
          sport?: Database["public"]["Enums"]["sport"]
          spots?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["game_status"]
          surface?: Database["public"]["Enums"]["surface"]
          taken?: number
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "games_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          game_id: string
          id: string
          is_system: boolean
          sender_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          game_id: string
          id?: string
          is_system?: boolean
          sender_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          game_id?: string
          id?: string
          is_system?: boolean
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string
          created_at: string
          game_id: string | null
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          read_at: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body: string
          created_at?: string
          game_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          read_at?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          created_at?: string
          game_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_confirmed_at: string | null
          bio: string | null
          created_at: string
          first_name: string | null
          id: string
          is_moderator: boolean
          languages: string[]
          last_initial: string | null
          onboarded_at: string | null
          padel_level: number | null
          programme: string | null
          study_year: string | null
          tennis_level: number | null
          terms_accepted_at: string | null
          tint: number
          updated_at: string
        }
        Insert: {
          age_confirmed_at?: string | null
          bio?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          is_moderator?: boolean
          languages?: string[]
          last_initial?: string | null
          onboarded_at?: string | null
          padel_level?: number | null
          programme?: string | null
          study_year?: string | null
          tennis_level?: number | null
          terms_accepted_at?: string | null
          tint?: number
          updated_at?: string
        }
        Update: {
          age_confirmed_at?: string | null
          bio?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          is_moderator?: boolean
          languages?: string[]
          last_initial?: string | null
          onboarded_at?: string | null
          padel_level?: number | null
          programme?: string | null
          study_year?: string | null
          tennis_level?: number | null
          terms_accepted_at?: string | null
          tint?: number
          updated_at?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string
          game_id: string
          ratee_id: string
          rater_id: string
          signal: Database["public"]["Enums"]["level_signal"]
          stars: number
        }
        Insert: {
          created_at?: string
          game_id: string
          ratee_id: string
          rater_id: string
          signal?: Database["public"]["Enums"]["level_signal"]
          stars: number
        }
        Update: {
          created_at?: string
          game_id?: string
          ratee_id?: string
          rater_id?: string
          signal?: Database["public"]["Enums"]["level_signal"]
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_ratee_id_fkey"
            columns: ["ratee_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "ratings_ratee_id_fkey"
            columns: ["ratee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          detail: string | null
          game_id: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          subject_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          game_id?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          subject_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          game_id?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "reports_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          area: string
          city: string
          created_at: string
          created_by: string | null
          id: string
          indoor: boolean
          is_active: boolean
          is_verified: boolean
          name: string
          surface: Database["public"]["Enums"]["surface"]
          travel: string | null
        }
        Insert: {
          area: string
          city?: string
          created_at?: string
          created_by?: string | null
          id?: string
          indoor?: boolean
          is_active?: boolean
          is_verified?: boolean
          name: string
          surface: Database["public"]["Enums"]["surface"]
          travel?: string | null
        }
        Update: {
          area?: string
          city?: string
          created_at?: string
          created_by?: string | null
          id?: string
          indoor?: boolean
          is_active?: boolean
          is_verified?: boolean
          name?: string
          surface?: Database["public"]["Enums"]["surface"]
          travel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "player_stats"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "venues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      player_stats: {
        Row: {
          games_played: number | null
          no_shows: number | null
          player_id: string | null
          rating: number | null
          rating_count: number | null
          reliability: number | null
          reports: number | null
        }
        Insert: {
          games_played?: never
          no_shows?: never
          player_id?: string | null
          rating?: never
          rating_count?: never
          reliability?: never
          reports?: never
        }
        Update: {
          games_played?: never
          no_shows?: never
          player_id?: string | null
          rating?: never
          rating_count?: never
          reliability?: never
          reports?: never
        }
        Relationships: []
      }
    }
    Functions: {
      cancel_game: {
        Args: { p_game_id: string; p_reason?: string }
        Returns: undefined
      }
      game_has_ended: { Args: { target: string }; Returns: boolean }
      is_eligible_email: { Args: { addr: string }; Returns: boolean }
      is_in_game: { Args: { target: string }; Returns: boolean }
      is_member: { Args: never; Returns: boolean }
      is_moderator: { Args: never; Returns: boolean }
      join_game: { Args: { p_game_id: string }; Returns: undefined }
      leave_game: { Args: { p_game_id: string }; Returns: undefined }
      mark_attendance: {
        Args: {
          p_game_id: string
          p_player_id: string
          p_state: Database["public"]["Enums"]["attendance"]
        }
        Returns: undefined
      }
      rate_player: {
        Args: {
          p_game_id: string
          p_ratee_id: string
          p_signal?: Database["public"]["Enums"]["level_signal"]
          p_stars: number
        }
        Returns: undefined
      }
    }
    Enums: {
      attendance: "unknown" | "played" | "no_show"
      game_status: "open" | "full" | "cancelled"
      level_signal: "too_low" | "about_right" | "too_high"
      notification_kind:
        | "game_joined"
        | "game_left"
        | "game_cancelled"
        | "game_message"
        | "game_full"
        | "rating_received"
      report_reason: "no_show" | "conduct" | "safety" | "spam" | "other"
      report_status: "open" | "actioned" | "dismissed"
      sport: "tennis" | "padel"
      surface: "clay" | "hard" | "padel" | "grass"
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
      attendance: ["unknown", "played", "no_show"],
      game_status: ["open", "full", "cancelled"],
      level_signal: ["too_low", "about_right", "too_high"],
      notification_kind: [
        "game_joined",
        "game_left",
        "game_cancelled",
        "game_message",
        "game_full",
        "rating_received",
      ],
      report_reason: ["no_show", "conduct", "safety", "spam", "other"],
      report_status: ["open", "actioned", "dismissed"],
      sport: ["tennis", "padel"],
      surface: ["clay", "hard", "padel", "grass"],
    },
  },
} as const

