"use client"

import { useState, useEffect } from "react"
import { HealthEntry, Toast, BodyPart, Message } from "../lib/types"
import { getCurrentWeather, getWeatherEmoji } from "../lib/weather"

interface SymptomFormProps {
  onSave: (entry: Omit<HealthEntry, 'user_email' | 'created_at'>) => Promise<void>
  loading: boolean
}

interface UserProfile {
  age?: number
  gender?: string
  conditions?: string
  activityLevel?: string
}

const BODY_PARTS: BodyPart[] = [
  { id: "head",    label: "Head",    icon: "🧠" },
  { id: "chest",   label: "Chest",   icon: "🫁" },
  { id: "stomach", label: "Stomach", icon: "🫃" },
  { id: "limbs",   label: "Limbs",   icon: "🦵" },
  { id: "skin",    label: "Skin",    icon: "🩹" },
  { id: "general", label: "General", icon: "🌡️" },
]

const SEVERITY_COLORS: Record<string, string> = {
  Mild:     "#1D9E75",
  Moderate: "#EF9F27",
  Severe:   "#E24B4A",
}

const QUICK_LOG_SYMPTOMS = [
  { symptom: "Headache", bodyPart: "head", severity: "Moderate", icon: "🤕" },
  { symptom: "Stomach pain", bodyPart: "stomach", severity: "Mild", icon: "🫃" },
  { symptom: "Back pain", bodyPart: "limbs", severity: "Moderate", icon: "🦵" },
  { symptom: "Fatigue", bodyPart: "general", severity: "Mild", icon: "😴" },
  { symptom: "Nausea", bodyPart: "general", severity: "Mild", icon: "🤢" },
  { symptom: "Fever", bodyPart: "general", severity: "Moderate", icon: "🌡️" },
]

const COMMON_MEDICATIONS = [
  "Paracetamol",
  "Ibuprofen",
  "Aspirin",
  "Antihistamine",
  "Antacid",
  "Vitamin C",
  "Multivitamin",
]

const COMMON_SYMPTOMS = [
  "Headache",
  "Migraine",
  "Stomach pain",
  "Nausea",
  "Back pain",
  "Neck pain",
  "Joint pain",
  "Muscle pain",
  "Fatigue",
  "Dizziness",
  "Fever",
  "Chills",
  "Cough",
  "Sore throat",
  "Congestion",
  "Runny nose",
  "Chest pain",
  "Shortness of breath",
  "Heartburn",
  "Indigestion",
  "Bloating",
  "Constipation",
  "Diarrhea",
  "Skin rash",
  "Itching",
  "Swelling",
  "Anxiety",
  "Depression",
  "Insomnia",
]

