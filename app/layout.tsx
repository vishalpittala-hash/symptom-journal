import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Symptom Journal",
  description: "AI-powered symptom tracking and pattern detection",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        padding: 0,
        background: "#060d1f",
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}>
        {children}
      </body>
    </html>
  )
}
