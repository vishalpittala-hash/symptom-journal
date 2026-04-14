"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const router = useRouter()

  const [age, setAge] = useState("")
  const [gender, setGender] = useState("")
  const [conditions, setConditions] = useState("")
  const [activityLevel, setActivityLevel] = useState("")

  const handleSave = async () => {
    await fetch("/api/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        age: Number(age),
        gender,
        conditions,
        activityLevel,
      }),
    })

    router.push("/")
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Set up your profile</h1>

      <input placeholder="Age" value={age} onChange={(e) => setAge(e.target.value)} />
      <input placeholder="Gender" value={gender} onChange={(e) => setGender(e.target.value)} />
      <input placeholder="Conditions (e.g. migraine)" value={conditions} onChange={(e) => setConditions(e.target.value)} />

      <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}>
        <option value="">Select Activity Level</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <button onClick={handleSave}>Save Profile</button>
    </div>
  )
}