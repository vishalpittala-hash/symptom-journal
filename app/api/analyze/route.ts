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

    // ✅ Call insights API
    const baseUrl = new URL(req.url).origin

    const insightsRes = await fetch(`${baseUrl}/api/insights`, {
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
    })

    if (!insightsRes.ok) {
      const errText = await insightsRes.text()
      console.error("INSIGHTS ERROR:", errText)

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

    // ✅ GROQ AI CALL (FIXED)
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

Explain insights clearly.
Do NOT invent causes.
Be short and personal.

Format:
## Patterns
## Meaning
## What to watch

Use bullet points and bold key terms.
End with a one-line doctor reminder.`,
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

    const data = await response.json()

    // 🔥 HANDLE GROQ ERROR
    if (!response.ok) {
      console.error("GROQ ERROR:", data)

      return NextResponse.json(
        {
          error: "AI failed",
          details: data,
        },
        { status: 500 }
      )
    }

    // 🔥 SAFE EXTRACTION
    const analysis =
      data?.choices?.[0]?.message?.content ||
      JSON.stringify(data)

    return NextResponse.json({ analysis })

  } catch (err: unknown) {
    console.error("SERVER ERROR:", err)

    const message =
      err instanceof Error ? err.message : "Unknown error"

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}