import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export async function GET(req: Request) {
  try {
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

    // ✅ Get user
    const url = new URL(req.url)
const email = url.searchParams.get("email")

if (!email) {
  return NextResponse.json(
    { error: "Email required" },
    { status: 400 }
  )
}

    // ✅ Fetch insights
    const baseUrl = new URL(req.url).origin

    const insightsRes = await fetch(`${baseUrl}/api/insights?email=${email}`)

    if (!insightsRes.ok) {
      console.error("INSIGHTS FAILED")
      return NextResponse.json({ error: "Insights failed" }, { status: 500 })
    }

    const insightsData = await insightsRes.json()
    const insights: string[] = insightsData.insights || []

    console.log("INSIGHTS:", insights)

    if (!insights.length) {
      return NextResponse.json({
        analysis: "No insights available yet. Add more logs.",
      })
    }

    // ✅ SIMPLE + STABLE GROQ CALL
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
              role: "user",
              content: `Explain these health insights clearly:

${insights.join("\n")}`,
            },
          ],
        }),
      }
    )

    const data = await response.json()

    console.log("GROQ RAW:", data)

    // ✅ SIMPLE EXTRACTION (NO OVER-ENGINEERING)
    const analysis =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      `## Your Health Insights\n\n${insights
        .map((i) => `- ${i}`)
        .join("\n")}`

    return NextResponse.json({ analysis })

  } catch (err: unknown) {
    console.error("SERVER ERROR:", err)

    const message =
      err instanceof Error ? err.message : "Unknown error"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}