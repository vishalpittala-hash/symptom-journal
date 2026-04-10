"use client"

import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, Tooltip } from "recharts"

export default function Home() {
  const [name, setName] = useState("")
  const [symptom, setSymptom] = useState("")
  const [severity, setSeverity] = useState("")
  const [data, setData] = useState<any[]>([])
  const [analysis, setAnalysis] = useState("")
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState("log")

  const fetchData = async () => {
    const res = await fetch("/api/history")
    const result = await res.json()
    if (Array.isArray(result)) setData(result)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSave = async () => {
    if (!symptom || !severity) return

    await fetch("/api/log", {
      method: "POST",
      body: JSON.stringify({ symptom, mood: severity }),
    })

    setSymptom("")
    setSeverity("")
    fetchData()
  }

  const handleAnalyze = async () => {
    setLoading(true)

    const res = await fetch("/api/analyze")
    const result = await res.json()

    setAnalysis(`👤 ${name || "User"}\n\n${result.analysis}`)

    setLoading(false)
    setTab("analysis")
  }

  // ✅ FIXED CHART (works for any data)
  const getChartData = () => {
    const counts: any = {}

    data.forEach((item) => {
      const key = item.mood || "Unknown"
      counts[key] = (counts[key] || 0) + 1
    })

    return Object.keys(counts).map((key) => ({
      name: key,
      value: counts[key],
    }))
  }

  const COLORS = ["#3eb8c0", "#8884d8", "#ff6b6b", "#ffc658"]

  return (
    <>
      <style>{`
        body {
          background: #050b1a;
          color: white;
          font-family: sans-serif;
        }

        .container {
          max-width: 650px;
          margin: auto;
          padding: 30px;
        }

        .title {
          text-align: center;
          font-size: 54px;
          font-weight: 700;
          margin-bottom: 10px;
          background: linear-gradient(90deg, #ffffff, #3eb8c0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          text-align: center;
          color: #94a3b8;
          margin-bottom: 30px;
          font-size: 18px;
          font-weight: 500;
        }

        h2 {
          font-size: 24px;
          margin-bottom: 15px;
        }

        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 25px;
        }

        .tab {
          flex: 1;
          padding: 14px;
          border-radius: 12px;
          background: #0d1829;
          text-align: center;
          cursor: pointer;
        }

        .active {
          background: teal;
        }

        .card {
          background: #0d1829;
          padding: 25px;
          border-radius: 16px;
          margin-top: 20px;
        }

        input {
          width: 100%;
          padding: 16px;
          margin-top: 10px;
          border-radius: 10px;
          font-size: 18px;
          border: none;
        }

        button {
          margin-top: 20px;
          padding: 16px;
          width: 100%;
          font-size: 18px;
          border-radius: 12px;
          background: teal;
          color: white;
          border: none;
          cursor: pointer;
        }

        .severity {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }

        .sev-btn {
          flex: 1;
          padding: 14px;
          border-radius: 10px;
          background: #060d1f;
          cursor: pointer;
          text-align: center;
        }

        .selected {
          background: teal;
        }

        .entry {
          margin-top: 15px;
          padding: 15px;
          background: #060d1f;
          border-radius: 12px;
          font-size: 18px;
        }

        .analysis-box {
          margin-top: 20px;
        }

        .ai-heading {
          font-size: 20px;
          margin-top: 20px;
          color: #3eb8c0;
        }

        .ai-text {
          font-size: 17px;
          line-height: 1.8;
        }

        .chart-wrap {
          display: flex;
          justify-content: center;
        }
      `}</style>

      <div className="container">

        <h1 className="title">🧠 Symptom Journal</h1>
        <p className="subtitle">Track symptoms. Get AI insights.</p>

        {/* TABS */}
        <div className="tabs">
          <div className={`tab ${tab === "log" ? "active" : ""}`} onClick={() => setTab("log")}>Log</div>
          <div className={`tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>History</div>
          <div className={`tab ${tab === "analysis" ? "active" : ""}`} onClick={() => setTab("analysis")}>Analysis</div>
        </div>

        {/* LOG */}
        {tab === "log" && (
          <>
            <div className="card">
              <h2>Your Name</h2>
              <input
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="card">
              <h2>Log Symptoms</h2>

              <input
                placeholder="Symptom"
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
              />

              <div className="severity">
                {["Mild", "Moderate", "Severe"].map((s) => (
                  <div
                    key={s}
                    className={`sev-btn ${severity === s ? "selected" : ""}`}
                    onClick={() => setSeverity(s)}
                  >
                    {s}
                  </div>
                ))}
              </div>

              <button onClick={handleSave}>Save Entry</button>
            </div>
          </>
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <>
            <div className="card">
              <h2>Severity Overview</h2>

              {data.length === 0 ? (
                <p>No data yet</p>
              ) : (
                <div className="chart-wrap">
                  <PieChart width={320} height={260}>
                    <Pie
                      data={getChartData()}
                      dataKey="value"
                      outerRadius={90}
                      label
                    >
                      {getChartData().map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </div>
              )}
            </div>

            <div className="card">
              <h2>History</h2>

              {data.map((item, i) => (
                <div key={i} className="entry">
                  <div><b>{i + 1}. Symptom:</b> {item.symptom}</div>
                  <div><b>Severity:</b> {item.mood}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ANALYSIS */}
        {tab === "analysis" && (
          <div className="card">
            <h2>AI Analysis</h2>

            <button onClick={handleAnalyze}>Analyze</button>

            {loading && <p>Analyzing...</p>}

            {analysis && (
              <div className="analysis-box">
                {analysis.split("\n").map((line, i) => {
                  if (line.toLowerCase().includes("pattern")) {
                    return <h3 key={i} className="ai-heading">📊 Patterns</h3>
                  }
                  if (line.toLowerCase().includes("cause")) {
                    return <h3 key={i} className="ai-heading">⚠️ Causes</h3>
                  }
                  if (line.toLowerCase().includes("advice")) {
                    return <h3 key={i} className="ai-heading">💡 Advice</h3>
                  }
                  return <p key={i} className="ai-text">{line}</p>
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </>
  )
}