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

  // 🔥 Identify main insight
  const mainInsight = insights.find(i =>
    i.toLowerCase().includes("worse") ||
    i.toLowerCase().includes("increase") ||
    i.toLowerCase().includes("high")
  )

  const otherInsights = insights.filter(i => i !== mainInsight)

  return (
    <div className="card">
      <h2 style={{ marginBottom: "16px" }}>🧠 Smart Insights</h2>

      {/* Loading */}
      {loading && (
        <p style={{ color: "#64748b" }}>Loading insights...</p>
      )}

      {/* Empty */}
      {!loading && insights.length === 0 && (
        <p style={{ color: "#64748b" }}>
          No insights yet. Add more logs.
        </p>
      )}

      {/* ✅ CONTENT */}
      {!loading && insights.length > 0 && (
        <>
          {/* 🔷 Top Row */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            
            {/* Total Logs */}
            <div style={{
              flex: 1,
              padding: "16px",
              borderRadius: "14px",
              background: "#0d1829",
              border: "1px solid #1a2540"
            }}>
              <p style={{ color: "#64748b", fontSize: "13px" }}>Total Logs</p>
              <h3 style={{ fontSize: "22px" }}>
                {insights[0]?.match(/\d+/)?.[0] || "-"}
              </h3>
            </div>

            {/* Top Symptom */}
            <div style={{
              flex: 1,
              padding: "16px",
              borderRadius: "14px",
              background: "#0d1829",
              border: "1px solid #1a2540"
            }}>
              <p style={{ color: "#64748b", fontSize: "13px" }}>Top Symptom</p>
              <h3 style={{ fontSize: "18px" }}>
                {insights[1]?.split(":")[1] || "-"}
              </h3>
            </div>
          </div>

          {/* 🔥 Main Insight */}
          {mainInsight && (
            <div style={{
              padding: "20px",
              marginBottom: "16px",
              borderRadius: "16px",
              background: "#7c2d12",
              border: "1px solid #ea580c",
              color: "#fff",
              fontWeight: 600,
              fontSize: "16px"
            }}>
              ⚠️ {mainInsight}
            </div>
          )}

          {/* 🔷 Avg Severity */}
          <div style={{
            padding: "16px",
            borderRadius: "14px",
            background: "#0d1829",
            border: "1px solid #1a2540",
            marginBottom: "12px"
          }}>
            <p style={{ color: "#64748b", fontSize: "13px" }}>
              Average Severity
            </p>
            <h3 style={{ fontSize: "20px" }}>
              {insights.find(i => i.includes("Average")) || "-"}
            </h3>
          </div>

          {/* Other insights */}
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
        </>
      )}
    </div>
  )
}