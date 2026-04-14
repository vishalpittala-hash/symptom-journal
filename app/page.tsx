"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import jsPDF from "jspdf"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import InsightsDashboard from "../components/InsightsDashboard"
// ─── Types ────────────────────────────────────────────────────────────────────
type Entry = {
  id: string
  symptom: string
  mood: string
  notes?: string
  body_Part?: string
  timestamp?: string
  created_at?: string
}

type Toast = { message: string; type: "success" | "error" }

// ─── Markdown parser ──────────────────────────────────────────────────────────
function parseMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/(?:^\* .*$\n?|^- .*$\n?)+/gm, (block) => {
      const items = block
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => `<li>${l.replace(/^[*-] /, "")}</li>`)
        .join("")
      return `<ul>${items}</ul>`
    })
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hul])(.*)/gm, (line) =>
      line.trim() ? `<p>${line}</p>` : ""
    )
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BODY_PARTS = [
  { id: "head",    label: "Head",    icon: "🧠" },
  { id: "chest",   label: "Chest",   icon: "🫁" },
  { id: "stomach", label: "Stomach", icon: "🫃" },
  { id: "limbs",   label: "Limbs",   icon: "🦵" },
  { id: "skin",    label: "Skin",    icon: "🩹" },
  { id: "general", label: "General", icon: "🌡️" },
]

