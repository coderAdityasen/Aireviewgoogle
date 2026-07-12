export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProfileRole = "admin" | "business_owner";
export type AccountStatus = "active" | "suspended";
export type AnalyticsEventType =
  | "qr_scan"
  | "page_view"
  | "feedback_started"
  | "feedback_completed"
  | "review_generated"
  | "review_edited"
  | "review_copied"
  | "google_redirect_clicked"
  | "private_feedback_submitted";

type DbRecord = Record<string, unknown>;
type NoUpdate = Record<string, never>;

export interface Profile extends DbRecord {
  id: string;
  full_name: string | null;
  role: ProfileRole;
  avatar_url: string | null;
  account_status: AccountStatus;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Business extends DbRecord {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  services: Json;
  phone: string | null;
  email: string | null;
  website: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  logo_url: string | null;
  brand_color: string;
  google_review_url: string;
  default_language: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QrCampaign extends DbRecord {
  id: string;
  business_id: string;
  name: string;
  public_token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisitorSession extends DbRecord {
  id: string;
  business_id: string;
  qr_campaign_id: string | null;
  anonymous_session_id: string;
  ip_hash: string | null;
  user_agent: string | null;
  device_type: string | null;
  referrer: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

export interface CustomerFeedback extends DbRecord {
  id: string;
  business_id: string;
  qr_campaign_id: string | null;
  visitor_session_id: string | null;
  rating: number;
  answers: Json;
  original_notes: string | null;
  generated_draft: string | null;
  final_edited_text: string | null;
  preferred_language: string;
  review_length: "short" | "standard" | "detailed";
  submitted_privately: boolean;
  consent_confirmed: boolean;
  created_at: string;
}

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<
  Row extends DbRecord,
  Insert extends DbRecord = Partial<Row>,
  Update extends DbRecord = Partial<Row>,
  Relationships extends Relationship[] = []
> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile> & { id: string }, Partial<Profile>>;
      businesses: Table<
        Business,
        Omit<Business, "id" | "created_at" | "updated_at"> & { id?: string },
        Partial<Business>,
        [
          {
            foreignKeyName: "businesses_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ]
      >;
      qr_campaigns: Table<
        QrCampaign,
        Omit<QrCampaign, "id" | "public_token" | "created_at" | "updated_at"> & {
          id?: string;
          public_token?: string;
        },
        Partial<QrCampaign>
      >;
      visitor_sessions: Table<
        VisitorSession,
        Omit<VisitorSession, "id" | "first_seen_at" | "last_seen_at"> & {
          id?: string;
          first_seen_at?: string;
          last_seen_at?: string;
        },
        Partial<VisitorSession>,
        [
          {
            foreignKeyName: "visitor_sessions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          }
        ]
      >;
      analytics_events: Table<
        {
          id: string;
          business_id: string;
          qr_campaign_id: string | null;
          visitor_session_id: string | null;
          event_type: AnalyticsEventType;
          metadata: Json;
          created_at: string;
        },
        {
          id?: string;
          business_id: string;
          qr_campaign_id?: string | null;
          visitor_session_id?: string | null;
          event_type: AnalyticsEventType;
          metadata?: Json;
          created_at?: string;
        },
        NoUpdate,
        [
          {
            foreignKeyName: "analytics_events_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          }
        ]
      >;
      customer_feedback: Table<
        CustomerFeedback,
        Omit<CustomerFeedback, "id" | "created_at"> & { id?: string; created_at?: string },
        Partial<CustomerFeedback>,
        [
          {
            foreignKeyName: "customer_feedback_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          }
        ]
      >;
      ai_usage_logs: Table<
        {
          id: string;
          business_id: string;
          feedback_id: string | null;
          provider: string;
          model: string;
          input_tokens: number;
          output_tokens: number;
          estimated_cost: number;
          status: "success" | "blocked" | "error";
          error_message: string | null;
          created_at: string;
        },
        {
          id?: string;
          business_id: string;
          feedback_id?: string | null;
          provider: string;
          model: string;
          input_tokens?: number;
          output_tokens?: number;
          estimated_cost?: number;
          status: "success" | "blocked" | "error";
          error_message?: string | null;
          created_at?: string;
        },
        NoUpdate,
        [
          {
            foreignKeyName: "ai_usage_logs_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          }
        ]
      >;
      audit_logs: Table<
        {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        },
        {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        },
        NoUpdate
      >;
      platform_settings: Table<
        {
          id: string;
          setting_key: string;
          setting_value: Json;
          updated_by: string | null;
          updated_at: string;
        },
        {
          id?: string;
          setting_key: string;
          setting_value: Json;
          updated_by?: string | null;
          updated_at?: string;
        },
        { setting_value?: Json; updated_by?: string | null; updated_at?: string }
      >;
      rate_limit_events: Table<
        {
          id: string;
          scope: string;
          subject_hash: string;
          business_id: string | null;
          qr_campaign_id: string | null;
          created_at: string;
        },
        {
          id?: string;
          scope: string;
          subject_hash: string;
          business_id?: string | null;
          qr_campaign_id?: string | null;
          created_at?: string;
        },
        NoUpdate
      >;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      owns_business: { Args: { business_id: string }; Returns: boolean };
      can_access_campaign: { Args: { campaign_id: string }; Returns: boolean };
      slugify: { Args: { input: string }; Returns: string };
    };
  };
};
