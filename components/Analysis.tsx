"use client"

import { useState } from "react"

interface AnalysisProps {
  data: any[]
  showToast: (message: string, type?: "success" | "error") => void
}

export default function Analysis({ data, showToast }: AnalysisProps) {
  const [analysis, setAnalysis] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleAnalyze = async () => {
    if (data.length === 0) {
      showToast("Log some symptoms first.", "error")
      return
    }

    setIsAnalyzing(true)
    setAnalysis("")

    try {
      const res = await fetch("/api/analyze")
      const result = await res.json()
      setAnalysis(result.analysis || "No analysis returned.")
    } catch {
      showToast("Analysis failed. Try again.", "error")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const parseMarkdown = (text: string): string => {
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

  return (
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
  )
}
