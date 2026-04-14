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
      userEmail, // 🔥 REQUIRED
    } = body

    if (!symptom || !severity || !userEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
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
        user_email: userEmail,
      },
    ])

    if (error) {
      console.error("LOG ERROR:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("SERVER ERROR:", err)
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}