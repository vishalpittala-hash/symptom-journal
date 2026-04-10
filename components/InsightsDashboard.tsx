"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

export default function InsightsDashboard() {
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/history")
      .then((res) => res.json())
      .then(setLogs)
  }, [])

  // Total logs
  const total = logs.length

  // Most common symptom
  const mostCommon = (() => {
    const map: any = {}
    logs.forEach((l) => {
      map[l.symptom] = (map[l.symptom] || 0) + 1
    })
    return Object.keys(map).sort((a, b) => map[b] - map[a])[0] || "-"
  })()

  // Average severity
  const avgSeverity: string = (() => {
    const map: any = { Mild: 1, Moderate: 2, Severe: 3 }

    if (logs.length === 0) return "-"

    const total = logs.reduce((sum, l) => {
      return sum + (map[l.mood] || 0)
    }, 0)

    return (total / logs.length).toFixed(1)
  })()

  // Chart data
  const chartData = (() => {
    const map: any = {}

    logs.forEach((l) => {
      map[l.mood] = (map[l.mood] || 0) + 1
    })

    return Object.keys(map).map((key) => ({
      name: key,
      value: map[key],
    }))
  })()

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      
      {/* Title */}
      <h2
        style={{
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        📊 Insights Dashboard
      </h2>

      {/* Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        {/* Total Logs */}
        <div
          style={cardStyle}
        >
          <p style={labelStyle}>Total Logs</p>
          <p style={valueStyle}>{total}</p>
        </div>

        {/* Top Symptom */}
        <div
          style={cardStyle}
        >
          <p style={labelStyle}>Top Symptom</p>
          <p style={{ ...valueStyle, fontSize: 18 }}>{mostCommon}</p>
        </div>

        {/* Avg Severity */}
        <div
          style={cardStyle}
        >
          <p style={labelStyle}>Avg Severity</p>
          <p style={valueStyle}>{avgSeverity}</p>
        </div>
      </div>

      {/* Chart */}
      <div style={cardStyle}>
        <h3 style={{ marginBottom: 12 }}>Severity Breakdown</h3>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* 🔥 Reusable styles */

const cardStyle: React.CSSProperties = {
  background: "#0d1829",
  padding: 18,
  borderRadius: 16,
  border: "1px solid #1a2540",
  boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  transition: "transform 0.2s ease",
}

const labelStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
}

const valueStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  marginTop: 6,
}