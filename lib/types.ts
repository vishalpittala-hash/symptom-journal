export interface Message {
  id: string
  text: string
  sender: 'user' | 'ai'
  timestamp: Date
}

export interface HealthEntry {
  id?: string
  symptom: string
  severity: number // 1-5 scale
  bodyPart?: string
  notes?: string
  sleepHours?: number
  stressLevel?: number // 1-5 scale
  weather?: string
  medications?: string[]
  triggers?: string[]
  timestamp?: string
  created_at?: string
  user_email?: string
  aiDiscussion?: Message[]
}

export interface Toast {
  message: string
  type: "success" | "error"
}

export interface CorrelationInsight {
  factor: 'sleep' | 'weather' | 'stress' | 'medication' | 'time_of_day'
  correlation: number // -1 to 1
  confidence: number // 0-1
  insight: string
  recommendation: string
}

export interface UserProfile {
  id: string
  email: string
  name?: string
  preferences?: {
    darkMode: boolean
    notifications: boolean
    units: 'metric' | 'imperial'
  }
}

export interface BodyPart {
  id: string
  label: string
  icon: string
}

export interface SeverityColors {
  [key: string]: string
}
