import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userEmail = searchParams.get("email")

  if (!userEmail) {
    return NextResponse.json(null)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_email", userEmail)
    .single()

  if (error) {
    return NextResponse.json(null)
  }

  return NextResponse.json(data)
}