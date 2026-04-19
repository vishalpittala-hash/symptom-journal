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
    console.log("History API - Starting...")
    console.log("History API - SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Not set")

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Get user email from query params or use default for testing
    const { searchParams } = new URL(req.url)
    const userEmail = searchParams.get('userEmail') || "user@local.dev"
    console.log("History API - Filtering by user email:", userEmail)

    // Use axios instead of fetch with user email filter
    const response = await axiosInstance.get(
      `${supabaseUrl}/rest/v1/symptoms`,
      {
        params: {
          select: '*',
          order: 'created_at.desc',
          limit: 50,
          'user_email': `eq.${userEmail}`
        },
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    console.log("History API - Response status:", response.status)

    const logs = response.data

    console.log("History API - Logs count:", logs?.length || 0)
    if (logs && logs.length > 0) {
      console.log("History API - Sample log:", logs[0])
    }

    // Transform database field names to match frontend interface
    const transformedData = logs.map((log: any) => ({
      id: log.id,
      symptom: log.symptom,
      severity: log.severity,
      bodyPart: log.body_part,
      notes: log.notes,
      sleepHours: log.sleep_hours,
      stressLevel: log.stress_level,
      weather: log.weather,
      medications: log.medications,
      triggers: log.triggers,
      aiDiscussion: log.ai_discussion,
      timestamp: log.created_at,
      created_at: log.created_at,
      user_email: log.user_email
    }))

    console.log("History API - Returning data count:", transformedData.length)
    return NextResponse.json({ data: transformedData })
  } catch (error) {
    console.error("History API error:", error)
    return NextResponse.json({ error: (error as any).message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Use axiosInstance instead of fetch
    await axiosInstance.delete(
      `${supabaseUrl}/rest/v1/symptoms`,
      {
        params: {
          id: `eq.${id}`
        },
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("History API DELETE error:", error)
    return NextResponse.json({ error: (error as any).message }, { status: 500 })
  }
}
