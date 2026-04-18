"use client"

interface TabsProps {
  activeTab: "log" | "history" | "insights"
  onTabChange: (tab: "log" | "history" | "insights") => void
}

export default function Tabs({ activeTab, onTabChange }: TabsProps) {
  return (
    <div className="tabs">
      {(["log", "history", "insights"] as const).map((tab) => (
        <div
          key={tab}
          className={`tab ${activeTab === tab ? "active" : ""}`}
          onClick={() => onTabChange(tab)}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </div>
      ))}
    </div>
  )
}
