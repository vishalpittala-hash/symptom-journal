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
  const avg =
    logs.reduce((s, l) => s + (l.severity || 0), 0) / logs.length

  insights.push(`Average severity: ${avg.toFixed(1)} / 5`)

  // Sleep correlation
  const low = logs.filter(l => l.sleep_hours && l.sleep_hours < 6)
  const normal = logs.filter(l => l.sleep_hours && l.sleep_hours >= 6)

  if (low.length && normal.length) {
    const lowAvg =
      low.reduce((s, l) => s + l.severity, 0) / low.length

    const normalAvg =
      normal.reduce((s, l) => s + l.severity, 0) / normal.length

    if (lowAvg > normalAvg) {
      insights.push(
        `Symptoms are worse on low sleep days (${lowAvg.toFixed(
          1
        )} vs ${normalAvg.toFixed(1)})`
      )
    }
  }

  return insights
}