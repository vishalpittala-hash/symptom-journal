import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase.from("symptoms").select("*")

  if (error) {
    return NextResponse.json({ error: error.message })
  }

  // ✅ CLEAN DATA (REMOVE IDS)
  const cleanLogs = data.map((item: any) => ({
    symptom: item.symptom,
    severity: item.mood,
  }))

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: `
You are a helpful health assistant.

Analyze the following symptom logs and provide:

1. Patterns (clear bullet points)
2. Possible causes
3. Simple advice

Do NOT include IDs, timestamps, or technical details.
Keep the output clean and easy to read.

Logs:
${JSON.stringify(cleanLogs)}
          `
        }
      ]
    }),
  })

  const ai = await response.json()

  console.log("AI RESPONSE:", ai)

  const analysis =
    ai?.choices?.[0]?.message?.content ||
    ai?.choices?.[0]?.text ||
    "No analysis generated"

  return NextResponse.json({ analysis })
}