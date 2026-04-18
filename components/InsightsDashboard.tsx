"use client"

import { HealthEntry } from "../lib/types"
import { useEffect, useState } from "react"

interface InsightsDashboardProps {
  data: HealthEntry[]
}

export default function InsightsDashboard({ data }: InsightsDashboardProps) { 
  
  const [insights, setInsights] = useState<string[]>([])
  const [patterns, setPatterns] = useState<string[]>([])
  const [profileImpacts, setProfileImpacts] = useState<string[]>([])
  const [severityDistribution, setSeverityDistribution] = useState<Record<string, number>>({ mild: 0, moderate: 0, severe: 0 })
  const [loading, setLoading] = useState(true)
  const [totalLogs, setTotalLogs] = useState(0)
  const [topSymptom, setTopSymptom] = useState<string>("")
  const [avgSeverity, setAvgSeverity] = useState<string>("")
  const [healthScore, setHealthScore] = useState<number>(0)
  const [healthFactors, setHealthFactors] = useState<string[]>([])

  useEffect(() => {
    // Calculate insights from actual data
    const calculateInsights = () => {
      if (!data || data.length === 0) {
        setInsights(["No data yet"])
        setPatterns([])
        setProfileImpacts([])
        setLoading(false)
        return
      }

      const insights: string[] = []
      const patterns: string[] = []
      const profileImpacts: string[] = []

      // Load user profile
      const savedProfile = localStorage.getItem('symptomProfile')
      const userProfile = savedProfile ? JSON.parse(savedProfile) : null
      
      // Total logs
      insights.push(`You logged ${data.length} symptoms recently`)

      // Most frequent symptom
      const count: Record<string, number> = {}
      data.forEach(l => {
        if (!l.symptom) return
        count[l.symptom] = (count[l.symptom] || 0) + 1
      })
      const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0]
      if (top) insights.push(`Most frequent symptom: ${top[0]}`)

      // Average severity
      const validLogs = data.filter(l => l.severity !== null && l.severity !== undefined)
      const avg = validLogs.length > 0 ? validLogs.reduce((s, l) => s + l.severity, 0) / validLogs.length : 0
      insights.push(`Average severity: ${avg.toFixed(1)} / 5`)

      // Calculate severity distribution
      const dist = { mild: 0, moderate: 0, severe: 0 }
      validLogs.forEach(l => {
        if (l.severity <= 2) dist.mild++
        else if (l.severity <= 3) dist.moderate++
        else dist.severe++
      })
      setSeverityDistribution(dist)

      // Sleep correlation - PATTERN
      let lowSleepHighSeverity = 0
      let totalLowSleep = 0
      data.forEach(l => {
        if (l.sleepHours && l.sleepHours < 6) {
          totalLowSleep++
          if (l.severity >= 4) lowSleepHighSeverity++
        }
      })
      if (totalLowSleep > 2) {
        const percent = Math.round((lowSleepHighSeverity / totalLowSleep) * 100)
        if (percent > 50) {
          patterns.push(`• Headaches increase when sleep < 5 hours`)
        }
      }

      // Stress correlation - PATTERN
      let highStressHighSeverity = 0
      let totalHighStress = 0
      data.forEach(l => {
        if (l.stressLevel && l.stressLevel >= 4) {
          totalHighStress++
          if (l.severity >= 4) highStressHighSeverity++
        }
      })
      if (totalHighStress > 2) {
        const percent = Math.round((highStressHighSeverity / totalHighStress) * 100)
        if (percent > 60) {
          patterns.push(`• Stress above 3 leads to higher severity`)
        }
      }

      // Time-of-day analysis - PATTERN
      const morning = data.filter(l => {
        if (!l.created_at) return false
        const h = new Date(l.created_at).getHours()
        return h < 12
      })
      const evening = data.filter(l => {
        if (!l.created_at) return false
        const h = new Date(l.created_at).getHours()
        return h >= 18
      })
      if (morning.length > 2 && evening.length > 2) {
        const mAvg = morning.reduce((s, l) => s + l.severity, 0) / morning.length
        const eAvg = evening.reduce((s, l) => s + l.severity, 0) / evening.length
        if (eAvg > mAvg) {
          const percentDiff = Math.round(((eAvg - mAvg) / mAvg) * 100)
          patterns.push(`• Your symptoms are ${percentDiff}% higher in evening`)
        } else if (mAvg > eAvg) {
          const percentDiff = Math.round(((mAvg - eAvg) / eAvg) * 100)
          patterns.push(`• Your symptoms are ${percentDiff}% higher in morning`)
        }
      }

      // Trigger detection - PATTERN
      const noteText = data.map(l => l.notes?.toLowerCase() || "").join(" ")
      if (noteText.includes("alcohol")) {
        patterns.push(`• Symptoms often occur after alcohol`)
      }
      if (noteText.includes("gym") || noteText.includes("workout")) {
        patterns.push(`• Exercise-related patterns detected`)
      }
      if (noteText.includes("stress") || noteText.includes("tension")) {
        patterns.push(`• Stress-related patterns detected`)
      }

      // Weather correlation - PATTERN
      const weatherGroups: Record<string, any[]> = {}
      data.forEach(l => {
        if (l.weather) {
          const condition = l.weather.split(' ')[0]
          if (!weatherGroups[condition]) weatherGroups[condition] = []
          weatherGroups[condition].push(l)
        }
      })
      Object.entries(weatherGroups).forEach(([condition, entries]) => {
        if (entries.length >= 3) {
          const avgSeverity = entries.reduce((sum, e) => sum + e.severity, 0) / entries.length
          if (avgSeverity >= 4) {
            patterns.push(`• ${condition} weather correlates with severity`)
          }
        }
      })

      // Predictive alert
      const recent = data.slice(0, 5)
      if (recent.length >= 3) {
        const avgRecent = recent.reduce((sum, l) => sum + (l.severity || 0), 0) / recent.length
        if (avgRecent >= 4) {
          insights.unshift("⚠️ High severity trend detected recently — symptoms may continue if patterns persist")
        } else if (avgRecent >= 3) {
          insights.unshift("⚠️ Moderate symptom trend — monitor closely over next few days")
        }
      }

      // Smart summary
      const hasSignals = patterns.length > 0
      if (hasSignals) {
        insights.unshift("Your symptoms appear to be influenced by lifestyle factors like sleep, stress, weather, and daily habits.")
      }

      // Profile Impact Analysis
      if (userProfile) {
        // Check for migraine/condition correlation with headaches
        if (userProfile.conditions && userProfile.conditions.toLowerCase().includes('migraine')) {
          const headacheCount = data.filter(l => 
            l.symptom && (l.symptom.toLowerCase().includes('headache') || l.symptom.toLowerCase().includes('migraine'))
          ).length
          if (headacheCount > 0) {
            profileImpacts.push(`• Migraine history may influence your headaches`)
          }
        }

        // Check for asthma correlation with respiratory symptoms
        if (userProfile.conditions && userProfile.conditions.toLowerCase().includes('asthma')) {
          const respiratoryCount = data.filter(l => 
            l.symptom && (l.symptom.toLowerCase().includes('breath') || l.symptom.toLowerCase().includes('cough'))
          ).length
          if (respiratoryCount > 0) {
            profileImpacts.push(`• Asthma history may affect respiratory symptoms`)
          }
        }

        // Check activity level impact
        if (userProfile.activityLevel === 'low') {
          const fatigueCount = data.filter(l => 
            l.symptom && l.symptom.toLowerCase().includes('fatigue')
          ).length
          if (fatigueCount > 0) {
            profileImpacts.push(`• Low activity level may increase fatigue`)
          }
        }

        // Age-related insights
        if (userProfile.age && userProfile.age > 40) {
          const jointPainCount = data.filter(l => 
            l.bodyPart && (l.bodyPart.toLowerCase().includes('joint') || l.bodyPart.toLowerCase().includes('back') || l.bodyPart.toLowerCase().includes('knee'))
          ).length
          if (jointPainCount > 0) {
            profileImpacts.push(`• Age may influence joint-related symptoms`)
          }
        }
      }

      setInsights(insights)
      setPatterns(patterns)
      setProfileImpacts(profileImpacts)
      setTotalLogs(data.length)
      
      // Extract top symptom from insights
      const topSymptomInsight = insights.find((i: string) => i.includes("Most frequent"))
      if (topSymptomInsight) {
        const match = topSymptomInsight.match(/Most frequent symptom: (.+)/)
        setTopSymptom(match ? match[1] : "")
      }
      
      // Extract average severity from insights
      const avgSeverityInsight = insights.find((i: string) => i.includes("Average severity"))
      if (avgSeverityInsight) {
        setAvgSeverity(avgSeverityInsight)
      }

      // Calculate Health Score (0-100)
      let score = 100
      const factors: string[] = []

      // Factor 1: Average severity (higher severity = lower score)
      const avgSev = data.reduce((sum, l) => sum + (l.severity || 0), 0) / data.length
      if (avgSev > 4) {
        score -= 20
        factors.push("High symptom severity")
      } else if (avgSev > 3) {
        score -= 10
        factors.push("Moderate symptom severity")
      }

      // Factor 2: Sleep quality
      const entriesWithSleep = data.filter(l => l.sleepHours)
      if (entriesWithSleep.length > 0) {
        const avgSleep = entriesWithSleep.reduce((sum, l) => sum + (l.sleepHours || 0), 0) / entriesWithSleep.length
        if (avgSleep < 6) {
          score -= 15
          factors.push("Poor sleep")
        } else if (avgSleep < 7) {
          score -= 5
          factors.push("Below optimal sleep")
        }
      }

      // Factor 3: Stress level
      const entriesWithStress = data.filter(l => l.stressLevel)
      if (entriesWithStress.length > 0) {
        const avgStress = entriesWithStress.reduce((sum, l) => sum + (l.stressLevel || 0), 0) / entriesWithStress.length
        if (avgStress > 4) {
          score -= 15
          factors.push("High stress")
        } else if (avgStress > 3) {
          score -= 8
          factors.push("Elevated stress")
        }
      }

      // Factor 4: Frequency of symptoms
      if (data.length > 10) {
        score -= 10
        factors.push("Frequent symptoms")
      } else if (data.length > 5) {
        score -= 5
        factors.push("Moderate symptom frequency")
      }

      // Ensure score stays within bounds
      score = Math.max(0, Math.min(100, score))

      setHealthScore(score)
      setHealthFactors(factors)

      setLoading(false)
    }

    calculateInsights()
  }, [data])

  // 🔥 Identify main insight
  const mainInsight = insights.find(i =>
    i.toLowerCase().includes("worse") ||
    i.toLowerCase().includes("increase") ||
    i.toLowerCase().includes("high")
  )

  const otherInsights = insights.filter(i => i !== mainInsight)

  const filteredInsights = otherInsights.filter(
    i =>
      !i.includes("You logged") &&
      !i.includes("Most frequent") &&
      !i.includes("Average")
  )

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
            
            {/* Health Score */}
            <div style={{
              flex: 1,
              padding: "16px",
              borderRadius: "14px",
              background: healthScore >= 70 
                ? "linear-gradient(135deg, #065f46 0%, #047857 100%)"
                : healthScore >= 50
                ? "linear-gradient(135deg, #92400e 0%, #78350f 100%)"
                : "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
              border: healthScore >= 70 
                ? "1px solid #10b981"
                : healthScore >= 50
                ? "1px solid #f59e0b"
                : "1px solid #ef4444",
              boxShadow: healthScore >= 70 
                ? "0 0 15px rgba(16, 185, 129, 0.2)"
                : healthScore >= 50
                ? "0 0 15px rgba(245, 158, 11, 0.2)"
                : "0 0 15px rgba(239, 68, 68, 0.2)"
            }}>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", marginBottom: "4px" }}>🧠 Health Score</p>
              <h3 style={{ fontSize: "28px", color: "#fff", marginBottom: "4px" }}>
                {healthScore}/100
              </h3>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", fontWeight: 600, marginBottom: "6px" }}>
                Status: {healthScore >= 70 ? "✅ Good" : healthScore >= 50 ? "⚠️ Moderate" : "🔴 Needs Attention"}
              </div>
              {healthFactors.length > 0 && (
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)", lineHeight: "1.4" }}>
                  <div style={{ marginBottom: "2px" }}>Main factors:</div>
                  {healthFactors.slice(0, 3).map((factor, i) => (
                    <div key={i}>• {factor}</div>
                  ))}
                </div>
              )}
            </div>

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
                {totalLogs || "0"}
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
                {topSymptom || "-"}
              </h3>
            </div>
          </div>

          {/* 🔥 Patterns Detected */}
          {patterns.length > 0 && (
            <div style={{
              padding: "20px",
              marginBottom: "16px",
              borderRadius: "16px",
              background: "rgba(251, 191, 36, 0.08)",
              border: "1px solid rgba(251, 191, 36, 0.2)",
              boxShadow: "0 0 15px rgba(251, 191, 36, 0.1)"
            }}>
              <div style={{
                color: "#fcd34d",
                fontSize: "12px",
                fontWeight: 600,
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                ⚠️ Patterns Detected
              </div>
              {patterns.map((pattern, i) => (
                <div key={i} style={{
                  color: "#e2e8f0",
                  fontSize: "14px",
                  lineHeight: "1.8",
                  marginBottom: i < patterns.length - 1 ? "8px" : "0"
                }}>
                  {pattern}
                </div>
              ))}
            </div>
          )}

          {/* � Based on Your Profile */}
          {profileImpacts.length > 0 && (
            <div style={{
              padding: "20px",
              marginBottom: "16px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)",
              border: "1px solid #3b82f6",
              boxShadow: "0 0 15px rgba(59, 130, 246, 0.2)"
            }}>
              <div style={{
                color: "#fff",
                fontWeight: 600,
                fontSize: "14px",
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                👤 Based on Your Profile
              </div>
              {profileImpacts.map((impact, i) => (
                <div key={i} style={{
                  color: "#bfdbfe",
                  fontSize: "14px",
                  lineHeight: "1.8",
                  marginBottom: i < profileImpacts.length - 1 ? "8px" : "0"
                }}>
                  {impact}
                </div>
              ))}
            </div>
          )}

          {/* �🔥 Main Insight */}
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
              {avgSeverity || "-"}
            </h3>
          </div>

          {/* � Severity Distribution Chart */}
          <div style={{
            padding: "20px",
            borderRadius: "14px",
            background: "#0d1829",
            border: "1px solid #1a2540",
            marginBottom: "12px"
          }}>
            <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "16px" }}>
              Severity Distribution
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Mild */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "#22c55e", fontSize: "13px", fontWeight: 500 }}>Mild</span>
                  <span style={{ color: "#e2e8f0", fontSize: "13px" }}>{severityDistribution.mild}</span>
                </div>
                <div style={{
                  width: "100%",
                  height: "8px",
                  background: "#1a2540",
                  borderRadius: "4px",
                  overflow: "hidden"
                }}>
                  <div style={{
                    width: `${(severityDistribution.mild / (severityDistribution.mild + severityDistribution.moderate + severityDistribution.severe || 1)) * 100}%`,
                    height: "100%",
                    background: "#22c55e",
                    borderRadius: "4px",
                    transition: "width 0.3s ease"
                  }} />
                </div>
              </div>
              {/* Moderate */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "#eab308", fontSize: "13px", fontWeight: 500 }}>Moderate</span>
                  <span style={{ color: "#e2e8f0", fontSize: "13px" }}>{severityDistribution.moderate}</span>
                </div>
                <div style={{
                  width: "100%",
                  height: "8px",
                  background: "#1a2540",
                  borderRadius: "4px",
                  overflow: "hidden"
                }}>
                  <div style={{
                    width: `${(severityDistribution.moderate / (severityDistribution.mild + severityDistribution.moderate + severityDistribution.severe || 1)) * 100}%`,
                    height: "100%",
                    background: "#eab308",
                    borderRadius: "4px",
                    transition: "width 0.3s ease"
                  }} />
                </div>
              </div>
              {/* Severe */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "#ef4444", fontSize: "13px", fontWeight: 500 }}>Severe</span>
                  <span style={{ color: "#e2e8f0", fontSize: "13px" }}>{severityDistribution.severe}</span>
                </div>
                <div style={{
                  width: "100%",
                  height: "8px",
                  background: "#1a2540",
                  borderRadius: "4px",
                  overflow: "hidden"
                }}>
                  <div style={{
                    width: `${(severityDistribution.severe / (severityDistribution.mild + severityDistribution.moderate + severityDistribution.severe || 1)) * 100}%`,
                    height: "100%",
                    background: "#ef4444",
                    borderRadius: "4px",
                    transition: "width 0.3s ease"
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* �🔥 Other insights */}
          {filteredInsights.map((insight, i) => (
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