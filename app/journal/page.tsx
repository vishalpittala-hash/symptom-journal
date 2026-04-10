"use client"

import { useState } from "react"

export default function Journal() {
  const [symptom, setSymptom] = useState("")
  const [mood, setMood] = useState("")

  const handleSubmit = async () => {
    try {
      const res = await fetch("/api/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // ✅ REQUIRED
        },
        body: JSON.stringify({
          symptom,
          mood,
          notes: "", // ✅ default
          bodyPart: "", // ✅ default
          timestamp: new Date().toISOString(), // ✅ important
        }),
      })

      const result = await res.json()
      console.log("SAVE RESPONSE:", result)

      if (!res.ok) {
        throw new Error(result.error || "Save failed")
      }

      alert("Saved!")

      setSymptom("")
      setMood("")
    } catch (err) {
      console.error(err)
      alert("Failed to save entry")
    }
  }

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">Daily Symptom Log</h1>

      <input
        placeholder="Enter symptom"
        value={symptom}
        onChange={(e) => setSymptom(e.target.value)}
        className="border p-2 block mt-4 w-64"
      />

      <input
        placeholder="Enter mood"
        value={mood}
        onChange={(e) => setMood(e.target.value)}
        className="border p-2 block mt-4 w-64"
      />

      <button
        onClick={handleSubmit}
        className="bg-blue-500 text-white p-2 mt-4"
      >
        Save
      </button>
    </div>
  )
}