const SEVERITY_COLORS: Record<string, string> = {
  Mild:     "#1D9E75",
  Moderate: "#EF9F27",
  Severe:   "#E24B4A",
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState("")


  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data } = await supabase.auth.getUser()

      // ❌ Not logged in
      if (!data.user) {
        router.push("/login")
        return
      }

      const email = data.user.email || ""
      setUserEmail(email)

      try {
        const res = await fetch(`/api/get-profile?email=${email}`)
        const profile = await res.json()

        console.log("PROFILE:", profile)

        // 🔥 FIXED LOGIC
        if (!profile || Object.keys(profile).length === 0) {
          router.push("/user-profile")
          return
        }

      } catch (err) {
        console.error("Profile fetch error", err)
      }

      setLoading(false)
    }

    checkUser()
  }, [])

  // 🔥 BLOCK UI UNTIL READY

  const handleLogout = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleDownloadReport = () => {
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text("Health Report", 20, 20)

    doc.setFontSize(12)
    doc.text(`User: ${userEmail}`, 20, 30)
    doc.text(`Entries: ${data.length}`, 20, 40)

    const valid = data.filter((d) => d.mood)
    const avg =
      valid.length > 0
        ? valid.reduce(
            (sum, d) =>
              sum +
              (d.mood === "Mild" ? 1 : d.mood === "Moderate" ? 3 : 5),
            0
          ) / valid.length
        : 0

    doc.text(`Average Severity: ${avg.toFixed(1)} / 5`, 20, 50)

    const count: Record<string, number> = {}
    data.forEach((d) => {
      count[d.symptom] = (count[d.symptom] || 0) + 1
    })

    const top = Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    doc.text("Top Symptoms:", 20, 60)

    top.forEach(([symptom, count], i) => {
      doc.text(`- ${symptom} (${count})`, 20, 70 + i * 10)
    })

    doc.save("health-report.pdf")
  }

  // 👇 KEEP YOUR EXISTING UI RETURN BELOW

  // Onboarding
  const [name, setName]           = useState("")
  const [nameSet, setNameSet]     = useState(false)
  const [nameInput, setNameInput] = useState("")

  // Log form
  const [symptom,  setSymptom]  = useState("")
  const [severity, setSeverity] = useState("")
  const [notes,    setNotes]    = useState("")
  const [bodyPart, setBodyPart] = useState("")
  const [smartInput, setSmartInput] = useState("")

  // App state
  const [data,     setData]     = useState<Entry[]>([])
  const [analysis, setAnalysis] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [tab, setTab] = useState<"log" | "history" | "analysis" | "insights">("log")
  const [toast,    setToast]    = useState<Toast | null>(null)

  // ── Fetch history ──
  const fetchData = async () => {
    try {
      const res = await fetch("/api/history")
      const result = await res.json()
      if (Array.isArray(result)) {
        setData(result)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // ── On mount: load name + history ──
  useEffect(() => {
    const saved = localStorage.getItem("sj_name")
    if (saved) { setName(saved); setNameSet(true) }
    fetchData()
  }, [])

  // ── Auto-dismiss toast ──
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = (message: string, type: Toast["type"] = "success") =>
    setToast({ message, type })

  // ── Save name ──
  const handleSaveName = () => {
    if (!nameInput.trim()) return
    const n = nameInput.trim()
    const capitalized = n.charAt(0).toUpperCase() + n.slice(1)
    setName(capitalized)
    setNameSet(true)
    localStorage.setItem("sj_name", capitalized)
  }

  // ── Save entry ──
  const handleSave = async () => {
    if (!symptom.trim()) { showToast("Please enter a symptom.", "error"); return }
    if (!severity)       { showToast("Please select a severity.", "error"); return }

    setSaving(true)
    try {
      const res = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptom: symptom.trim(),
          severity: severity === "Mild" ? 1 : severity === "Moderate" ? 3 : 5,
sleepHours: 6, // temporary (we’ll improve later)
          notes,
          bodyPart: bodyPart || null,
          userEmail,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || "Save failed")
      }

      setSymptom("")
      setSeverity("")
      setNotes("")
      setBodyPart("")

      await fetchData()
      showToast("Entry saved ✓")
    } catch (err) {
      console.error(err)
      showToast("Failed to save entry.", "error")
    }
    setSaving(false)
  }

  // ── Delete entry ──
  const handleDelete = async (id: string) => {
    try {
      await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      fetchData()
      showToast("Entry deleted.")
    } catch {
      showToast("Could not delete entry.", "error")
    }
  }

  const handleSmartParse = async () => {
    if (!smartInput) return
  
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: smartInput }),
      })
  
      const data = await res.json()
  
      setSymptom(data.symptom)
      setSeverity(
        data.severity === 1
          ? "Mild"
          : data.severity === 3
          ? "Moderate"
          : "Severe"
      )
      setBodyPart(data.bodyPart || "")
      setNotes(data.notes || "")
    } catch (err) {
      console.error(err)
    }
  }

  // ── Analyze ──
  const handleAnalyze = async () => {
    if (!userEmail) {
      showToast("User not loaded yet. Try again.", "error")
      return
    }
  
    if (data.length === 0) {
      showToast("Log some symptoms first.", "error")
      return
    }
  
    setIsAnalyzing(true)
    setAnalysis("")
  
    try {
      const res = await fetch(`/api/analyze?email=${userEmail}`)
      const result = await res.json()
      setAnalysis(result.analysis || "No analysis returned.")
    } catch {
      showToast("Analysis failed. Try again.", "error")
    }
  
    setIsAnalyzing(false)
  }

  // ── Chart data by severity ──
  const getChartData = () => {
    const counts: Record<string, number> = {}
    data.forEach((item) => {
      const key = item.mood || "Unknown"
      counts[key] = (counts[key] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }

  // ── Format date ──
  const formatTime = (iso?: string) => {
    if (!iso) return ""
    const d = new Date(iso)
    return d.toLocaleDateString("en-IN", {
      day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit",
    })
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>
  }
  
  // ─── Onboarding screen ──────────────────────────────────────────────────────
  if (!nameSet) {
    return (
      <>
        <style>{globalStyles}</style>
        <div className="container" style={{ paddingTop: 80 }}>
          <h1 className="title">🧠 Symptom Journal</h1>
          <p className="subtitle">Track symptoms. Get AI insights.</p>
          <div className="card" style={{ marginTop: 40, textAlign: "center" }}>
            <h2 style={{ marginBottom: 6 }}>Welcome! What&apos;s your name?</h2>
            <p style={{ color: "#94a3b8", marginBottom: 20, fontSize: 15 }}>
              Stored only on your device.
            </p>
            <input
              className="input"
              placeholder="Enter your name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              autoFocus
            />
            <button className="btn-primary" onClick={handleSaveName} style={{ marginTop: 16 }}>
              Get Started →
            </button>
          </div>
        </div>
      </>
    )
  }

  // ─── Main app ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{globalStyles}</style>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}>
          {toast.message}
        </div>
      )}

      <div className="container">
        {/* 🔥 USER BAR (ADD THIS) */}
  <div style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px"
  }}>
    <span style={{ color: "#94a3b8", fontSize: "14px" }}>
      {userEmail}
    </span>

    <button
      onClick={handleLogout}
      style={{
        padding: "6px 12px",
        borderRadius: "8px",
        background: "#dc2626",
        color: "white",
        border: "none",
        cursor: "pointer"
      }}
    >
      Logout
    </button>
  </div>


        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 className="title">🧠 Symptom Journal</h1>
          <p className="subtitle">Track symptoms. Get AI insights.</p>
          <p style={{ color: "#3eb8c0", fontSize: 14, marginTop: 6 }}>
            Hello, {name} ·{" "}
            <span
              style={{ cursor: "pointer", textDecoration: "underline", opacity: 0.7 }}
              onClick={() => { setNameSet(false); setNameInput(name) }}
            >
              change name
            </span>
          </p>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {(["log", "history", "analysis","insights"] as const).map((t) => (
            <div
              key={t}
              className={`tab ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </div>
          ))}
        </div>

        {/* ── LOG TAB ─────────────────────────────────────────────────────── */}
        
        {tab === "log" && (
  <div className="card">
    <h2>Log a symptom</h2>
    <p className="card-hint">
      Fill in the details below and tap Save Entry.
    </p>

    {/* 🔥 SMART LOG (ADD THIS BLOCK) */}
    <label className="field-label">Smart Input (AI)</label>

    <textarea
      className="input"
      placeholder="Describe your symptom... e.g. headache after poor sleep"
      value={smartInput}
      onChange={(e) => setSmartInput(e.target.value)}
      style={{ marginBottom: "10px" }}
    />

    <button
      onClick={handleSmartParse}
      style={{
        marginBottom: "16px",
        padding: "10px",
        borderRadius: "8px",
        background: "#3b82f6",
        color: "white",
        border: "none",
        cursor: "pointer",
      }}
    >
      ✨ Auto Fill with AI
    </button>

    {/* EXISTING FORM CONTINUES BELOW */}

            {/* Body part */}
            <label className="field-label">Body area</label>
            <div className="body-grid">
              {BODY_PARTS.map((bp) => (
                <div
                  key={bp.id}
                  className={`body-btn ${bodyPart === bp.id ? "body-btn-active" : ""}`}
                  onClick={() => setBodyPart(bodyPart === bp.id ? "" : bp.id)}
                >
                  <span style={{ fontSize: 20 }}>{bp.icon}</span>
                  <span style={{ fontSize: 12, marginTop: 4 }}>{bp.label}</span>
                </div>
              ))}
            </div>

            {/* Symptom */}
            <label className="field-label">Symptom *</label>
            <input
              className="input"
              placeholder="e.g. headache, nausea, back pain…"
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
            />

            {/* Severity */}
            <label className="field-label">Severity *</label>
            <div className="severity">
              {(["Mild", "Moderate", "Severe"] as const).map((s) => (
                <div
                  key={s}
                  className="sev-btn"
                  style={{
                    background: severity === s ? SEVERITY_COLORS[s] : "#060d1f",
                    border:     severity === s
                      ? `1.5px solid ${SEVERITY_COLORS[s]}`
                      : "1.5px solid #1a2540",
                    color:      severity === s ? "#fff" : "#94a3b8",
                    fontWeight: severity === s ? 600 : 400,
                    transition: "all 0.15s",
                  }}
                  onClick={() => setSeverity(s)}
                >
                  {s}
                </div>
              ))}
            </div>

            {/* Notes */}
            <label className="field-label">
              Notes <span style={{ color: "#64748b" }}>(optional)</span>
            </label>
            <textarea
              className="input"
              placeholder="Any extra context — time of day, triggers, related symptoms…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ resize: "vertical" }}
            />

            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ marginTop: 20, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Saving…" : "Save Entry"}
            </button>
          </div>
        )}

        {/* ── HISTORY TAB ─────────────────────────────────────────────────── */}
        {tab === "history" && (
          <>
            <div className="card">
              <h2>Severity overview</h2>
              {data.length === 0 ? (
                <p className="empty-state">No entries yet. Log your first symptom.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={getChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 13 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 13 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "#0d1829", border: "1px solid #1a2540", borderRadius: 8 }}
                        labelStyle={{ color: "#fff" }}
                        itemStyle={{ color: "#3eb8c0" }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {getChartData().map((entry, i) => (
                          <Cell key={i} fill={SEVERITY_COLORS[entry.name] || "#3eb8c0"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Legend */}
                  <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                    {Object.entries(SEVERITY_COLORS).map(([label, color]) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#94a3b8" }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                        {label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Entry list */}
            <div className="card" style={{ marginTop: 16 }}>
              <h2>
                All entries{" "}
                <span style={{ color: "#64748b", fontSize: 16 }}>({data.length})</span>
              </h2>

              {data.length === 0 ? (
                <p className="empty-state">No entries yet.</p>
              ) : (
                data.map((item, i) => {
                  const color = SEVERITY_COLORS[item.mood] || "#3eb8c0"
                  const time  = item.timestamp || item.created_at
                  return (
                    <div key={item.id || i} className="entry">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600, fontSize: 16 }}>{item.symptom}</span>
                            {item.body_Part && (
                              <span className="chip">
                                {BODY_PARTS.find(b => b.id === item.body_Part)?.icon}{" "}
                                {BODY_PARTS.find(b => b.id === item.body_Part)?.label}
                              </span>
                            )}
                            <span
                              className="chip"
                              style={{ background: color + "22", color, border: `1px solid ${color}44` }}
                            >
                              {item.mood}
                            </span>
                          </div>

                          {item.notes && (
                            <p style={{ color: "#94a3b8", fontSize: 14, margin: "6px 0 0" }}>
                              {item.notes}
                            </p>
                          )}
                          {time && (
                            <p style={{ color: "#475569", fontSize: 12, margin: "5px 0 0" }}>
                              {formatTime(time)}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => item.id && handleDelete(item.id)}
                          style={{
                            background: "none", border: "none", color: "#475569",
                            cursor: "pointer", fontSize: 20, padding: "0 0 0 12px",
                            flexShrink: 0, lineHeight: 1,
                          }}
                          title="Delete entry"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}

        {/* ── ANALYSIS TAB ────────────────────────────────────────────────── */}
        
        {tab === "analysis" && (
          <div className="card">
            <h2>AI Analysis</h2>
            <p className="card-hint">
              {data.length > 0
                ? `Based on your ${data.length} logged entr${data.length === 1 ? "y" : "ies"}.`
                : "Log some symptoms first, then come back here."}
            </p>

            <button
              className="btn-primary"
              onClick={handleAnalyze}
              disabled={isAnalyzing || data.length === 0}
              style={{ opacity: isAnalyzing || data.length === 0 ? 0.5 : 1 }}
            >
              {isAnalyzing ? "Analysing…" : "Analyse my symptoms"}
            </button>

            {analysis && (
              <>
                <div className="disclaimer">
                  ⚕️ This is not medical advice. Always consult a qualified doctor for diagnosis and treatment.
                </div>
                <div
                  className="analysis-body"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(analysis) }}
                />
              </>
            )}
          </div>
        )}
        {tab === "insights" && <InsightsDashboard />}

        <button
  onClick={handleDownloadReport}
  style={{
    marginTop: "16px",
    padding: "10px",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    border: "none",
    cursor: "pointer"
  }}
>
  📄 Download Doctor Report
</button>



        {/* Footer */}
        <p style={{ textAlign: "center", color: "#334155", fontSize: 13, marginTop: 40 }}>
          Symptom Journal · Data stored securely
        </p>

      </div>
    </>
  )
}

// ─── Global styles ────────────────────────────────────────────────────────────
const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #050b1a;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    min-height: 100vh;
  }

  .container {
    max-width: 660px;
    margin: 0 auto;
    padding: 36px 20px 60px;
  }

  .title {
    font-size: 48px;
    font-weight: 700;
    background: linear-gradient(90deg, #ffffff, #3eb8c0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height: 1.1;
  }

  .subtitle {
    color: #94a3b8;
    font-size: 17px;
    margin-top: 8px;
  }

  .tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
  }

  .tab {
    flex: 1;
    padding: 13px;
    border-radius: 12px;
    background: #0d1829;
    text-align: center;
    cursor: pointer;
    font-size: 15px;
    color: #94a3b8;
    border: 1.5px solid transparent;
    transition: all 0.15s;
  }

  .tab:hover  { border-color: #1a2540; color: #e2e8f0; }
  .tab.active { background: #0f766e; color: #fff; border-color: #0f766e; }

  .card {
    background: #0d1829;
    padding: 24px;
    border-radius: 16px;
    border: 1px solid #1a2540;
  }

  .card h2 { font-size: 20px; font-weight: 600; margin-bottom: 6px; }

  .card-hint {
    color: #64748b;
    font-size: 14px;
    margin-bottom: 20px;
    line-height: 1.5;
  }

  .field-label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: #94a3b8;
    margin: 18px 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .input {
    width: 100%;
    padding: 13px 16px;
    border-radius: 10px;
    font-size: 15px;
    background: #060d1f;
    border: 1.5px solid #1a2540;
    color: #e2e8f0;
    outline: none;
    transition: border-color 0.15s;
    font-family: inherit;
  }

  .input:focus        { border-color: #3eb8c0; }
  .input::placeholder { color: #475569; }

  .body-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .body-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 8px;
    border-radius: 10px;
    background: #060d1f;
    border: 1.5px solid #1a2540;
    cursor: pointer;
    transition: all 0.15s;
    color: #94a3b8;
  }

  .body-btn:hover   { border-color: #3eb8c0; color: #e2e8f0; }
  .body-btn-active  { border-color: #3eb8c0 !important; background: #0a2030 !important; color: #3eb8c0 !important; }

  .severity {
    display: flex;
    gap: 8px;
  }

  .sev-btn {
    flex: 1;
    padding: 13px;
    border-radius: 10px;
    cursor: pointer;
    text-align: center;
    font-size: 15px;
  }

  .btn-primary {
    width: 100%;
    padding: 15px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 12px;
    background: #0f766e;
    color: white;
    border: none;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    font-family: inherit;
  }

  .btn-primary:hover:not(:disabled)  { background: #0d9488; }
  .btn-primary:active:not(:disabled) { transform: scale(0.98); }

  .entry {
    padding: 14px;
    background: #060d1f;
    border-radius: 12px;
    border: 1px solid #1a2540;
    margin-top: 10px;
  }

  .chip {
    font-size: 12px;
    padding: 3px 9px;
    border-radius: 20px;
    background: #1a2540;
    color: #94a3b8;
    border: 1px solid #1a2540;
  }

  .empty-state {
    color: #475569;
    font-size: 15px;
    text-align: center;
    padding: 30px 0;
  }

  .disclaimer {
    margin-top: 20px;
    padding: 12px 16px;
    background: #1a1000;
    border: 1px solid #854F0B;
    border-radius: 10px;
    color: #EF9F27;
    font-size: 13px;
    line-height: 1.5;
  }

  .analysis-body {
    margin-top: 20px;
    font-size: 16px;
    line-height: 1.8;
    color: #cbd5e1;
  }

  .analysis-body h1,
  .analysis-body h2 { color: #3eb8c0; margin: 20px 0 8px; font-size: 18px; }
  .analysis-body h3  { color: #3eb8c0; margin: 16px 0 6px; font-size: 16px; }
  .analysis-body p   { margin-bottom: 10px; }
  .analysis-body ul  { padding-left: 20px; margin-bottom: 10px; }
  .analysis-body li  { margin-bottom: 6px; }
  .analysis-body strong { color: #e2e8f0; }

  .toast {
    position: fixed;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 30px;
    font-size: 14px;
    font-weight: 500;
    z-index: 999;
    white-space: nowrap;
    animation: fadeUp 0.25s ease;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  }

  .toast-success { background: #0f766e; color: #fff; }
  .toast-error   { background: #991b1b; color: #fff; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateX(-50%) translateY(10px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
`
