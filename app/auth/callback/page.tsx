"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 🔥 This extracts token from URL and sets session
    supabase.auth.getSession().then(() => {
      router.push("/")
    })
  }, [])

  return <p style={{ padding: 20 }}>Logging you in...</p>
}