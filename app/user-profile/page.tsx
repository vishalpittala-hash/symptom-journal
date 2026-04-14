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
  const [loading, setLoading] = useState(false)

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
    if (!age || !gender || !activityLevel) {
      alert("Please fill required fields")
      return
    }

    setLoading(true)

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
        userEmail,
      }),
    })

    setLoading(false)

    if (res.ok) {
      router.push("/")
    } else {
      alert("Failed to save profile")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center px-4">
      
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
        
        {/* Header */}
       {/* Header */}
<div className="mb-6 text-center">
  <div className="text-3xl mb-2">👤</div>

  <h1 className="text-2xl font-bold text-gray-800">
    Set up your profile
  </h1>

  <p className="text-sm text-gray-500 mt-1">
    This helps us personalize your health insights
  </p>
</div>

        {/* Inputs */}
        <div className="space-y-4">
          
          <input
            type="number"
            placeholder="Age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />

          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          <input
            type="text"
            placeholder="Conditions (e.g. migraine, asthma)"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />

          <select
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Activity Level</option>
            <option value="low">Low</option>
            <option value="medium">Moderate</option>
            <option value="high">High</option>
          </select>

        </div>

        {/* Button */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>

      </div>
    </div>
  )
}