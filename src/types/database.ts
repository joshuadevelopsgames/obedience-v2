// Core types matching Supabase schema

export type UserRole = 'mistress' | 'slave'
export type TonePreference = 'strict' | 'nurturing' | 'playful' | 'cold'
export type AutopilotMode = 'light' | 'full' | 'custom'
export type TaskCategory = 'service' | 'obedience' | 'training' | 'self_care' | 'creative' | 'endurance' | 'protocol'
export type TaskStatus = 'suggested' | 'assigned' | 'in_progress' | 'proof_submitted' | 'approved' | 'rejected' | 'completed' | 'expired'
export type ProofType = 'photo' | 'video' | 'text' | 'checkin' | 'location'
export type ProofStatus = 'pending' | 'approved' | 'rejected'
export type PairStatus = 'active' | 'paused' | 'ended'
export type SafeWordState = 'green' | 'yellow' | 'red'
export type RedemptionStatus = 'pending' | 'approved' | 'fulfilled' | 'denied'
export type PunishmentStatus = 'suggested' | 'assigned' | 'in_progress' | 'completed'
export type LimitCategory = 'hard' | 'soft' | 'curiosity'
export type AiGenerationType = 'task' | 'punishment' | 'reward' | 'journal_prompt' | 'ritual' | 'aftercare' | 'contract' | 'analysis'
export type BehaviorType = 'positive' | 'negative' | 'neutral'
export type PermissionStatus = 'pending' | 'approved' | 'denied'
export type MessageType = 'text' | 'voice' | 'image' | 'system'

export interface Profile {
  id: string
  role: UserRole
  display_name: string | null
  collar_name: string | null
  title: string | null
  avatar_url: string | null
  banner_url: string | null
  tone_preference: TonePreference
  level: number
  xp: number
  streak_current: number
  streak_best: number
  paired_with: string | null
  autopilot: boolean
  autopilot_mode: AutopilotMode
  onboarded: boolean
  created_at: string
  updated_at: string
}

export interface Pair {
  id: string
  mistress_id: string
  slave_id: string
  status: PairStatus
  safe_word_state: SafeWordState
  safe_word_at: string | null
  cooldown_until: string | null
  created_at: string
}

export interface Task {
  id: string
  pair_id: string
  created_by: string | null
  assigned_to: string | null
  title: string
  description: string | null
  category: TaskCategory
  difficulty: number
  xp_reward: number
  status: TaskStatus
  proof_type: ProofType
  due_at: string | null
  ai_generated: boolean
  ai_context: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface Proof {
  id: string
  task_id: string
  submitted_by: string
  proof_type: ProofType
  content_url: string | null
  text_content: string | null
  status: ProofStatus
  reviewer_note: string | null
  reviewed_at: string | null
  created_at: string
}

export interface Reward {
  id: string
  pair_id: string
  title: string
  description: string | null
  xp_cost: number
  available: boolean
  ai_generated: boolean
  created_at: string
}

export interface Punishment {
  id: string
  pair_id: string
  task_id: string | null
  title: string
  description: string | null
  severity: number
  status: PunishmentStatus
  ai_generated: boolean
  aftercare_sent: boolean
  created_at: string
  completed_at: string | null
}

export interface Ritual {
  id: string
  pair_id: string
  title: string
  description: string | null
  schedule: string | null
  steps: { order: number; instruction: string; duration_seconds: number; proof_required: boolean }[]
  active: boolean
  ai_generated: boolean
  created_at: string
}

export interface JournalEntry {
  id: string
  pair_id: string
  author_id: string
  prompt: string | null
  content: string
  is_private: boolean
  mistress_note: string | null
  mistress_emoji: string | null
  ai_generated_prompt: boolean
  created_at: string
}

export interface MoodCheckin {
  id: string
  pair_id: string
  user_id: string
  mood: number
  emoji: string | null
  note: string | null
  created_at: string
}

export interface Message {
  id: string
  pair_id: string
  sender_id: string
  content: string
  message_type: MessageType
  media_url: string | null
  read_at: string | null
  created_at: string
}

export interface Contract {
  id: string
  pair_id: string
  version: number
  content: {
    hard_limits?: string[]
    soft_limits?: string[]
    curiosities?: string[]
    expectations?: string[]
    rules?: string[]
  }
  mistress_signed: boolean
  slave_signed: boolean
  signed_at: string | null
  review_interval: string
  next_review: string | null
  created_at: string
}

export interface Achievement {
  id: string
  slug: string
  title: string
  description: string | null
  icon: string | null
  secret: boolean
  condition: Record<string, unknown> | null
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  read: boolean
  created_at: string
}
