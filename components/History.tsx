"use client"

import { HealthEntry, BodyPart } from "../lib/types"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { useState } from "react"

interface HistoryProps {
  data: HealthEntry[]
  onDelete: (id: string) => Promise<void>
  onContinueChat?: (entry: HealthEntry) => void
}

const BODY_PARTS: BodyPart[] = [
  { id: "head",    label: "Head",    icon: "🧠" },
  { id: "chest",   label: "Chest",   icon: "🫁" },
  { id: "stomach", label: "Stomach", icon: "🫃" },
  { id: "back",    label: "Back",    icon: "🫄" },
  { id: "limbs",   label: "Limbs",   icon: "🦵" },
  { id: "skin",    label: "Skin",    icon: "🩹" },
  { id: "general", label: "General", icon: "🌡️" },
]

const FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "head", label: "Head" },
  { id: "chest", label: "Chest" },
  { id: "back", label: "Back" },
  { id: "limbs", label: "Limbs" },
]

const SEVERITY_COLORS: Record<string, string> = {
  1: "#22c55e", // Mild - green
  2: "#22c55e",
  3: "#eab308", // Moderate - yellow
  4: "#eab308",
  5: "#ef4444", // Severe - red
}

const SEVERITY_LABELS: Record<number, string> = {
  1: "Mild",
  2: "Mild",
  3: "Moderate",
  4: "Moderate",
  5: "Severe",
}

