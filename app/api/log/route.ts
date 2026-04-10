import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  const body = await req.json()

  const { symptom, mood, notes, bodyPart, timestamp } = body

  // Basic validation
  if (!symptom || !mood) {
    return NextResponse.json(
      { error: "symptom and mood are required" },
      { status: 400 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.from("symptoms").insert([
    {
      symptom:    symptom,
      mood:       mood,
      notes:      notes      || null,
      body_Part:  bodyPart   || null,
      timestamp:  timestamp  || new Date().toISOString(),
    },
  ])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
