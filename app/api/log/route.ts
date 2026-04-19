import { NextResponse } from "next/server"
import axios from 'axios'
import https from 'https'

// Create axios instance that ignores SSL certificate errors (for development)
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
})

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      symptom,
      severity,
      bodyPart,
      notes,
      sleepHours,
      stressLevel,
      weather,
      medications,
      triggers,
      userEmail, // Optional now
      aiDiscussion, // Conversation history
      id, // Entry ID for updates
    } = body

    console.log("Log API - Received data:", body)

    // If ID is provided, allow updates without requiring symptom/severity (for AI discussion updates)
    if (!id && (!symptom || !severity)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Require user email for data isolation
    if (!userEmail) {
      return NextResponse.json(
        { error: "Missing user email - required for data isolation" },
        { status: 400 }
      )
    }

    const userEmailToUse = userEmail
    console.log("Log API - Using email:", userEmailToUse)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // If ID is provided, update existing entry
    if (id) {
      await axiosInstance.patch(
        `${supabaseUrl}/rest/v1/symptoms`,
        {
          ai_discussion: aiDiscussion || null,
        },
        {
          params: {
            id: `eq.${id}`,
          },
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        }
      )
      console.log("Log API - Update Success")
      return NextResponse.json({ success: true, updated: true })
    }

    // Use axiosInstance instead of fetch
    await axiosInstance.post(
      `${supabaseUrl}/rest/v1/symptoms`,
      {
        symptom,
        severity,
        body_part: bodyPart || null,
        notes: notes || null,
        sleep_hours: sleepHours || null,
        stress_level: stressLevel || null,
        weather: weather || null,
        medications: medications || null,
        triggers: triggers || null,
        user_email: userEmailToUse,
        ai_discussion: aiDiscussion || null,
      },
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    console.log("Log API - Success")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Log API error:", error)
    return NextResponse.json({ error: (error as any).message }, { status: 500 })
  }
}