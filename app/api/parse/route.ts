import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

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
            content: `
You are a medical assistant that extracts structured symptom data.

Return ONLY valid JSON in this format:
{
  "symptom": string,
  "severity": number (1, 3, or 5),
  "bodyPart": string (head, chest, stomach, limbs, skin, general),
  "notes": string
}
            `,
          },
          {
            role: "user",
            content: text,
          },
        ],
      }),
    })

    const data = await response.json()

    const content =
      data?.choices?.[0]?.message?.content || "{}"

    let parsed

    try {
      parsed = JSON.parse(content)
    } catch {
      parsed = {
        symptom: text,
        severity: 3,
        bodyPart: "general",
        notes: text,
      }
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error(err)

    return NextResponse.json({
      symptom: "Unknown",
      severity: 3,
      bodyPart: "general",
      notes: "Parsing failed",
    })
  }
}