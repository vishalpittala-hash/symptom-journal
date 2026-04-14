import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export async function GET(req: Request) {
  try {
    // ✅ Authenticated Supabase client
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // ✅ Get logged-in user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // ✅ Call your own insights API (same domain, no env needed)
    const baseUrl = new URL(req.url).origin

    const insightsRes = await fetch(`${baseUrl}/api/insights`, {
      headers: {
        cookie: req.headers.get("cookie") || "", // 🔥 important for auth
      },
    })

    if (!insightsRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch insights" },
        { status: 500 }
      )
    }

    const insightsData = await insightsRes.json()
    const insights: string[] = insightsData.insights || []

    if (!insights.length) {
      return NextResponse.json({
        analysis: "No insights available yet. Add more logs.",
      })
    }

    // ✅ AI CALL (Groq)
    let aiResponse

    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              {
                role: "system",
                content: `You are a smart health assistant.

You will be given computed insights from a symptom tracking app.

Rules:
- DO NOT invent new causes
- DO NOT give generic medical advice
- ONLY explain what the insights mean
- Be clear, short, and personal
- Use markdown:
  - ## headings
  - bullet points
  - bold key points
- End with a short doctor reminder`,
              },
              {
                role: "user",
                content: `These are my health insights:

${insights.join("\n")}

Explain what this means for me.`,
              },
            ],
          }),
        }
      )

      aiResponse = await response.json()
    } catch {
      return NextResponse.json(
        { error: "AI service unavailable" },
        { status: 502 }
      )
    }

    const analysis =
      aiResponse?.choices?.[0]?.message?.content ||
      "No analysis generated."

    return NextResponse.json({ analysis })

  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error"

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}