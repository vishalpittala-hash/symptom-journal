import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: logs, error } = await supabase
      .from("symptoms")
      .select("*")
      .eq("user_email", "test@gmail.com")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const insights = generateInsights(logs || [])

    return NextResponse.json({ insights })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function generateInsights(logs: any[]) {
  if (!logs.length) return ["No data yet"]

  const insights: string[] = []

  // Total logs
  insights.push(`You logged ${logs.length} symptoms recently`)

  // Most common symptom
  const count: Record<string, number> = {}
  logs.forEach(l => {
    count[l.symptom] = (count[l.symptom] || 0) + 1
  })

  const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0]
  if (top) insights.push(`Most frequent symptom: ${top[0]}`)

  // Avg severity
  const validLogs = logs.filter(
    l => l.severity !== null && l.severity !== undefined
  )
  
  const avg =
    validLogs.length > 0
      ? validLogs.reduce((s, l) => s + l.severity, 0) / validLogs.length
      : 0

  insights.push(`Average severity: ${avg.toFixed(1)} / 5`)

  // Sleep correlation
  // 🔥 Advanced Sleep Correlation
const lowSleep = logs.filter(l => l.sleep_hours && l.sleep_hours < 6)
const goodSleep = logs.filter(l => l.sleep_hours && l.sleep_hours >= 6)

if (lowSleep.length > 2 && goodSleep.length > 2) {
  const lowAvg =
    lowSleep.reduce((s, l) => s + l.severity, 0) / lowSleep.length

  const goodAvg =
    goodSleep.reduce((s, l) => s + l.severity, 0) / goodSleep.length

  if (lowAvg > goodAvg) {
    const ratio = (lowAvg / goodAvg).toFixed(1)

    insights.push(
      `Symptoms are ${ratio}x more severe on low sleep days`
    )
  }
}
// 🔥 Time of day correlation
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
    insights.push(
      `Evening symptoms are more severe than morning`
    )
  }
}

  return insights
}