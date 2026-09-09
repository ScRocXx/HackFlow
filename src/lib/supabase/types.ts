export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Event {
  id: string
  created_by: string
  title: string
  organizer: string | null
  source_url: string | null
  source_platform: 'unstop' | 'devfolio' | 'devpost' | 'mlh' | 'hackerearth' | 'custom'
  mode: 'online' | 'in-person' | 'hybrid'
  location: string | null
  banner_url: string | null
  prize_pool: string | null
  overview: string | null
  eligibility: string | null
  team_size_min: number | null
  team_size_max: number | null
  status: 'bookmarked' | 'registered' | 'building' | 'submitted'
  active_stage_id: string | null
  created_at: string
  updated_at: string
}

export interface EventStage {
  id: string
  event_id: string
  round_number: number
  title: string
  stage_type: 'quiz' | 'ppt_submission' | 'prototype' | 'presentation' | 'other'
  deadline: string | null
  evaluation_format: string | null
  deliverables_description: string | null
  is_completed: boolean
  completed_at: string | null
  created_at: string
}

export interface StageDeliverable {
  id: string
  stage_id: string
  title: string
  is_done: boolean
  done_by: string | null
  done_at: string | null
  sort_order: number
  created_at: string
}

export interface TeamMember {
  id: string
  event_id: string
  user_id: string | null
  email: string
  role: 'owner' | 'member'
  invited_at: string
  joined_at: string | null
}

export interface NotificationLog {
  id: string
  stage_id: string
  interval_key: '7d' | '3d' | '24h' | '6h'
  channel: 'email' | 'in_app'
  sent_at: string
  recipient_email: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  link: string | null
  read: boolean
  created_at: string
}

export interface EventResource {
  id: string
  event_id: string
  title: string
  url: string
  resource_type: 'problem_statement' | 'rulebook' | 'template' | 'dataset' | 'reference' | 'other'
  is_official: boolean
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      event_resources: {
        Row: EventResource
        Insert: Omit<EventResource, 'id' | 'created_at'> & { id?: string, created_at?: string, is_official?: boolean }
        Update: Partial<Omit<EventResource, 'id' | 'event_id'>>
      }
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'> & { created_at?: string }
        Update: Partial<Omit<Profile, 'id'>>
      }
      events: {
        Row: Event
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'> & { id?: string, created_at?: string, updated_at?: string }
        Update: Partial<Omit<Event, 'id' | 'created_by'>>
      }
      event_stages: {
        Row: EventStage
        Insert: Omit<EventStage, 'id' | 'created_at'> & { id?: string, created_at?: string }
        Update: Partial<Omit<EventStage, 'id' | 'event_id'>>
      }
      stage_deliverables: {
        Row: StageDeliverable
        Insert: Omit<StageDeliverable, 'id' | 'created_at'> & { id?: string, created_at?: string }
        Update: Partial<Omit<StageDeliverable, 'id' | 'stage_id'>>
      }
      team_members: {
        Row: TeamMember
        Insert: Omit<TeamMember, 'id' | 'invited_at'> & { id?: string, invited_at?: string }
        Update: Partial<Omit<TeamMember, 'id' | 'event_id'>>
      }
      notification_logs: {
        Row: NotificationLog
        Insert: Omit<NotificationLog, 'id' | 'sent_at'> & { id?: string, sent_at?: string }
        Update: Partial<Omit<NotificationLog, 'id' | 'stage_id'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'> & { id?: string, created_at?: string }
        Update: Partial<Omit<Notification, 'id' | 'user_id'>>
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
