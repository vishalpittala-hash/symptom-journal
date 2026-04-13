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

  // 🔥 Identify main insight (priority insight)
  const mainInsight = insights.find(i =>
    i.toLowerCase().includes("worse") ||
    i.toLowerCase().includes("increase") ||
    i.toLowerCase().includes("high")
  )

  const otherInsights = insights.filter(i => i !== mainInsight)

  return (
    <div className="card">
      <h2>🧠 Smart Insights</h2>

      {/* Loading state */}
      {loading && (
        <p style={{ color: "#64748b", marginTop: "12px" }}>
          Loading insights...
        </p>
      )}

      {/* Empty state */}
      {!loading && insights.length === 0 && (
        <p style={{ color: "#64748b", marginTop: "12px" }}>
          No insights yet. Add more logs to see patterns.
        </p>
      )}

      {/* 🔥 Highlighted main insight */}
      {!loading && mainInsight && (
        <div
          style={{
            padding: "18px",
            marginTop: "16px",
            marginBottom: "16px",
            borderRadius: "14px",
            background: "#7c2d12",
            border: "1px solid #ea580c",
            color: "#fff",
            fontWeight: 600,
            lineHeight: 1.5,
          }}
        >
          ⚠️ {mainInsight}
        </div>
      )}

      {/* Other insights */}
      {!loading && otherInsights.length > 0 && (
        <div style={{ marginTop: "10px" }}>
          {otherInsights.map((insight, i) => (
            <div
              key={i}
              style={{
                padding: "12px",
                marginBottom: "10px",
                borderRadius: "10px",
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