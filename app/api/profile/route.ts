import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { age, gender, conditions, activityLevel, userEmail } = body

    if (!userEmail) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
      .from("user_profiles")
      .upsert({
        user_email: userEmail,
        age,
        gender,
        conditions,
        activity_level: activityLevel,
      })

    if (error) {
      console.error("SUPABASE ERROR:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("SERVER ERROR:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}