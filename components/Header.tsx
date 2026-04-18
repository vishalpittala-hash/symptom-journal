"use client"

import { useRouter } from "next/navigation"

interface HeaderProps {
  userEmail: string
  name: string
  onNameChange: () => void
}

export default function Header({ userEmail, name, onNameChange }: HeaderProps) {
  const router = useRouter()

  const handleReset = () => {
    if (confirm("This will clear all your data. Are you sure?")) {
      localStorage.clear()
      router.refresh()
    }
  }

  return (
    <>
      {/* User Bar */}
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
          onClick={handleReset}
          style={{
            padding: "6px 12px",
            borderRadius: "8px",
            background: "#dc2626",
            color: "white",
            border: "none",
            cursor: "pointer"
          }}
        >
          Reset Data
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
            onClick={onNameChange}
          >
            change name
          </span>
        </p>
      </div>
    </>
  )
}
