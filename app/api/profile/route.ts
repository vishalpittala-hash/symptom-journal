import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { age, gender, conditions, activityLevel, userEmail } = body

    // 🔥 Use service role (no auth issues)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: insertError } = await supabase
      .from("user_profiles")
      .upsert({
        user_email: userEmail,
        age,
        gender,
        conditions,
        activity_level: activityLevel,
      })

    if (insertError) {
      console.error("SUPABASE ERROR:", insertError)
      return NextResponse.json(
        { error: insertError.message },
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