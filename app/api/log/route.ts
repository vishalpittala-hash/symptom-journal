import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      symptom,
      severity,
      bodyPart,
      notes,
      sleepHours,
    } = body

    // Basic validation
    if (!symptom || !severity) {
      return NextResponse.json(
        { error: "symptom and severity are required" },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase.from("symptoms").insert([
      {
        symptom,
        severity,
        body_part: bodyPart || null,
        notes: notes || null,
        sleep_hours: sleepHours || null,
        user_email: "test@gmail.com",
      },
    ])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}