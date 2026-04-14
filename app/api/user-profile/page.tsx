"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function UserProfilePage() {
  const router = useRouter()

  const [age, setAge] = useState("")
  const [gender, setGender] = useState("")
  const [conditions, setConditions] = useState("")
  const [activityLevel, setActivityLevel] = useState("")

  const handleSave = async () => {
    console.log("Saving profile clicked")

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
      }),
    })

    console.log("RESPONSE:", res)

    router.push("/")
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#050b1a",
        color: "white",
      }}
    >
      <div
        style={{
          padding: "30px",
          borderRadius: "16px",
          background: "#0d1829",
          border: "1px solid #1a2540",
          width: "320px",
        }}
      >
        <h2 style={{ marginBottom: "16px" }}>Set up your profile</h2>

        <input
          placeholder="Age"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
        />

        <input
          placeholder="Gender"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
        />

        <input
          placeholder="Conditions (e.g. migraine)"
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
          style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
        />

        <select
          value={activityLevel}
          onChange={(e) => setActivityLevel(e.target.value)}
          style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
        >
          <option value="">Select Activity Level</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <button
          onClick={handleSave}
          style={{
            width: "100%",
            padding: "10px",
            background: "#0f766e",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Save Profile
        </button>
      </div>
    </div>
  )
}