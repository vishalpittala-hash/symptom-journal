"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

export default function UserProfilePage() {
  const router = useRouter()

  const [age, setAge] = useState("")
  const [gender, setGender] = useState("")
  const [conditions, setConditions] = useState("")
  const [activityLevel, setActivityLevel] = useState("")
  const [userEmail, setUserEmail] = useState("")

  // 🔥 Get logged-in user email
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setUserEmail(data.user.email)
      }
    })
  }, [])

  const handleSave = async () => {
    console.log("Saving profile...")

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        age: Number(age),
        gender,
        conditions,
        activityLevel,
        userEmail, // ✅ now defined
      }),
    })

    console.log("STATUS:", res.status)

    if (res.ok) {
      router.push("/")
    } else {
      alert("Failed to save profile")
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Set up your profile</h1>

      <input
        placeholder="Age"
        value={age}
        onChange={(e) => setAge(e.target.value)}
      />
      <br /><br />

      <input
        placeholder="Gender"
        value={gender}
        onChange={(e) => setGender(e.target.value)}
      />
      <br /><br />

      <input
        placeholder="Conditions (e.g. migraine)"
        value={conditions}
        onChange={(e) => setConditions(e.target.value)}
      />
      <br /><br />

      <select
        value={activityLevel}
        onChange={(e) => setActivityLevel(e.target.value)}
      >
        <option value="">Select Activity Level</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <br /><br />

      <button onClick={handleSave}>Save Profile</button>
    </div>
  )
}