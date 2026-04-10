"use client"

import { useState } from "react"

export default function Journal() {
  const [symptom, setSymptom] = useState("")
  const [mood, setMood] = useState("")

  const handleSubmit = async () => {
    await fetch("/api/log", {
      method: "POST",
      body: JSON.stringify({ symptom, mood }),
    })

    alert("Saved!")

    setSymptom("")
    setMood("")
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