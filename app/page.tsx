"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import jsPDF from "jspdf"
import { HealthEntry, Toast } from "../lib/types"
import SymptomForm from "../components/SymptomForm"
import History from "../components/History"
import InsightsDashboard from "../components/InsightsDashboard"
import Tabs from "../components/Tabs"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function Home() {
  const [name, setName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [nameSet, setNameSet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<HealthEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<"log" | "history" | "insights">("log")
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = (message: string, type?: "success" | "error") => {
    setToast({ message, type: type || "success" })
    setTimeout(() => setToast(null), 3000)
  }

  const handleContinueChat = (entry: HealthEntry) => {
    // Clear any existing conversation
    localStorage.removeItem('symptomConversation')
    localStorage.removeItem('symptomAnalysis')
    
    // Load existing conversation if available
    let messages = []
    if (entry.aiDiscussion && entry.aiDiscussion.length > 0) {
      messages = entry.aiDiscussion
      localStorage.setItem('symptomConversation', JSON.stringify(messages))
    }
    
    // Store symptom details as context for the conversation
    const symptomContext = {
      symptom: entry.symptom,
      severity: entry.severity,
      bodyPart: entry.bodyPart,
      notes: entry.notes,
      sleepHours: entry.sleepHours,
      stressLevel: entry.stressLevel,
      weather: entry.weather,
      medications: entry.medications
    }
    localStorage.setItem('symptomContext', JSON.stringify(symptomContext))
    
    // Store entry ID for updating the conversation
    if (entry.id) {
      localStorage.setItem('currentEntryId', entry.id)
    }
    
    // Add a follow-up question from AI
    const timeSinceEntry = entry.created_at ? Math.floor((Date.now() - new Date(entry.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0
    let followUpMessage = ""
    
    if (timeSinceEntry >= 1) {
      const daysAgo = timeSinceEntry === 1 ? "yesterday" : `${timeSinceEntry} days ago`
      followUpMessage = `Welcome back! You reported ${entry.symptom} ${daysAgo}. How are you feeling today? Is the ${entry.symptom} still bothering you, or has it improved?`
    } else {
      followUpMessage = `You mentioned ${entry.symptom} earlier. How are you feeling now? Is the ${entry.symptom} still bothering you?`
    }
    
    localStorage.setItem('followUpMessage', followUpMessage)
    
    // Switch to log tab
    setTab("log")
    showToast("Symptom loaded. Continue your conversation.")
  }

  const fetchData = async () => {
    console.log("fetchData called")
    try {
      const res = await fetch("/api/history")
      console.log("History API response status:", res.status)
      const { data } = await res.json()
      console.log("History API data:", data)
      setData(data || [])
    } catch (err) {
      console.error("Failed to fetch history:", err)
    }
  }

  useEffect(() => {
    const profile = JSON.parse(localStorage.getItem("symptomProfile") || "{}")
    if (profile.email) {
      setUserEmail(profile.email)
      setName(profile.name)
      setNameSet(true)
    }
    setLoading(false)
    fetchData()
  }, [])

  // Refresh data when tab changes to ensure History and Insights have latest data
  useEffect(() => {
    fetchData()
  }, [tab])

  const handleDownloadReport = async () => {
    try {
      // Refresh data before generating report
      await fetchData()
      
      // Load user profile
      const profile = JSON.parse(localStorage.getItem("symptomProfile") || "{}")
      
      // Typo mapping function
      const cleanText = (text: string): string => {
        const typoMap: Record<string, string> = {
          "verico veins": "varicose veins",
          "varico veins": "varicose veins",
          "hoy": "hot",
          "hiot": "hot",
          "paining": "pain",
          "headace": "headache",
          "headach": "headache",
          "stomac": "stomach",
          "stomack": "stomach",
          "food poison": "food poisoning",
          "food pois": "food poisoning",
        }
        
        const lowerText = text.toLowerCase().trim()
        return typoMap[lowerText] || text
      }
    
    // Capitalize function to standardize symptom names
    const capitalize = (text: string): string => {
      const specialCases: Record<string, string> = {
        "head": "Head",
        "general": "General",
        "stomach": "Stomach",
        "back": "Back",
        "neck": "Neck",
        "chest": "Chest",
        "legs": "Legs",
        "arms": "Arms",
      }
      
      const lowerText = text.toLowerCase().trim()
      if (specialCases[lowerText]) {
        return specialCases[lowerText]
      }
      
      return text.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
    }
    
    const doc = new jsPDF()
    let yPos = 20
    const pageHeight = 280 // A4 page height minus margins
    let currentPage = 1

    // Helper function to add new page if needed
    const checkAndAddPage = (requiredSpace: number = 50) => {
      if (yPos + requiredSpace > pageHeight) {
        doc.addPage()
        currentPage++
        yPos = 20
        // Add header to new page
        doc.setFillColor(240, 240, 240)
        doc.rect(0, 0, 210, 50, 'F')
        doc.setTextColor(30, 30, 30)
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.text(`Health Intelligence Report (Page ${currentPage})`, 105, 30, { align: "center" })
        yPos = 60
      }
    }

    // White background for better readability
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, 210, 297, 'F')

    // Report Header - Light gray background with dark text
    doc.setFillColor(240, 240, 240)
    // ── TITLE & HEADER ────────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold")
    doc.setFontSize(28)
    doc.setTextColor(30, 30, 30)
    doc.text("Health Intelligence Report", 105, 30, { align: "center" })
    yPos += 20

    // Add subtitle
    doc.setFont("helvetica", "normal")
    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    doc.text("Personalized Health Analysis & Insights", 105, yPos, { align: "center" })
    yPos += 30

    // ── PATIENT INFO ──────────────────────────────────────────────────────────
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(15, yPos - 5, 180, 55, 5, 5, 'F')
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(50, 50, 50)
    doc.text("Patient Information", 25, yPos + 5)
    yPos += 12

    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.setTextColor(80, 80, 80)
    doc.text(`Name: ${profile.name || 'N/A'}`, 25, yPos)
    yPos += 8
    doc.text(`Age: ${profile.age || 'N/A'}`, 25, yPos)
    yPos += 8
    doc.text(`Gender: ${profile.gender || 'N/A'}`, 25, yPos)
    yPos += 8
    doc.text(`Conditions: ${profile.conditions || 'N/A'}`, 25, yPos)
    yPos += 8
    doc.text(`Activity Level: ${profile.activityLevel || 'N/A'}`, 25, yPos)
    yPos += 15

    // Check if we need a new page before Health Score
    checkAndAddPage(80)

    // Health Score Section - Clean layout without colored background
    const valid = data.filter((d) => d.severity)
    const avgSeverity = valid.length > 0 ? valid.reduce((sum, d) => sum + d.severity, 0) / valid.length : 0
    
    const sleepData = data.filter(d => d.sleepHours).map(d => d.sleepHours!)
    const avgSleep = sleepData.length > 0 ? (sleepData.reduce((sum, h) => sum + h, 0) / sleepData.length).toFixed(1) : 'N/A'
    
    const stressData = data.filter(d => d.stressLevel).map(d => d.stressLevel!)
    const avgStress = stressData.length > 0 ? (stressData.reduce((sum, s) => sum + s, 0) / stressData.length).toFixed(1) : 'N/A'

    // Health Score Section
    const healthScore = Math.round(Math.max(0, Math.min(100, 100 - (avgSeverity * 10) - (parseFloat(avgSleep) < 6 ? 10 : 0) - (parseFloat(avgStress) >= 3 ? 10 : 0))))
    const healthScoreColor = healthScore >= 70 ? '0, 120, 80' : healthScore >= 50 ? '200, 120, 0' : '200, 50, 50'
    
    doc.setDrawColor(0, 80, 160)
    doc.setLineWidth(0.5)
    doc.line(25, yPos, 185, yPos)
    yPos += 10
    doc.setTextColor(0, 80, 160)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("Health Score", 25, yPos)
    yPos += 12
    
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text(`${healthScore} / 100`, 25, yPos)
    yPos += 8
    
    doc.setTextColor(80, 80, 80)
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Status: ${healthScore >= 70 ? 'Good' : healthScore >= 50 ? 'Moderate' : 'Needs Attention'}`, 25, yPos)
    yPos += 8
    doc.text(`Factors affecting score:`, 25, yPos)
    yPos += 6
    if (avgSeverity > 2.5) {
      doc.text(`• Average severity above moderate`, 30, yPos)
      yPos += 6
    }
    if (parseFloat(avgSleep) < 6) {
      doc.text(`• Low sleep duration`, 30, yPos)
      yPos += 6
    }
    if (parseFloat(avgStress) >= 3) {
      doc.text(`• Moderate to high stress levels`, 30, yPos)
      yPos += 6
    }
    yPos += 20

    // Check if we need a new page before Key Insights
    checkAndAddPage(90)

    // Key Insights Section - Clean layout without colored background
    doc.setDrawColor(0, 120, 80)
    doc.setLineWidth(0.5)
    doc.line(25, yPos, 185, yPos)
    yPos += 10
    doc.setTextColor(0, 120, 80)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("Key Health Insights", 25, yPos)
    yPos += 12

    // Generate insights
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    
    const mildCount = data.filter(d => d.severity && d.severity <= 2).length
    const moderateCount = data.filter(d => d.severity && d.severity > 2 && d.severity <= 4).length
    const severeCount = data.filter(d => d.severity && d.severity >= 4).length
    const totalSymptoms = mildCount + moderateCount + severeCount
    
    let severityLabel = 'mostly moderate'
    if (totalSymptoms > 0) {
      if (mildCount > moderateCount && mildCount > severeCount) {
        severityLabel = 'mostly mild'
      } else if (severeCount > moderateCount && severeCount > mildCount) {
        severityLabel = 'mostly severe'
      } else {
        severityLabel = 'mostly moderate'
      }
    }
    
    // Clean symptom data (case-insensitive + typo correction)
    const symptomCount: Record<string, number> = {}
    data.forEach((d) => {
      const cleanedSymptom = cleanText(d.symptom || '')
      const normalizedSymptom = cleanedSymptom.toLowerCase().trim()
      if (normalizedSymptom) {
        symptomCount[normalizedSymptom] = (symptomCount[normalizedSymptom] || 0) + 1
      }
    })
    
    const topSymptom = Object.entries(symptomCount).sort((a, b) => b[1] - a[1])[0]
    const topSymptomName = topSymptom ? capitalize(cleanText(topSymptom[0])) : 'None'
    const topSymptomCount = topSymptom ? topSymptom[1] : 0
    
    const sleepStatus = parseFloat(avgSleep) < 6 ? 'low' : parseFloat(avgSleep) > 8 ? 'good' : 'adequate'
    
    // Data-driven insights with percentages
    if (totalSymptoms > 0) {
      const moderatePercent = Math.round((moderateCount / totalSymptoms) * 100)
      doc.text(`• ${moderatePercent}% of your symptoms are moderate in severity`, 25, yPos)
      yPos += 8
    }
    if (topSymptom) {
      doc.text(`• ${topSymptomName} appears most frequently (${topSymptomCount} times)`, 25, yPos)
      yPos += 8
    }
    if (avgSleep !== 'N/A' && parseFloat(avgSleep) < 6) {
      doc.text(`• Symptoms increase when sleep is below 6 hours`, 25, yPos)
      yPos += 8
    }
    if (avgStress !== 'N/A' && parseFloat(avgStress) >= 3) {
      doc.text(`• Higher stress levels correlate with symptom frequency`, 25, yPos)
      yPos += 8
    }
    yPos += 20

    // Check if we need a new page before Risk Summary
    checkAndAddPage(80)

    // Risk Summary Section - Clean layout without colored background
    doc.setDrawColor(180, 120, 0)
    doc.setLineWidth(0.5)
    doc.line(25, yPos, 185, yPos)
    yPos += 10
    doc.setTextColor(180, 120, 0)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("Risk Summary", 25, yPos)
    yPos += 12

    doc.setTextColor(30, 30, 30)
    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    
    // Use existing variables from earlier in the function
    
    const riskLevel = avgSeverity <= 2 ? 'Low' : avgSeverity <= 3 ? 'Moderate' : 'High'
    const riskDescription = avgSeverity <= 2 ? 'Low risk with manageable symptoms' : avgSeverity <= 3 ? 'Moderate to high risk due to frequent recurring symptoms' : 'High risk requiring immediate attention'
    doc.text(`• ${riskDescription}`, 25, yPos)
    yPos += 8
    if (topSymptom) {
      doc.text(`• Monitor recurring symptoms like ${topSymptomName}`, 25, yPos)
      yPos += 8
    }
    if (avgSleep !== 'N/A' && parseFloat(avgSleep) < 7) {
      doc.text(`• Consider improving sleep consistency`, 25, yPos)
      yPos += 8
    }
    if (avgStress !== 'N/A' && parseFloat(avgStress) >= 3) {
      doc.text(`• Higher stress levels correlate with symptom frequency`, 25, yPos)
      yPos += 8
    }
    yPos += 20

    // Check if we need a new page before Severity Overview
    checkAndAddPage(80)

    // Severity Overview Section
    doc.setDrawColor(0, 80, 160)
    doc.setLineWidth(0.5)
    doc.line(25, yPos, 185, yPos)
    yPos += 12
    doc.setTextColor(0, 80, 160)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("Severity Overview", 25, yPos)
    yPos += 12
    
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    doc.text(`Average Severity: ${avgSeverity.toFixed(1)} / 5`, 25, yPos)
    yPos += 8
    
    const severityStatus = avgSeverity <= 2 ? 'Mild' : avgSeverity <= 3 ? 'Moderate to High' : 'High'
    doc.text(`Status: ${severityStatus}`, 25, yPos)
    yPos += 10
    
    doc.text(`Distribution:`, 25, yPos)
    yPos += 8
    
    // Use severity counts from Key Insights section
    doc.text(`• Mild: ${mildCount}`, 30, yPos)
    yPos += 8
    doc.text(`• Moderate: ${moderateCount}`, 30, yPos)
    yPos += 8
    doc.text(`• Severe: ${severeCount}`, 30, yPos)
    yPos += 20

    // Check if we need a new page before Most Frequent Symptoms
    checkAndAddPage(80)

    // Most Frequent Symptoms Section
    doc.setDrawColor(0, 80, 160)
    doc.setLineWidth(0.5)
    doc.line(25, yPos, 185, yPos)
    yPos += 12
    doc.setTextColor(0, 80, 160)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("Most Frequent Symptoms", 25, yPos)
    yPos += 120

    doc.setTextColor(30, 30, 30)
    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    
    const topSymptoms = Object.entries(symptomCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    
    topSymptoms.forEach(([symptom, count], i) => {
      const displayName = capitalize(cleanText(symptom))
      doc.text(`${i + 1}. ${displayName} — ${count} times`, 30, yPos)
      yPos += 8
    })
    yPos += 20

    // Check if we need a new page before Body Regions
    checkAndAddPage(60)

    // Body Region Section
    const bodyPartCount: Record<string, number> = {}
    data.forEach((d) => {
      if (d.bodyPart) {
        bodyPartCount[d.bodyPart] = (bodyPartCount[d.bodyPart] || 0) + 1
      }
    })
    if (Object.keys(bodyPartCount).length > 0) {
      doc.setTextColor(0, 80, 160)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(15)
      doc.text("Affected Body Regions", 25, yPos)
      yPos += 10

      doc.setTextColor(30, 30, 30)
      doc.setFontSize(11)
      doc.setFont("helvetica", "normal")
      
      const sortedBodyParts = Object.entries(bodyPartCount).sort((a, b) => b[1] - a[1])
      const mostAffected = sortedBodyParts[0]
      
      sortedBodyParts.forEach(([part, count], i) => {
        const isMost = part === mostAffected[0] ? ' (most affected)' : ''
        doc.text(`• ${part} — ${count} times${isMost}`, 30, yPos)
        yPos += 8
      })
      yPos += 20
    }

// ... (rest of the code remains the same)
    const sleepInterpretation = parseFloat(avgSleep) < 6 ? ' (slightly low)' : parseFloat(avgSleep) > 8 ? ' (good)' : ' (adequate)'
    doc.text(`Average Sleep: ${avgSleep} hours${sleepInterpretation}`, 30, yPos)
    yPos += 8
    
    const stressInterpretation = parseFloat(avgStress) >= 3 ? ' (moderate)' : ' (low)'
    doc.text(`Average Stress: ${avgStress} / 5${stressInterpretation}`, 30, yPos)
    yPos += 20

    // Check if we need a new page before Weather Impact
    checkAndAddPage(50)

    // Weather Impact Section
    const weatherCount: Record<string, number> = {}
    data.forEach((d) => {
      if (d.weather) {
        // Clean weather data - fix common typos
        const cleanWeather = d.weather.toLowerCase().trim().replace('hiot', 'hot')
        weatherCount[cleanWeather] = (weatherCount[cleanWeather] || 0) + 1
      }
    })

    if (Object.keys(weatherCount).length > 0) {
      doc.setDrawColor(0, 80, 160)
      doc.setLineWidth(0.5)
      doc.line(25, yPos, 185, yPos)
      yPos += 12
      doc.setTextColor(0, 80, 160)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.text("Weather Impact", 25, yPos)
      yPos += 12

      doc.setTextColor(30, 30, 30)
      doc.setFontSize(11)
      doc.setFont("helvetica", "normal")
      Object.entries(weatherCount).forEach(([weather, count], i) => {
        const displayName = weather.charAt(0).toUpperCase() + weather.slice(1)
        doc.text(`• ${displayName} — ${count} occurrence${count > 1 ? 's' : ''}`, 30, yPos)
        yPos += 8
      })
      yPos += 20
    }

    // Check if we need a new page before Recent Entries
    checkAndAddPage(100)

    // Recent Entries Section
    if (data.length > 0) {
      doc.setDrawColor(0, 80, 160)
      doc.setLineWidth(0.5)
      doc.line(25, yPos, 185, yPos)
      yPos += 12
      doc.setTextColor(0, 80, 160)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.text("Recent Entries", 25, yPos)
      yPos += 12

      const recentEntries = data.slice(0, 5)
      recentEntries.forEach((entry, i) => {
        const date = entry.timestamp || entry.created_at
        const entryDate = date ? new Date(date).toLocaleDateString() : 'Unknown'
        const severity = entry.severity <= 2 ? 'Mild' : entry.severity <= 3 ? 'Moderate' : 'Severe'

        doc.setTextColor(30, 30, 30)
        doc.setFontSize(11)
        doc.setFont("helvetica", "bold")
        doc.text(`${capitalize(cleanText(entry.symptom))} (${severity})`, 30, yPos)
        yPos += 6

        if (entry.notes) {
          doc.setFont("helvetica", "normal")
          doc.setTextColor(80, 80, 80)
          doc.setFontSize(10)
          const truncatedNotes = entry.notes.length > 50 ? entry.notes.substring(0, 50) + '...' : entry.notes
          doc.text(`  Notes: ${truncatedNotes}`, 30, yPos)
          yPos += 8
        }
        yPos += 10
      })
    } else {
      doc.setTextColor(80, 80, 80)
      doc.setFontSize(11)
      doc.setFont("helvetica", "italic")
      doc.text("No entries recorded yet.", 25, yPos)
      yPos += 10
    }

    // Check if we need a new page before Doctor Summary
    checkAndAddPage(80)

    // Doctor Summary Section - Clean layout without colored background
    yPos += 10
    doc.setDrawColor(60, 60, 60)
    doc.setLineWidth(0.5)
    doc.line(25, yPos, 185, yPos)
    yPos += 12
    doc.setTextColor(60, 60, 60)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("Doctor Summary", 25, yPos)
    yPos += 12

    doc.setTextColor(30, 30, 30)
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    
    const doctorSummary = `Patient shows ${severityLabel} symptoms, primarily affecting the ${Object.keys(bodyPartCount).length > 0 ? Object.entries(bodyPartCount).sort((a, b) => b[1] - a[1])[0][0] : 'general'} region. Lifestyle factors like sleep (${avgSleep}h) and stress (${avgStress}/5) may be contributing. Monitoring and clinical evaluation recommended.`
    const summaryLines = doc.splitTextToSize(doctorSummary, 170)
    
    summaryLines.forEach((line: string, i: number) => {
      doc.text(line, 25, yPos + i * 5)
    })
    yPos += summaryLines.length * 5 + 20

    // Check if we need a new page before Recommendations
    checkAndAddPage(80)

    // Recommendations Section - Clean layout without colored background
    yPos += 10
    doc.setDrawColor(100, 50, 180)
    doc.setLineWidth(0.5)
    doc.line(25, yPos, 185, yPos)
    yPos += 12
    doc.setTextColor(100, 50, 180)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("Recommendations", 25, yPos)
    yPos += 12

    doc.setTextColor(30, 30, 30)
    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    doc.text(`• Maintain consistent sleep schedule (7–8 hours)`, 25, yPos)
    yPos += 8
    doc.text(`• Monitor recurring symptoms like ${topSymptomName || 'headaches'}`, 25, yPos)
    yPos += 8
    doc.text(`• Reduce stress triggers where possible`, 25, yPos)
    yPos += 8
    doc.text(`• Seek medical advice if symptoms persist`, 25, yPos)
    yPos += 20

    // Check if we need a new page before Medical Disclaimer
    checkAndAddPage(80)

    // Medical Disclaimer - Clean layout without colored background
    yPos += 10
    doc.setDrawColor(180, 0, 0)
    doc.setLineWidth(0.5)
    doc.line(25, yPos, 185, yPos)
    yPos += 12
    doc.setTextColor(180, 0, 0)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("Medical Disclaimer", 105, yPos, { align: "center" })
    yPos += 12
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.text("This report is AI-generated based on self-reported data.", 105, yPos, { align: "center" })
    doc.text("It is not a substitute for professional medical advice.", 105, yPos + 6, { align: "center" })
    doc.text("Please consult a qualified healthcare provider for diagnosis and treatment.", 105, yPos + 12, { align: "center" })
    yPos += 25

    doc.setTextColor(80, 80, 80)
    doc.setFontSize(8)
    doc.text(`Generated by Health Intelligence Platform on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, 105, yPos, { align: "center" })

    doc.save(`health-intelligence-report-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error("Error generating PDF report:", error)
      showToast("Failed to generate PDF report. Please try again.", "error")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/history?id=${id}`, { method: "DELETE" })
      setData(data.filter((item) => item.id !== id))
      showToast("Entry deleted")
    } catch (err) {
      console.error("Delete failed:", err)
      showToast("Failed to delete entry.", "error")
    }
  }

  const handleSave = async (entry: Omit<HealthEntry, 'user_email' | 'created_at'>) => {
    setSaving(true)
    try {
      await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...entry,
          userEmail: "user@local.dev"
        }),
      })
      showToast("Entry saved ✓")
      // Refresh data after save
      await fetchData()
    } catch (err) {
      console.error(err)
      showToast("Failed to save entry.", "error")
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0d1829",
        color: "#e2e8f0",
        fontSize: 18,
      }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d1829", color: "#e2e8f0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{
        padding: "24px 32px",
        borderBottom: "1px solid #1a2540",
        background: "linear-gradient(135deg, #0d1829 0%, #1a2540 100%)"
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: "#e2e8f0" }}>
            🧠 Health Intelligence
          </h1>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ fontSize: 14, color: "#94a3b8" }}>
              👤 {name || "User"}
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("symptomProfile")
                window.location.reload()
              }}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                background: "#ef4444",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            padding: "12px 20px",
            borderRadius: "8px",
            background: toast.type === "success" ? "#10b981" : "#ef4444",
            color: "white",
            fontSize: 14,
            fontWeight: 500,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Main Content */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px" }}>
        <Tabs 
          activeTab={tab}
          onTabChange={setTab}
        />

        {/* ── LOG TAB ─────────────────────────────────────────────────────── */}
        {tab === "log" && (
          <SymptomForm
            onSave={handleSave}
            loading={saving}
          />
        )}

        {/* ── HISTORY TAB ─────────────────────────────────────────────────── */}
        {tab === "history" && <History data={data} onDelete={handleDelete} onContinueChat={handleContinueChat} />}

        {/* ── INSIGHTS TAB ────────────────────────────────────────────────── */}
        {tab === "insights" && <InsightsDashboard data={data} />}

        <button
          onClick={handleDownloadReport}
          className="mt-4 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none cursor-pointer text-base font-semibold shadow-lg shadow-blue-500/40 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/50"
        >
          📄 Download Doctor Report
        </button>
      </div>
    </div>
  )
}
