import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ✅ 1. Fetch symptoms ONLY for this user
    const { data, error } = await supabase
      .from("symptoms")
      .select("*")
      .eq("user_email", email)
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        analysis: "No symptoms logged yet. Start by adding some entries.",
      })
    }

    // ✅ 2. Fetch user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_email", email)
      .single()

    // ✅ 3. Clean logs
    const cleanLogs = data.map((item: any, i: number) => ({
      index: i + 1,
      symptom: item.symptom,
      severity: item.severity,
      bodyPart: item.body_part || null,
      notes: item.notes || null,
      date: item.created_at
        ? new Date(item.created_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : null,
    }))

    // ✅ 4. Build personalized prompt
    const prompt = `
User Profile:
- Age: ${profile?.age || "unknown"}
- Gender: ${profile?.gender || "unknown"}
- Conditions: ${profile?.conditions || "none"}
- Activity Level: ${profile?.activity_level || "unknown"}

Analyse my symptom journal:

${JSON.stringify(cleanLogs, null, 2)}
`

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
Use the user's profile to give more personalized insights.

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
              content: prompt,
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
  } catch (err) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}