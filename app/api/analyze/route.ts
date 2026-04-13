import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from("symptoms")
    .select("*")
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ analysis: "No symptoms logged yet. Start by adding some entries." })
  }

  // ✅ FIXED HERE (body_part instead of bodyPart)
  const cleanLogs = data.map((item: any, i: number) => ({
    index: i + 1,
    symptom: item.symptom,
    severity: item.severity,
    bodyPart: item.body_part || null, // ✅ FIX
    notes: item.notes || null,
    date: item.created_at
    ? new Date(item.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null,
  }))

  let aiResponse

  try {
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
            role: "system",
            content: `You are a helpful health assistant that analyses symptom journals.
Format your response using clean markdown:
- Use ## for section headings (Patterns, Possible Causes, Advice)
- Use bullet points (- item)
- Use **bold** for key terms
- Do NOT repeat headings
- Do NOT include IDs or JSON
- End with a one-line doctor reminder`,
          },
          {
            role: "user",
            content: `Analyse my symptom journal:

${JSON.stringify(cleanLogs, null, 2)}`,
          },
        ],
      }),
    })

    aiResponse = await response.json()
  } catch {
    return NextResponse.json(
      { error: "Failed to reach AI service. Please try again." },
      { status: 502 }
    )
  }

  const analysis =
    aiResponse?.choices?.[0]?.message?.content ||
    "No analysis could be generated."

  return NextResponse.json({ analysis })
}