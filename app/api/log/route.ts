"use server"

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

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

    // ✅ Validation
    if (!symptom || !severity) {
      return NextResponse.json(
        { error: "symptom and severity are required" },
        { status: 400 }
      )
    }

    // ✅ Create Supabase client (NEW WAY)
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
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // ✅ Insert user-specific data
    const { error } = await supabase.from("symptoms").insert([
      {
        symptom,
        severity,
        body_part: bodyPart || null,
        notes: notes || null,
        sleep_hours: sleepHours || null,
        user_email: user.email, // 🔥 KEY
      },
    ])

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}