export default function History({ data, onDelete, onContinueChat }: HistoryProps) {
  const [filter, setFilter] = useState("all")
  const [showCalendar, setShowCalendar] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const filteredData = data.filter(item => {
    if (filter === "all") return true
    return item.bodyPart === filter
  })

  const getChartData = () => {
    const counts: Record<string, number> = {}
    data.forEach((item) => {
      const label = SEVERITY_LABELS[item.severity] || "Unknown"
      counts[label] = (counts[label] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }

  const formatTime = (iso?: string) => {
    if (!iso) return ""
    const d = new Date(iso)
    return d.toLocaleDateString("en-IN", {
      day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit",
    })
  }

  const getSeverityColor = (severity: number) => {
    return SEVERITY_COLORS[severity] || "#3eb8c0"
  }

  const getSeverityLabel = (severity: number) => {
    return SEVERITY_LABELS[severity] || "Unknown"
  }

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getSeverityForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const dayEntries = data.filter(item => {
      const entryDate = new Date(item.created_at || item.timestamp || '').toISOString().split('T')[0]
      return entryDate === dateStr
    })
    
    if (dayEntries.length === 0) return null
    
    // Return the maximum severity for the day
    const maxSeverity = Math.max(...dayEntries.map(e => e.severity || 0))
    return maxSeverity
  }

  const getCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: null, severity: null })
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const severity = getSeverityForDate(date)
      days.push({ date, severity })
    }
    
    return days
  }

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const navigateMonth = (delta: number) => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() + delta)
    setCurrentMonth(newDate)
  }

  return (
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
              {Object.entries(SEVERITY_LABELS).filter(([_, label], i, arr) => 
                arr.findIndex(([_, l]) => l === label) === i
              ).map(([_, label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#94a3b8" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: SEVERITY_COLORS[Object.keys(SEVERITY_LABELS).find(k => SEVERITY_LABELS[parseInt(k)] === label) || ""] }} />
                  {label}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Calendar View */}
      {showCalendar && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <button
              onClick={() => navigateMonth(-1)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                background: "#0d1829",
                border: "1px solid #1a2540",
                color: "#e2e8f0",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              ←
            </button>
            <h3 style={{ margin: 0, fontSize: "16px" }}>{getMonthName(currentMonth)}</h3>
            <button
              onClick={() => navigateMonth(1)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                background: "#0d1829",
                border: "1px solid #1a2540",
                color: "#e2e8f0",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              →
            </button>
          </div>
          
          {/* Calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "8px" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} style={{ textAlign: "center", fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
                {day}
              </div>
            ))}
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {getCalendarDays().map((day, index) => (
              <div
                key={index}
                onClick={() => day.date && setSelectedDate(day.date)}
                style={{
                  aspectRatio: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 500,
                  background: day.date ? (
                    day.severity ? `${SEVERITY_COLORS[day.severity]}33` : "#0d1829"
                  ) : "transparent",
                  color: day.severity ? SEVERITY_COLORS[day.severity] : (day.date ? "#e2e8f0" : "transparent"),
                  border: day.date ? `1px solid ${selectedDate && day.date.toDateString() === selectedDate.toDateString() ? "#3b82f6" : day.severity ? SEVERITY_COLORS[day.severity] : "#1a2540"}` : "none",
                  cursor: day.date ? "pointer" : "default",
                  transition: "all 0.2s ease"
                }}
                title={day.date ? `${day.date.toLocaleDateString()}: ${day.severity ? SEVERITY_LABELS[day.severity] : 'No symptoms'}` : ""}
              >
                {day.date ? day.date.getDate() : ""}
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8" }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: "#22c55e33", border: "1px solid #22c55e" }} />
              Mild
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8" }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: "#eab30833", border: "1px solid #eab308" }} />
              Moderate
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8" }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: "#ef444433", border: "1px solid #ef4444" }} />
              Severe
            </div>
          </div>

          {/* Selected Date Symptoms */}
          {selectedDate && (
            <div style={{
              marginTop: "16px",
              padding: "16px",
              borderRadius: "12px",
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.3)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ color: "#3b82f6", fontSize: "14px", margin: 0 }}>
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    background: "rgba(59, 130, 246, 0.2)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    color: "#94a3b8",
                    fontSize: "11px",
                    cursor: "pointer"
                  }}
                >
                  ✕
                </button>
              </div>
              {data.filter(entry => {
                if (!entry.created_at) return false
                const entryDate = new Date(entry.created_at)
                return entryDate.toDateString() === selectedDate.toDateString()
              }).length > 0 ? (
                data.filter(entry => {
                  if (!entry.created_at) return false
                  const entryDate = new Date(entry.created_at)
                  return entryDate.toDateString() === selectedDate.toDateString()
                }).map((entry, i) => (
                  <div key={i} style={{
                    padding: "12px",
                    borderRadius: "8px",
                    background: "#0d1829",
                    border: `1px solid ${SEVERITY_COLORS[entry.severity] || "#1a2540"}`,
                    marginBottom: "8px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "13px" }}>
                        {entry.symptom}
                      </span>
                      <span style={{
                        color: SEVERITY_COLORS[entry.severity] || "#94a3b8",
                        fontSize: "11px",
                        fontWeight: 500,
                        padding: "2px 8px",
                        borderRadius: "10px",
                        background: `${SEVERITY_COLORS[entry.severity] || "#94a3b8"}20`
                      }}>
                        {getSeverityLabel(entry.severity)}
                      </span>
                    </div>
                    {entry.bodyPart && (
                      <div style={{ color: "#64748b", fontSize: "12px", marginBottom: "4px" }}>
                        📍 {entry.bodyPart}
                      </div>
                    )}
                    {entry.notes && (
                      <div style={{ color: "#94a3b8", fontSize: "12px", fontStyle: "italic" }}>
                        {entry.notes}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ color: "#64748b", fontSize: "13px", textAlign: "center", padding: "12px" }}>
                  No symptoms logged on this date
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toggle Calendar Button */}
      <div style={{ marginTop: 16, textAlign: "center" }}>
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          style={{
            padding: "8px 16px",
            borderRadius: "20px",
            background: "#0d1829",
            border: "1px solid #1a2540",
            color: "#3b82f6",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          {showCalendar ? "Hide Calendar" : "Show Calendar"}
        </button>
      </div>

      {/* Entry list */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2>
            All entries{" "}
            <span style={{ color: "#64748b", fontSize: 16 }}>({filteredData.length})</span>
          </h2>
        </div>

        {/* Filter buttons */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setFilter(option.id)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                border: filter === option.id ? "1px solid #3b82f6" : "1px solid #1a2540",
                background: filter === option.id ? "#3b82f6" : "#0d1829",
                color: filter === option.id ? "#fff" : "#94a3b8",
                fontSize: "13px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {filteredData.length === 0 ? (
          <p className="empty-state">No entries yet.</p>
        ) : (
          filteredData.map((item, i) => {
            const color = getSeverityColor(item.severity)
            const time = item.timestamp || item.created_at
            return (
              <div key={item.id || i} className="entry" style={{
                padding: "16px",
                borderRadius: "12px",
                background: "#0d1829",
                border: "1px solid #1a2540",
                marginBottom: "12px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: "8px" }}>
                      <span style={{ fontWeight: 600, fontSize: 16, color: "#e2e8f0" }}>{item.symptom}</span>
                      {item.bodyPart && (
                        <span className="chip" style={{
                          background: "#3b82f622",
                          color: "#3b82f6",
                          border: "1px solid #3b82f644"
                        }}>
                          {BODY_PARTS.find(b => b.id === item.bodyPart)?.icon}{" "}
                          {BODY_PARTS.find(b => b.id === item.bodyPart)?.label}
                        </span>
                      )}
                      <span
                        className="chip"
                        style={{
                          background: color + "22",
                          color: color,
                          border: `1px solid ${color}44`,
                          fontWeight: 600,
                          padding: "4px 10px"
                        }}
                      >
                        {getSeverityLabel(item.severity)}
                      </span>
                      {item.sleepHours && (
                        <span className="chip" style={{ background: "#3b82f622", color: "#3b82f6", border: "1px solid #3b82f644" }}>
                          😴 {item.sleepHours}h
                        </span>
                      )}
                      {item.stressLevel && (
                        <span className="chip" style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444" }}>
                          😰 Stress {item.stressLevel}/5
                        </span>
                      )}
                    </div>

                    {item.notes && (
                      <p style={{ color: "#94a3b8", fontSize: 14, margin: "8px 0" }}>
                        {item.notes}
                      </p>
                    )}
                    {time && (
                      <p style={{ color: "#64748b", fontSize: 12, margin: "4px 0 8px" }}>
                        {formatTime(time)}
                      </p>
                    )}
                    {item.aiDiscussion && item.aiDiscussion.length > 0 && (
                      <div style={{
                        marginTop: "12px",
                        padding: "12px",
                        borderRadius: "8px",
                        background: "#060d1f",
                        border: "1px solid #1a2540",
                        fontSize: "13px"
                      }}>
                        <div style={{ fontSize: "12px", fontWeight: "600", color: "#e2e8f0", marginBottom: "8px" }}>
                          💬 AI Discussion ({item.aiDiscussion.length} messages)
                        </div>
                        {item.aiDiscussion.map((msg, index) => (
                          <div key={msg.id} style={{
                            marginBottom: "6px",
                            padding: "8px",
                            borderRadius: "6px",
                            background: msg.sender === 'user' ? "#1e293b" : "#0f766e",
                            color: "#e2e8f0"
                          }}>
                            <div style={{ fontSize: "10px", opacity: "0.7", marginBottom: "3px" }}>
                              {(new Date(msg.timestamp)).toLocaleTimeString()}
                            </div>
                            <div style={{ fontSize: "12px" }}>{msg.text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => onContinueChat?.(item)}
                      style={{
                        marginTop: "12px",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        background: "#3b82f6",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "500",
                        transition: "background 0.2s ease"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = "#2563eb"}
                      onMouseOut={(e) => e.currentTarget.style.background = "#3b82f6"}
                    >
                      Ask AI About This
                    </button>
                  </div>

                  <button
                    onClick={() => item.id && onDelete(item.id)}
                    style={{
                      background: "none", border: "none", color: "#64748b",
                      cursor: "pointer", fontSize: 24, padding: "0 0 0 12px",
                      flexShrink: 0, lineHeight: 1,
                      transition: "color 0.2s ease"
                    }}
                    title="Delete entry"
                    onMouseOver={(e) => e.currentTarget.style.color = "#ef4444"}
                    onMouseOut={(e) => e.currentTarget.style.color = "#64748b"}
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
  )
}
