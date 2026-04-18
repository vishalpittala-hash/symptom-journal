import { NextResponse } from "next/server"
import axios from 'axios'
import https from 'https'

// Create axios instance that ignores SSL certificate errors (for development)
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
})

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Use axiosInstance instead of fetch
    const response = await axiosInstance.get(
      `${supabaseUrl}/rest/v1/symptoms`,
      {
        params: {
          select: '*',
          order: 'created_at.desc',
          limit: 50
        },
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const logs = response.data

    console.log("Insights API - Logs count:", logs?.length || 0)
    if (logs && logs.length > 0) {
      console.log("Insights API - Sample log:", logs[0])
    }

    const insights = generateInsights(logs || [])

    // 🔥 Predictive alert
    const recent = (logs || []).slice(0, 5)

    if (recent.length >= 3) {
      const avgRecent =
        recent.reduce((sum, l) => sum + (l.severity || 0), 0) /
        recent.length

      if (avgRecent >= 4) {
        insights.unshift(
          "⚠️ High severity trend detected recently — symptoms may continue if patterns persist"
        )
      } else if (avgRecent >= 3) {
        insights.unshift(
          "⚠️ Moderate symptom trend — monitor closely over next few days"
        )
      }
    }

    console.log("Insights API - Generated insights:", insights)

    return NextResponse.json({ 
      insights,
      totalLogs: logs?.length || 0,
      data: logs || []
    })

  } catch (err: unknown) {
    console.error("Insights API error:", err)
    const message =
      err instanceof Error ? err.message : "Unknown error"

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

// 🔥 INSIGHT ENGINE
function generateInsights(logs: any[]) {
  if (!logs.length) return ["No data yet"]

  const insights: string[] = []

  // ✅ Total logs
  insights.push(`You logged ${logs.length} symptoms recently`)

  // ✅ Most frequent symptom
  const count: Record<string, number> = {}

  logs.forEach(l => {
    if (!l.symptom) return
    count[l.symptom] = (count[l.symptom] || 0) + 1
  })

  const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0]
  if (top) insights.push(`Most frequent symptom: ${top[0]}`)

  // ✅ Average severity
  const validLogs = logs.filter(
    l => l.severity !== null && l.severity !== undefined
  )

  const avg =
    validLogs.length > 0
      ? validLogs.reduce((s, l) => s + l.severity, 0) / validLogs.length
      : 0

  insights.push(`Average severity: ${avg.toFixed(1)} / 5`)

  // 🔥 Sleep correlation
  let lowSleepHighSeverity = 0
  let totalLowSleep = 0

  logs.forEach(l => {
    if (l.sleep_hours && l.sleep_hours < 6) {
      totalLowSleep++
      if (l.severity >= 4) lowSleepHighSeverity++
    }
  })

  if (totalLowSleep > 2) {
    const percent = Math.round(
      (lowSleepHighSeverity / totalLowSleep) * 100
    )

    if (percent > 50) {
      insights.push(
        `⚠️ ${percent}% of severe symptoms happen when sleep is below 6 hours`
      )
    }
  }

  // 🔥 Stress correlation
  let highStressHighSeverity = 0
  let totalHighStress = 0

  logs.forEach(l => {
    if (l.stress_level && l.stress_level >= 4) {
      totalHighStress++
      if (l.severity >= 4) highStressHighSeverity++
    }
  })

  if (totalHighStress > 2) {
    const percent = Math.round(
      (highStressHighSeverity / totalHighStress) * 100
    )

    if (percent > 60) {
      insights.push(
        `😰 High stress levels correlate with ${percent}% of severe symptoms`
      )
    }
  }

  // 🔥 Time-of-day correlation
  const morning = logs.filter(l => {
    const h = new Date(l.created_at).getHours()
    return h < 12
  })

  const evening = logs.filter(l => {
    const h = new Date(l.created_at).getHours()
    return h >= 18
  })

  if (morning.length > 2 && evening.length > 2) {
    const mAvg =
      morning.reduce((s, l) => s + l.severity, 0) / morning.length

    const eAvg =
      evening.reduce((s, l) => s + l.severity, 0) / evening.length

    if (eAvg > mAvg) {
      insights.push("Evening symptoms are more severe than morning")
    } else if (mAvg > eAvg) {
      insights.push("Morning symptoms tend to be more severe than evening")
    }
  }

  // 🔥 Trigger detection
  const noteText = logs
    .map(l => l.notes?.toLowerCase() || "")
    .join(" ")

  if (noteText.includes("alcohol")) {
    insights.push("Symptoms often occur after alcohol consumption")
  }

  if (noteText.includes("gym") || noteText.includes("workout")) {
    insights.push("Some symptoms may be related to physical activity")
  }

  if (noteText.includes("stress") || noteText.includes("tension")) {
    insights.push("Stress-related patterns detected in your symptoms")
  }

  // 🔥 Weather correlation
  const weatherGroups: Record<string, any[]> = {}
  logs.forEach(l => {
    if (l.weather) {
      const condition = l.weather.split(' ')[0] // Get main condition
      if (!weatherGroups[condition]) weatherGroups[condition] = []
      weatherGroups[condition].push(l)
    }
  })

  Object.entries(weatherGroups).forEach(([condition, entries]) => {
    if (entries.length >= 3) {
      const avgSeverity = entries.reduce((sum, e) => sum + e.severity, 0) / entries.length
      if (avgSeverity >= 4) {
        insights.push(
          `🌤️ ${condition} weather correlates with more severe symptoms (${avgSeverity.toFixed(1)}/5 average)`
        )
      }
    }
  })

  // 🔥 Medication correlation
  const medEffects: Record<string, { before: number[], after: number[] }> = {}
  logs.forEach(l => {
    if (l.medications && Array.isArray(l.medications)) {
      l.medications.forEach((med: string) => {
        if (!medEffects[med]) medEffects[med] = { before: [], after: [] }
        // Simple logic: if medication was taken, check if next entries are better/worse
        medEffects[med].after.push(l.severity)
      })
    }
  })

  // 🔥 Smart summary
  const hasSignals = insights.some(
    i =>
      i.includes("sleep") ||
      i.includes("alcohol") ||
      i.includes("physical") ||
      i.includes("stress") ||
      i.includes("weather")
  )

  if (hasSignals) {
    insights.unshift(
      "Your symptoms appear to be influenced by lifestyle factors like sleep, stress, weather, and daily habits."
    )
  }

  return insights
}