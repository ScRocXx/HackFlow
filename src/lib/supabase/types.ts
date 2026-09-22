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
  source_platform: string
  mode: 'online' | 'in-person' | 'hybrid'
  location: string | null
  banner_url: string | null
  prize_pool: string | null
  overview: string | null
  eligibility: string | null
  team_size_min: number | null
  team_size_max: number | null
  status: 'bookmarked' | 'registered' | 'building' | 'submitted' | 'under_review' | 'finalist' | 'winner' | 'runner_up' | 'participated' | 'archived'
  active_stage_id: string | null
  meet_url?: string | null
  submission_receipt?: string | null
  submission_notes?: string | null
  result_date?: string | null
  prize_details?: string | null
  retro_notes?: string | null
  demo_url?: string | null
  github_repo_url?: string | null
  pitch_deck_url?: string | null
  squad_id?: string | null
  prize_cash_pool?: string | null
  prize_first_place?: string | null
  has_perks_or_credits?: boolean | null
  raw_prize_text?: string | null
  prize_display_summary?: string | null
  created_at: string
  updated_at: string
}

export interface EventStage {
  id: string
  event_id: string
  round_number: number
  title: string
  stage_type: 'quiz' | 'ppt_submission' | 'prototype' | 'hackathon_sprint' | 'presentation' | 'other'
  deadline: string | null
  window_start?: string | null
  window_end?: string | null
  actionable_deadline?: string | null
  raw_date_snippet?: string | null
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

export interface EventProblemStatement {
  id: string
  event_id: string
  title: string
  description: string | null
  category: string | null
  is_chosen: boolean
  solution_bullets: string[]
  created_at: string
}

export interface TeamVaultProfile {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string | null
  college: string | null
  roll_number: string | null
  github_url: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  resume_url: string | null
  created_at?: string
  has_vault_profile?: boolean
  is_complete?: boolean
  role?: 'leader' | 'member'
  avatar_url?: string | null
}

export interface SquadScratchpad {
  squad_id: string
  meet_url?: string | null
  chat_channel_url?: string | null
  staging_url?: string | null
  test_credentials?: string | null
  notes?: string | null
  updated_by?: string | null
  updated_at?: string
  editor_profile?: Profile
}

export interface TeamVaultAsset {
  id: string
  title: string
  asset_type: 'pitch_deck' | 'figma_kit' | 'boilerplate' | 'diagram' | 'other'
  url: string
  description: string | null
  tags: string[]
  created_by: string | null
  squad_id?: string | null
  created_at: string
}

export interface Friendship {
  id: string
  sender_id: string
  receiver_email: string
  receiver_id: string | null
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  updated_at: string
  friend_profile?: Profile
  sender_profile?: Profile
  receiver_profile?: Profile
}

export interface Squad {
  id: string
  name: string
  created_by: string
  created_at: string
  members?: SquadMember[]
  member_count?: number
}

export interface SquadMember {
  id: string
  squad_id: string
  user_id: string
  role: 'leader' | 'member'
  joined_at: string
  profile?: Profile
}

export interface EventParticipant {
  id: string
  event_id: string
  user_id: string
  role: 'lead' | 'collaborator'
  joined_at: string
  profile?: Profile
}

export interface Database {
  public: {
    Tables: {
      friendships: {
        Row: Friendship
        Insert: Omit<Friendship, 'id' | 'created_at' | 'updated_at' | 'friend_profile' | 'sender_profile' | 'receiver_profile'> & {
          id?: string
          receiver_id?: string | null
          status?: 'pending' | 'accepted' | 'declined'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Friendship, 'id'>>
      }
      squads: {
        Row: Squad
        Insert: Omit<Squad, 'id' | 'created_at' | 'members' | 'member_count'> & { id?: string, created_at?: string }
        Update: Partial<Omit<Squad, 'id'>>
      }
      squad_members: {
        Row: SquadMember
        Insert: Omit<SquadMember, 'id' | 'joined_at' | 'profile'> & { id?: string, role?: 'leader' | 'member', joined_at?: string }
        Update: Partial<Omit<SquadMember, 'id' | 'squad_id' | 'user_id'>>
      }
      event_participants: {
        Row: EventParticipant
        Insert: Omit<EventParticipant, 'id' | 'joined_at' | 'profile'> & { id?: string, role?: 'lead' | 'collaborator', joined_at?: string }
        Update: Partial<Omit<EventParticipant, 'id' | 'event_id' | 'user_id'>>
      }
      event_problem_statements: {
        Row: EventProblemStatement
        Insert: Omit<EventProblemStatement, 'id' | 'created_at'> & { id?: string, created_at?: string }
        Update: Partial<Omit<EventProblemStatement, 'id' | 'event_id'>>
      }
      team_vault_profiles: {
        Row: TeamVaultProfile
        Insert: Omit<TeamVaultProfile, 'id' | 'created_at'> & { id?: string, created_at?: string }
        Update: Partial<Omit<TeamVaultProfile, 'id' | 'user_id'>>
      }
      team_vault_assets: {
        Row: TeamVaultAsset
        Insert: Omit<TeamVaultAsset, 'id' | 'created_at'> & { id?: string, created_at?: string, squad_id?: string | null }
        Update: Partial<Omit<TeamVaultAsset, 'id'>>
      }
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
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'> & { id?: string, created_at?: string, updated_at?: string, squad_id?: string | null }
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
      },
      squad_scratchpads: {
        Row: SquadScratchpad
        Insert: Omit<SquadScratchpad, 'updated_at' | 'editor_profile'> & { updated_at?: string }
        Update: Partial<Omit<SquadScratchpad, 'squad_id'>>
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
