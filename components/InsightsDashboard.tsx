"use client"

import { useEffect, useState } from "react"

export default function InsightsDashboard() {
  const [insights, setInsights] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch("/api/insights")
        const data = await res.json()
        setInsights(data.insights || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [])

  return (
    <div className="card">
      <h2>🧠 Smart Insights</h2>

      {loading ? (
        <p style={{ color: "#64748b" }}>Loading insights...</p>
      ) : insights.length === 0 ? (
        <p style={{ color: "#64748b" }}>No insights yet</p>
      ) : (
        <div style={{ marginTop: "16px" }}>
          {insights.map((insight, i) => (
            <div
              key={i}
              style={{
                padding: "14px",
                marginBottom: "10px",
                borderRadius: "12px",
                background: "#060d1f",
                border: "1px solid #1a2540",
                color: "#e2e8f0",
              }}
            >
              {insight}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}