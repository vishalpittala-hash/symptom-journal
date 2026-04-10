import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  const body = await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase.from("symptoms").insert([
    {
      user_email: "test@gmail.com",
      symptom: body.symptom,
      mood: body.mood,
    },
  ])

  console.log("DATA:", data)
  console.log("ERROR:", error)

  if (error) {
    return NextResponse.json({ error: error.message })
  }

  return NextResponse.json({ success: true })
}