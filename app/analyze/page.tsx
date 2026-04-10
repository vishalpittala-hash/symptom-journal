"use client"

import { useEffect, useState } from "react"

export default function Analyze() {
  const [analysis, setAnalysis] = useState("Loading...")

  useEffect(() => {
    fetch("/api/analyze")
      .then(res => res.json())
      .then(data => setAnalysis(data.analysis))
  }, [])

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">AI Analysis</h1>

      <div className="mt-4 p-4 border rounded bg-gray-50 whitespace-pre-line">
        {analysis}
      </div>
    </div>
  )
}