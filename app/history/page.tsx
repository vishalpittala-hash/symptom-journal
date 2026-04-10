"use client"

import { useEffect, useState } from "react"

export default function History() {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/history")
      .then(res => res.json())
      .then(setData)
  }, [])

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">History</h1>

      {data.length === 0 && <p className="mt-4">No entries yet</p>}

      {data.map((item, i) => (
        <div key={i} className="border p-3 mt-3 rounded">
          <p><strong>Symptom:</strong> {item.symptom}</p>
          <p><strong>Mood:</strong> {item.mood}</p>
          <p className="text-sm text-gray-500">
            {new Date(item.created_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  )
}