export default function SymptomForm({ onSave, loading }: SymptomFormProps) {
  const [symptom, setSymptom] = useState("")
  const [severity, setSeverity] = useState("")
  const [bodyPart, setBodyPart] = useState("")
  const [notes, setNotes] = useState("")
  const [sleepHours, setSleepHours] = useState("")
  const [stressLevel, setStressLevel] = useState("")
  const [weather, setWeather] = useState("")
  const [medications, setMedications] = useState("")
  const [aiAnalysis, setAiAnalysis] = useState("")
  const [aiQuestion, setAiQuestion] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentWeather, setCurrentWeather] = useState<{ temp: number; condition: string; emoji: string } | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile>({})
  const [isListening, setIsListening] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [currentSymptomContext, setCurrentSymptomContext] = useState<any>(null)
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({})

  // Persist conversation to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('symptomConversation', JSON.stringify(messages))
    }
  }, [messages])

  useEffect(() => {
    if (aiAnalysis) {
      localStorage.setItem('symptomAnalysis', aiAnalysis)
    }
  }, [aiAnalysis])

  // Load conversation and context from localStorage on mount
  useEffect(() => {
    // Ensure we're on the client side before accessing localStorage
    if (typeof window === 'undefined') return
    
    const savedConversation = localStorage.getItem('symptomConversation')
    const savedAnalysis = localStorage.getItem('symptomAnalysis')
    const savedContext = localStorage.getItem('symptomContext')
    const savedFollowUp = localStorage.getItem('followUpMessage')
    const savedProfile = localStorage.getItem('symptomProfile')
    
    let loadedMessages: Message[] = []
    
    if (savedConversation) {
      loadedMessages = JSON.parse(savedConversation)
      setMessages(loadedMessages)
    }
    if (savedAnalysis) {
      setAiAnalysis(savedAnalysis)
    }
    
    // Load user profile
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile)
        setUserProfile(profile)
        setProfileLoaded(true)
      } catch (error) {
        console.error("Error loading profile:", error)
      }
    } else {
      setProfileLoaded(false)
    }
    
    // Load symptom context if available (from history continue chat)
    if (savedContext) {
      const context = JSON.parse(savedContext)
      if (context.symptom) setSymptom(context.symptom)
      if (context.severity) {
        setSeverity(context.severity === 1 ? 'Mild' : context.severity === 3 ? 'Moderate' : 'Severe')
      }
      if (context.bodyPart) setBodyPart(context.bodyPart)
      if (context.notes) setNotes(context.notes)
      if (context.sleepHours) setSleepHours(context.sleepHours.toString())
      if (context.stressLevel) setStressLevel(context.stressLevel.toString())
      if (context.weather) setWeather(context.weather)
      if (context.medications) setMedications(context.medications.join(', '))
      
      // Clear the context after loading so it doesn't persist on next mount
      localStorage.removeItem('symptomContext')
      
      // Generate analysis from the loaded context
      if (context.symptom && context.severity) {
        const severityLabel = context.severity === 1 ? 'Mild' : context.severity === 3 ? 'Moderate' : 'Severe'
        setAiAnalysis(`🧠 **Possible Cause**
• ${context.symptom} detected
• ${severityLabel} intensity - ${context.severity >= 4 ? 'may require medical attention' : 'monitor for changes'}
${context.bodyPart ? `• Affected area: ${context.bodyPart} region` : ''}
${context.sleepHours ? `• Sleep: ${context.sleepHours} hours - ${parseFloat(context.sleepHours) < 6 ? 'may contribute to symptoms' : 'adequate rest'}` : ''}
${context.stressLevel ? `• Stress: Level ${context.stressLevel}/5 - ${context.stressLevel >= 4 ? 'may worsen symptoms' : 'manageable levels'}` : ''}

💊 **What you can do**
• Rest and stay hydrated
• Monitor symptoms for 24-48 hours
• Track patterns and triggers
• Consider over-the-counter relief if appropriate
• Maintain regular sleep schedule
• Practice stress management techniques

⚠️ **When to worry**
• Symptoms persist beyond 48 hours
• Severity increases significantly
• New symptoms develop
• ${context.severity >= 4 ? 'Immediate medical attention recommended' : 'Fever above 101°F develops'}
• Difficulty breathing or chest pain occurs
• Severe pain that interferes with daily activities

💬 You can ask follow-up questions about this symptom below.`)
      }
    }
    
    // Add follow-up message if available (from history continue chat) - add AFTER loading conversation
    if (savedFollowUp) {
      setMessages([...loadedMessages, {
        id: Date.now().toString(),
        sender: 'ai',
        text: savedFollowUp,
        timestamp: new Date()
      }])
      localStorage.removeItem('followUpMessage')
    }
  }, [])

  const handleSave = async () => {
    if (!symptom.trim()) return
    if (!severity) return

    const profile = JSON.parse(localStorage.getItem("symptomProfile") || "{}")
    const userId = localStorage.getItem("symptomUserId") || `user_${Date.now()}`
    const userEmail = profile.email || userId

    const entryData = {
      symptom: symptom.trim(),
      severity: severity === "Mild" ? 1 : severity === "Moderate" ? 3 : 5,
      bodyPart: bodyPart || undefined,
      notes: notes || undefined,
      sleepHours: sleepHours ? parseFloat(sleepHours) : undefined,
      stressLevel: stressLevel ? parseInt(stressLevel) : undefined,
      weather: weather || undefined,
      medications: medications ? medications.split(',').map(m => m.trim()) : undefined,
      userEmail,
      aiDiscussion: messages.length > 0 ? messages : undefined
    }

    await onSave(entryData)

    // Reset form (but keep AI analysis visible until user enters new symptom)
    setSymptom("")
    setSeverity("")
    setNotes("")
    setBodyPart("")
    setSleepHours("")
    setStressLevel("")
    setWeather("")
    setMedications("")
    setAiQuestion("")
    setMessages([])
    // Clear localStorage when user enters new symptom
    localStorage.removeItem('symptomConversation')
    localStorage.removeItem('symptomAnalysis')
    localStorage.removeItem('currentEntryId')
  }

  const handleAddMedication = (medication: string) => {
    const currentMeds = medications.split(',').map(m => m.trim()).filter(m => m)
    if (!currentMeds.includes(medication)) {
      const newMeds = [...currentMeds, medication].join(', ')
      setMedications(newMeds)
    }
  }

  const parseAIAnalysis = (analysis: string) => {
    const sections: { title: string; icon: string; content: string[] }[] = []
    const lines = analysis.split('\n')
    let currentSection: { title: string; icon: string; content: string[] } | null = null

    for (const line of lines) {
      // Check for section headers (e.g., **🧠 Possible Cause:**, **💊 What you can do:**, **⚠️ When to worry:**)
      const headerMatch = line.match(/\*\*([🧠📊💡📝🎯💬🔍💊⚠️])([^*]+):\*\*/)
      if (headerMatch) {
        if (currentSection) {
          sections.push(currentSection)
        }
        currentSection = { title: headerMatch[2].trim(), icon: headerMatch[1], content: [] }
      } else if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        // Bullet points
        const content = line.replace(/^[•-]\s*/, '').trim()
        if (currentSection) {
          currentSection.content.push(content)
        }
      } else if (line.trim() && !line.includes('**') && currentSection) {
        // Regular content in section
        currentSection.content.push(line.trim())
      }
    }

    if (currentSection) {
      sections.push(currentSection)
    }

    return sections
  }

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser. Please use Chrome or Edge.')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setSymptom(transcript)
      setIsListening(false)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const handleQuickLog = (quickSymptom: typeof QUICK_LOG_SYMPTOMS[0]) => {
    setSymptom(quickSymptom.symptom)
    setBodyPart(quickSymptom.bodyPart)
    // Don't auto-select severity - let user choose
    // Clear previous AI analysis when using quick log
    setAiAnalysis("")
    setMessages([])
  }

  const handleAnalyzeAndSave = async () => {
    if (!symptom.trim() || !severity) return
    
    setIsAnalyzing(true)
    setAiAnalysis("")
    
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: `Symptom: ${symptom}, Severity: ${severity}, Body Part: ${bodyPart}, Sleep: ${sleepHours}h, Stress: ${stressLevel}/5, Weather: ${weather}, Notes: ${notes}`,
          context: "symptom_analysis",
          userProfile: userProfile
        })
      })
      
      const data = await res.json()
      const analysis = data.analysis || generateLocalAnalysis()
      setAiAnalysis(analysis)
      
      // Store symptom context for follow-up questions
      setCurrentSymptomContext({
        symptom,
        severity: severity === 'Mild' ? 1 : severity === 'Moderate' ? 3 : 5,
        bodyPart,
        notes,
        sleepHours: sleepHours ? parseFloat(sleepHours) : undefined,
        stressLevel: stressLevel ? parseInt(stressLevel) : undefined,
        weather
      })
      
      // Auto-save after successful analysis
      await handleSave()
      
      // Show success feedback
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error("Analysis error:", error)
      setAiAnalysis("Analysis failed. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generateLocalAnalysis = () => {
    let analysis = `🧠 **Possible Cause**\n• ${symptom} detected\n• ${severity === "Severe" ? "⚠️ Severe intensity - may require medical attention" : severity === "Moderate" ? "Moderate intensity - monitor for changes" : "Mild intensity - likely manageable"}\n\n` 
    
    if (bodyPart) {
      analysis += `• Affected area: ${bodyPart} region\n`
    }
    
    if (sleepHours) {
      const sleepQuality = parseFloat(sleepHours) < 6 ? "Poor" : parseFloat(sleepHours) > 8 ? "Good" : "Moderate"
      analysis += `• Sleep: ${sleepHours} hours (${sleepQuality}) - ${parseFloat(sleepHours) < 6 ? "may contribute to symptoms" : "adequate rest"}\n`
    }
    
    if (stressLevel) {
      const stressLevelNum = parseInt(stressLevel)
      const stressDesc = stressLevelNum <= 2 ? "Low" : stressLevelNum <= 3 ? "Moderate" : "High"
      analysis += `• Stress: Level ${stressLevel}/5 (${stressDesc}) - ${stressLevelNum >= 4 ? "may worsen symptoms" : "manageable levels"}\n`
    }
    
    analysis += `\n💊 **What you can do**\n• Rest and stay hydrated\n• Monitor symptoms for 24-48 hours\n• Track patterns and triggers\n• Consider over-the-counter relief if appropriate\n• Maintain regular sleep schedule\n• Practice stress management techniques\n\n`
    
    analysis += `⚠️ **When to worry**\n• Symptoms persist beyond 48 hours\n• Severity increases significantly\n• New symptoms develop\n• ${severity === "Severe" ? "Immediate medical attention recommended" : "Fever above 101°F develops"}\n• Difficulty breathing or chest pain occurs\n• Severe pain that interferes with daily activities`
    
    return analysis
  }

  const handleAskQuestion = async () => {
    if (!aiQuestion.trim()) return

    setIsAnalyzing(true)
    
    // Add user question to messages
    const userMessage = {
      id: (Date.now() + 1).toString(),
      sender: 'user' as const,
      text: aiQuestion,
      timestamp: new Date()
    }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)

    try {
      // Use stored symptom context from initial analysis
      const contextToUse = currentSymptomContext || (symptom || severity || bodyPart ? {
        symptom,
        severity: severity === 'Mild' ? 1 : severity === 'Moderate' ? 3 : 5,
        bodyPart,
        notes,
        sleepHours: sleepHours ? parseFloat(sleepHours) : undefined,
        stressLevel: stressLevel ? parseInt(stressLevel) : undefined,
        weather
      } : null)

      console.log("Sending to API with symptom context:", contextToUse)
      console.log("Stored context:", currentSymptomContext)
      console.log("Current form state:", { symptom, severity, bodyPart })

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: aiQuestion,
          context: "followup_question",
          conversation: messages,
          userProfile: userProfile,
          symptomContext: contextToUse
        })
      })

      const data = await res.json()
      const aiResponse = data.analysis || "I understand. Please tell me more about how you're feeling."

      const aiMessage = {
        id: (Date.now() + 2).toString(),
        sender: 'ai' as const,
        text: aiResponse,
        timestamp: new Date()
      }

      const finalMessages = [...updatedMessages, aiMessage]
      setMessages(finalMessages)

      // Save the updated conversation to database
      const currentEntryId = localStorage.getItem('currentEntryId')
      await onSave({
        symptom: symptom.trim(),
        severity: severity === "Mild" ? 1 : severity === "Moderate" ? 3 : 5,
        bodyPart: bodyPart || undefined,
        notes: notes || undefined,
        sleepHours: sleepHours ? parseFloat(sleepHours) : undefined,
        stressLevel: stressLevel ? parseInt(stressLevel) : undefined,
        weather: weather || undefined,
        medications: medications ? medications.split(',').map(m => m.trim()) : undefined,
        aiDiscussion: finalMessages,
        id: currentEntryId || undefined
      })
      
      setAiQuestion("")
    } catch (error) {
      console.error("Question error:", error)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai' as const,
        text: "Sorry, I couldn't process that question. Please try again.",
        timestamp: new Date()
      }])
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Fetch weather on component mount
  useEffect(() => {
    const fetchWeather = async () => {
      const weatherData = await getCurrentWeather()
      if (weatherData) {
        setCurrentWeather({
          temp: weatherData.temperature,
          condition: weatherData.condition,
          emoji: getWeatherEmoji(weatherData.condition)
        })
        setWeather(`${weatherData.condition} (${weatherData.temperature}°C)`)
      }
    }
    fetchWeather()
  }, [])

  return (
    <div className="card">
      <h2>Log a symptom</h2>
      <p className="card-hint">
        Fill in your symptom details and click "Get AI Health Insights" for personalized analysis.
      </p>

      {/* Quick Log Buttons */}
      <div style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #1a2540" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Quick Log
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px" }}>
          {QUICK_LOG_SYMPTOMS.map((quick) => (
            <button
              key={quick.symptom}
              onClick={() => handleQuickLog(quick)}
              disabled={isAnalyzing}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                background: "#0d1829",
                border: "1px solid #1a2540",
                color: "#e2e8f0",
                fontSize: "13px",
                fontWeight: 500,
                cursor: isAnalyzing ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: isAnalyzing ? 0.5 : 1
              }}
              onMouseOver={(e) => {
                if (!isAnalyzing) {
                  e.currentTarget.style.background = "#1a2540"
                  e.currentTarget.style.borderColor = "#3b82f6"
                }
              }}
              onMouseOut={(e) => {
                if (!isAnalyzing) {
                  e.currentTarget.style.background = "#0d1829"
                  e.currentTarget.style.borderColor = "#1a2540"
                }
              }}
            >
              <span style={{ fontSize: 18 }}>{quick.icon}</span>
              <span>{quick.symptom}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 1: What are you feeling? */}
      <div style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #1a2540" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Step 1: What are you feeling?
        </div>
        <label className="field-label">Symptom *</label>
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              className="input"
              placeholder="e.g. headache, nausea, back pain…"
              value={symptom}
              onChange={(e) => {
                setSymptom(e.target.value)
                setShowSuggestions(e.target.value.length > 0)
                // Clear previous AI analysis when user starts entering new symptom
                if (aiAnalysis && e.target.value !== symptom) {
                  setAiAnalysis("")
                  setMessages([])
                }
              }}
              onFocus={() => setShowSuggestions(symptom.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={isListening}
              style={{
                padding: "0 16px",
                borderRadius: "8px",
                background: isListening ? "#ef4444" : "#0d1829",
                border: `1px solid ${isListening ? "#ef4444" : "#1a2540"}`,
                color: isListening ? "#fff" : "#3b82f6",
                fontSize: "18px",
                cursor: isListening ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "50px"
              }}
              title={isListening ? "Listening..." : "Use voice input"}
            >
              {isListening ? "🎤" : "🎤"}
            </button>
          </div>
          
          {/* Autocomplete suggestions */}
          {showSuggestions && symptom.length > 0 && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: "4px",
              background: "#0d1829",
              border: "1px solid #1a2540",
              borderRadius: "8px",
              maxHeight: "200px",
              overflowY: "auto",
              zIndex: 1000,
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)"
            }}>
              {COMMON_SYMPTOMS
                .filter(s => s.toLowerCase().includes(symptom.toLowerCase()))
                .slice(0, 5)
                .map((s) => (
                  <div
                    key={s}
                    onClick={() => {
                      setSymptom(s)
                      setShowSuggestions(false)
                    }}
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      color: "#e2e8f0",
                      fontSize: "13px",
                      transition: "background 0.2s ease"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "#1a2540"
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "#0d1829"
                    }}
                  >
                    {s}
                  </div>
                ))}
              {COMMON_SYMPTOMS.filter(s => s.toLowerCase().includes(symptom.toLowerCase())).length === 0 && (
                <div style={{ padding: "10px 12px", color: "#64748b", fontSize: "13px" }}>
                  No matching symptoms
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Step 2: How severe is it? */}
      <div style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #1a2540" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Step 2: How severe is it?
        </div>
        <label className="field-label">Severity *</label>
        <div className="severity">
          {(["Mild", "Moderate", "Severe"] as const).map((s) => (
            <div
              key={s}
              className="sev-btn"
              style={{
                background: severity === s 
                  ? (s === "Mild" ? "#22c55e" : s === "Moderate" ? "#eab308" : "#ef4444")
                  : "#060d1f",
                border:     severity === s
                  ? `1.5px solid ${s === "Mild" ? "#22c55e" : s === "Moderate" ? "#eab308" : "#ef4444"}` 
                  : "1.5px solid #1a2540",
                color:      severity === s ? "#fff" : "#94a3b8",
                fontWeight: severity === s ? 600 : 400,
                transition: "all 0.15s",
              }}
              onClick={() => setSeverity(s)}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* Step 3: Where is it? */}
      <div style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #1a2540" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Step 3: Where is it?
        </div>
        <label className="field-label">Body area</label>
        <div className="body-grid">
          {BODY_PARTS.map((bp) => (
            <div
              key={bp.id}
              className={`body-btn ${bodyPart === bp.id ? "body-btn-active" : ""}`}
              onClick={() => setBodyPart(bodyPart === bp.id ? "" : bp.id)}
            >
              <span style={{ fontSize: 20 }}>{bp.icon}</span>
              <span style={{ fontSize: 12, marginTop: 4 }}>{bp.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step 4: Optional details */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Step 4: Optional details
        </div>
        
        {/* Sleep Hours */}
        <label className="field-label">
          Sleep Hours <span style={{ color: "#64748b" }}>(optional)</span>
        </label>
        <input
          className="input"
          placeholder="e.g. 7.5"
          type="number"
          min="0"
          max="24"
          step="0.5"
          value={sleepHours}
          onChange={(e) => setSleepHours(e.target.value)}
        />

        {/* Stress Level */}
        <label className="field-label">
          Stress Level <span style={{ color: "#64748b" }}>(optional)</span>
        </label>
        <div className="severity">
          {(["1", "2", "3", "4", "5"] as const).map((s) => (
            <div
              key={s}
              className="sev-btn"
              style={{
                background: stressLevel === s ? "#3eb8c0" : "#060d1f",
                border:     stressLevel === s
                  ? `1.5px solid #3eb8c0` 
                  : "1.5px solid #1a2540",
                color:      stressLevel === s ? "#fff" : "#94a3b8",
                fontWeight: stressLevel === s ? 600 : 400,
                transition: "all 0.15s",
              }}
              onClick={() => setStressLevel(s)}
            >
              {s}
            </div>
          ))}
        </div>

        {/* Weather */}
        <label className="field-label">
          Weather <span style={{ color: "#64748b" }}>(optional)</span>
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          {currentWeather && (
            <span style={{ fontSize: "20px" }}>{currentWeather.emoji}</span>
          )}
          <input
            className="input"
            placeholder={currentWeather ? `${currentWeather.condition} (${currentWeather.temp}°C)` : "e.g. rainy, cold, hot..."}
            value={weather}
            onChange={(e) => setWeather(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>

        {/* Medications */}
        <label className="field-label">
          Medications <span style={{ color: "#64748b" }}>(optional, comma-separated)</span>
        </label>
        <input
          className="input"
          placeholder="e.g. ibuprofen, aspirin, vitamins..."
          value={medications}
          onChange={(e) => setMedications(e.target.value)}
        />
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
          {COMMON_MEDICATIONS.map((med) => (
            <button
              key={med}
              type="button"
              onClick={() => handleAddMedication(med)}
              style={{
                padding: "4px 10px",
                borderRadius: "12px",
                background: "#0d1829",
                border: "1px solid #1a2540",
                color: "#94a3b8",
                fontSize: "11px",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#1a2540"
                e.currentTarget.style.borderColor = "#3b82f6"
                e.currentTarget.style.color = "#e2e8f0"
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#0d1829"
                e.currentTarget.style.borderColor = "#1a2540"
                e.currentTarget.style.color = "#94a3b8"
              }}
            >
              + {med}
            </button>
          ))}
        </div>

        {/* Notes */}
        <label className="field-label">
          Notes <span style={{ color: "#64748b" }}>(optional)</span>
        </label>
        <textarea
          className="input"
          placeholder="Any extra context — time of day, triggers, related symptoms…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ resize: "vertical" }}
        />
      </div>

      {/* Analyze & Save Button */}
      <button
        className="btn-primary"
        onClick={handleAnalyzeAndSave}
        disabled={isAnalyzing || !symptom.trim() || !severity}
        style={{
          marginTop: 20,
          opacity: (isAnalyzing || !symptom.trim() || !severity) ? 0.6 : 1,
          background: (isAnalyzing || !symptom.trim() || !severity) 
            ? "#64748b" 
            : "linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)",
          border: "none",
          padding: "14px 28px",
          borderRadius: "12px",
          color: "#fff",
          fontSize: "15px",
          fontWeight: 600,
          cursor: (isAnalyzing || !symptom.trim() || !severity) ? "not-allowed" : "pointer",
          boxShadow: (isAnalyzing || !symptom.trim() || !severity) 
            ? "none" 
            : "0 4px 20px rgba(13, 148, 136, 0.4), 0 2px 10px rgba(13, 148, 136, 0.3)",
          transition: "all 0.3s ease"
        }}
        onMouseOver={(e) => {
          if (!(isAnalyzing || !symptom.trim() || !severity)) {
            e.currentTarget.style.transform = "translateY(-2px)"
            e.currentTarget.style.boxShadow = "0 6px 25px rgba(13, 148, 136, 0.5), 0 3px 15px rgba(13, 148, 136, 0.4)"
          }
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "translateY(0)"
          e.currentTarget.style.boxShadow = (isAnalyzing || !symptom.trim() || !severity) 
            ? "none" 
            : "0 4px 20px rgba(13, 148, 136, 0.4), 0 2px 10px rgba(13, 148, 136, 0.3)"
        }}
      >
        {isAnalyzing ? "🔄 Analyzing & Saving..." : "🧠 Get AI Health Insights"}
      </button>

      {/* Loading State */}
      {isAnalyzing && (
        <div style={{
          marginTop: "16px",
          padding: "16px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, #0d1829 0%, #1e293b 100%)",
          border: "1px solid #3b82f6",
          textAlign: "center",
          animation: "pulse 2s ease-in-out infinite"
        }}>
          <div style={{ fontSize: "18px", marginBottom: "8px" }}>🤖</div>
          <div style={{ color: "#e2e8f0", fontSize: "14px", fontWeight: 500 }}>
            Analyzing your symptoms...
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div style={{
          marginTop: "16px",
          padding: "16px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, #065f46 0%, #047857 100%)",
          border: "1px solid #10b981",
          textAlign: "center",
          animation: "fadeIn 0.3s ease-in-out"
        }}>
          <div style={{ fontSize: "18px", marginBottom: "8px" }}>✅</div>
          <div style={{ color: "#e2e8f0", fontSize: "14px", fontWeight: 500 }}>
            Entry saved successfully
          </div>
        </div>
      )}

      {/* AI Analysis Display */}
      <div style={{
        marginTop: "24px",
        padding: "16px",
        borderRadius: "12px",
        background: "linear-gradient(135deg, #0d1829 0%, #1e293b 100%)",
        border: "1px solid #2dd4bf",
        boxShadow: "0 0 20px rgba(45, 212, 191, 0.15)"
      }}>
        <h3 style={{ color: "#2dd4bf", marginBottom: "12px", fontSize: "16px", fontWeight: 600 }}>🧠 AI Health Insight</h3>
        
        {/* Profile-based intro - Badge style */}
        {userProfile && (
          <div style={{
            padding: "12px",
            borderRadius: "12px",
            background: "rgba(59, 130, 246, 0.08)",
            border: "1px solid rgba(59, 130, 246, 0.2)",
            marginBottom: "12px"
          }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Your Profile {profileLoaded ? "✓" : "⚠️"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {userProfile.age && (
                <div style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  background: "rgba(59, 130, 246, 0.15)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <span style={{ fontSize: "14px" }}>👤</span>
                  <span>Age: {userProfile.age}</span>
                </div>
              )}
              {userProfile.activityLevel && (
                <div style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  background: "rgba(59, 130, 246, 0.15)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <span style={{ fontSize: "14px" }}>🏃</span>
                  <span>{userProfile.activityLevel.charAt(0).toUpperCase() + userProfile.activityLevel.slice(1)}</span>
                </div>
              )}
              {userProfile.conditions && (
                <div style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  background: "rgba(59, 130, 246, 0.15)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <span style={{ fontSize: "14px" }}>🩺</span>
                  <span>{userProfile.conditions}</span>
                </div>
              )}
              {!userProfile.age && !userProfile.activityLevel && !userProfile.conditions && (
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Profile loaded but no details available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Structured UI blocks */}
        {aiAnalysis && parseAIAnalysis(aiAnalysis).map((section, index) => {
          const isExpanded = expandedSections[index] ?? false
          const displayContent = isExpanded ? section.content : section.content.slice(0, 3)
          const hasMore = section.content.length > 3

          return (
            <div key={index} style={{
              padding: "12px",
              borderRadius: "8px",
              background: "rgba(13, 148, 136, 0.1)",
              border: "1px solid rgba(45, 212, 191, 0.3)",
              marginBottom: "8px",
              color: "#e2e8f0",
              fontSize: "14px"
            }}>
              <div style={{ 
                fontSize: "13px", 
                fontWeight: 600, 
                color: "#2dd4bf", 
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </div>
              {displayContent.map((item, itemIndex) => (
                <div key={itemIndex} style={{
                  padding: "4px 0",
                  paddingLeft: "12px",
                  borderLeft: "2px solid rgba(45, 212, 191, 0.3)",
                  lineHeight: "1.4",
                  fontSize: "13px"
                }}>
                  {item}
                </div>
              ))}
              {hasMore && (
                <button
                  onClick={() => setExpandedSections(prev => ({ ...prev, [index]: !isExpanded }))}
                  style={{
                    marginTop: "8px",
                    padding: "4px 8px",
                    background: "transparent",
                    border: "1px solid rgba(45, 212, 191, 0.3)",
                    color: "#2dd4bf",
                    fontSize: "12px",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  {isExpanded ? "Show less" : `Show ${section.content.length - 3} more`}
                </button>
              )}
            </div>
          )
        })}

        {/* Q&A Section */}
        <div style={{ marginTop: "16px" }}>
          <h4 style={{ color: "#e2e8f0", marginBottom: "12px", fontSize: "14px", fontWeight: 600 }}>
            💬 Ask AI about this symptom
          </h4>

          {/* Conversation History */}
          {messages.length > 0 && (
            <div style={{
              marginBottom: "12px",
              maxHeight: "300px",
              overflowY: "auto",
              padding: "12px",
              background: "#060d1f",
              borderRadius: "8px",
              fontSize: "13px"
            }}>
              {messages.map((msg, index) => (
                <div key={msg.id} style={{
                  marginBottom: "12px",
                  padding: "12px",
                  borderRadius: "12px",
                  background: msg.sender === 'user' 
                    ? "linear-gradient(135deg, #1e293b 0%, #334155 100%)" 
                    : "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
                  color: "#e2e8f0",
                  boxShadow: msg.sender === 'ai' ? "0 0 15px rgba(13, 148, 136, 0.3)" : "none",
                  borderLeft: msg.sender === 'ai' ? "3px solid #2dd4bf" : "none",
                  transition: "all 0.2s ease"
                }}>
                  <div style={{ fontSize: "11px", opacity: 0.7, marginBottom: "4px", fontWeight: 600 }}>
                    {msg.sender === 'user' ? '👤 You' : '🤖 AI Assistant'} • {(new Date(msg.timestamp)).toLocaleTimeString()}
                  </div>
                  <div style={{ lineHeight: "1.5" }}>{msg.text}</div>
                </div>
              ))}
            </div>
          )}

          {/* Input field at bottom */}
          <div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                className="input"
                placeholder="Ask: Why is this happening? What should I do?"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && aiQuestion.trim()) {
                    handleAskQuestion()
                  }
                }}
                style={{ flex: 1 }}
              />
              <button
                onClick={handleAskQuestion}
                disabled={isAnalyzing || !aiQuestion.trim()}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: (isAnalyzing || !aiQuestion.trim()) ? "#94a3b8" : "#10b981",
                  color: "white",
                  border: "none",
                  cursor: (isAnalyzing || !aiQuestion.trim()) ? "not-allowed" : "pointer",
                }}
              >
                {isAnalyzing ? "🔄 Thinking..." : "Send"}
              </button>
            </div>

            {/* Suggestions */}
            <div style={{ marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {["Why is this happening?", "What should I eat?", "What medication helps?", "When should I see a doctor?"].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setAiQuestion(suggestion)
                    handleAskQuestion()
                  }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "12px",
                    background: "#0d1829",
                    border: "1px solid #1a2540",
                    color: "#64748b",
                    fontSize: "11px",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#1a2540"
                    e.currentTarget.style.borderColor = "#3b82f6"
                    e.currentTarget.style.color = "#e2e8f0"
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "#0d1829"
                    e.currentTarget.style.borderColor = "#1a2540"
                    e.currentTarget.style.color = "#64748b"
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
