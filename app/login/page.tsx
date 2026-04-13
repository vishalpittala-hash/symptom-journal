"use client"

import { useState } from "react"
import { createClient } from "@supabase/supabase-js"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async () => {
    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.signInWithOtp({
      email,
    })

    if (error) {
      setMessage("Error sending login link")
    } else {
      setMessage("Check your email for login link 🚀")
    }

    setLoading(false)
  }

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#050b1a",
      color: "white"
    }}>
      <div style={{
        padding: "30px",
        borderRadius: "16px",
        background: "#0d1829",
        border: "1px solid #1a2540",
        width: "320px"
      }}>
        <h2 style={{ marginBottom: "16px" }}>Login</h2>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            marginBottom: "12px",
            border: "1px solid #1a2540",
            background: "#060d1f",
            color: "white"
          }}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            background: "#0f766e",
            color: "white",
            border: "none",
            cursor: "pointer"
          }}
        >
          {loading ? "Sending..." : "Send Magic Link"}
        </button>

        {message && (
          <p style={{ marginTop: "10px", fontSize: "14px", color: "#94a3b8" }}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}