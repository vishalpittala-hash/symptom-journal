"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

type Entry = {
  id: string
  symptom: string
  mood: string
  notes?: string
  body_part?: string // ✅ FIXED
  timestamp?: string
  created_at?: string
}

type Toast = { message: string; type: "success" | "error" }

function parseMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/^\* (.*$)/gm, "<li>$1</li>")
    .replace(/^- (.*$)/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hul])(.*)/gm, (line) =>
      line.trim() ? `<p>${line}</p>` : ""
    )
}

const BODY_PARTS = [
  { id: "head", label: "Head", icon: "🧠" },
  { id: "chest", label: "Chest", icon: "🫁" },
  { id: "stomach", label: "Stomach", icon: "🫃" },
  { id: "limbs", label: "Limbs", icon: "🦵" },
  { id: "skin", label: "Skin", icon: "🩹" },
  { id: "general", label: "General", icon: "🌡️" },
]

const SEVERITY_COLORS: Record<string, string> = {
  Mild: "#1D9E75",
  Moderate: "#EF9F27",
  Severe: "#E24B4A",
}

export default function Home() {
  const [name, setName] = useState("")
  const [nameSet, setNameSet] = useState(false)
  const [nameInput, setNameInput] = useState("")

  const [symptom, setSymptom] = useState("")
  const [severity, setSeverity] = useState("")
  const [notes, setNotes] = useState("")
  const [bodyPart, setBodyPart] = useState("")

  const [data, setData] = useState<Entry[]>([])
  const [analysis, setAnalysis] = useState("")
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<"log" | "history" | "analysis">("log")
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("sj_name")
    if (saved) {
      setName(saved)
      setNameSet(true)
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = (message: string, type: Toast["type"] = "success") =>
    setToast({ message, type })

  const fetchData = async () => {
    const res = await fetch("/api/history")
    const result = await res.json()
    if (Array.isArray(result)) setData(result)
  }

  const handleSaveName = () => {
    if (!nameInput.trim()) return
    const n = nameInput.trim()
    setName(n)
    setNameSet(true)
    localStorage.setItem("sj_name", n)
  }

  const handleSave = async () => {
    if (!symptom.trim()) {
      showToast("Enter symptom", "error")
      return
    }
    if (!severity) {
      showToast("Select severity", "error")
      return
    }

    await fetch("/api/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symptom,
        mood: severity,
        notes,
        bodyPart,
        timestamp: new Date().toISOString(),
      }),
    })

    setSymptom("")
    setSeverity("")
    setNotes("")
    setBodyPart("")

    showToast("Saved ✓")
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return // ✅ added

    await fetch("/api/history", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    })

    fetchData()
    showToast("Deleted")
  }

  const handleAnalyze = async () => {
    setLoading(true)
    setAnalysis("")

    const res = await fetch("/api/analyze")
    const result = await res.json()

    setAnalysis(result.analysis || "No analysis")
    setLoading(false)
  }

  const getChartData = () => {
    const counts: any = {}
    data.forEach((item) => {
      counts[item.mood] = (counts[item.mood] || 0) + 1
    })

    return Object.keys(counts).map((key) => ({
      name: key,
      value: counts[key],
    }))
  }

  const formatTime = (t?: string) => {
    if (!t) return ""
    return new Date(t).toLocaleString()
  }

  if (!nameSet) {
    return (
      <div className="container">
        <h1>Symptom Journal</h1>
        <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
        <button onClick={handleSaveName}>Start</button>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>Symptom Journal</h1>
      <p>Hello {name}</p>

      <div>
        <button onClick={() => setTab("log")}>Log</button>
        <button onClick={() => setTab("history")}>History</button>
        <button onClick={() => setTab("analysis")}>Analysis</button>
      </div>

      {tab === "log" && (
        <div>
          <input value={symptom} onChange={(e) => setSymptom(e.target.value)} />

          <div>
            {["Mild", "Moderate", "Severe"].map((s) => (
              <button key={s} onClick={() => setSeverity(s)}>
                {s}
              </button>
            ))}
          </div>

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div>
            {BODY_PARTS.map((b) => (
              <button key={b.id} onClick={() => setBodyPart(b.id)}>
                {b.label}
              </button>
            ))}
          </div>

          <button onClick={handleSave}>Save</button>
        </div>
      )}

      {tab === "history" && (
        <div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={getChartData()}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value">
                {getChartData().map((entry, index) => (
                  <Cell key={index} fill={SEVERITY_COLORS[entry.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {data.map((item) => (
            <div key={item.id}>
              <p>{item.symptom}</p>

              {item.body_part && ( // ✅ FIXED
                <p>
                  {
                    BODY_PARTS.find((b) => b.id === item.body_part)?.label
                  }
                </p>
              )}

              <p>{item.mood}</p>
              <p>{item.notes}</p>
              <p>{formatTime(item.timestamp)}</p>

              <button onClick={() => handleDelete(item.id)}>X</button>
            </div>
          ))}
        </div>
      )}

      {tab === "analysis" && (
        <div>
          <button onClick={handleAnalyze}>
            {loading ? "Loading..." : "Analyze"}
          </button>

          <div dangerouslySetInnerHTML={{ __html: parseMarkdown(analysis) }} />
        </div>
      )}

      {toast && <div>{toast.message}</div>}
    </div>
  )
}