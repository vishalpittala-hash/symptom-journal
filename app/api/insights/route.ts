import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export async function GET() {
  try {
    // ✅ Create authenticated Supabase client
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // ✅ Get logged-in user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ✅ Fetch ONLY this user's data
    const { data: logs, error } = await supabase
      .from("symptoms")
      .select("*")
      .eq("user_email", user.email)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const insights = generateInsights(logs || [])

    // 🔥 Predictive alert (recent trend)
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

    return NextResponse.json({ insights })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// 🔥 MAIN INSIGHT ENGINE
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

  // 🔥 SLEEP CORRELATION (REAL % BASED)
  let lowSleepHighSeverity = 0
  let totalLowSleep = 0

  logs.forEach(l => {
    if (l.sleep_hours && l.sleep_hours < 6) {
      totalLowSleep++

      if (l.severity >= 4) {
        lowSleepHighSeverity++
      }
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

  // 🔥 TIME-OF-DAY CORRELATION
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

  // 🔥 TRIGGER DETECTION (NOTES)
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

  // 🔥 SMART SUMMARY
  const hasSignals = insights.some(
    i =>
      i.includes("sleep") ||
      i.includes("alcohol") ||
      i.includes("physical") ||
      i.includes("stress") 
  )

  if (hasSignals) {
    insights.unshift(
      "Your symptoms appear to be influenced by lifestyle factors like sleep, stress, and daily habits."
    )
  }

  return insights
}