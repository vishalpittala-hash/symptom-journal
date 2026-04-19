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

    // ✅ PERSONALIZED GROQ CALL
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
              content: "You are a friendly, empathetic health assistant. Explain health insights in a warm, conversational way that feels personal and helpful. Use natural language, avoid being robotic, and make the user feel understood. Focus on what the insights mean for them personally and what practical steps they can take."
            },
            {
              role: "user",
              content: `Here are my health insights from my symptom journal. Can you explain what these mean for me in a friendly, personalized way?

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

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { text, context, conversation, userProfile, symptomContext } = body

    console.log("=== ANALYZE API CALL ===")
    console.log("Context:", context)
    console.log("Text:", text)
    console.log("Conversation:", conversation)
    console.log("User Profile:", userProfile)
    console.log("Symptom Context:", symptomContext)

    if (!text) {
      return NextResponse.json(
        { error: "Text required" },
        { status: 400 }
      )
    }

    // Build profile context string
    let profileContext = ""
    let profileSummary = ""
    if (userProfile) {
      const parts = []
      if (userProfile.age) parts.push(`Age: ${userProfile.age}`)
      if (userProfile.gender) parts.push(`Gender: ${userProfile.gender}`)
      if (userProfile.conditions) parts.push(`Pre-existing conditions: ${userProfile.conditions}`)
      if (userProfile.activityLevel) parts.push(`Activity level: ${userProfile.activityLevel}`)
      if (parts.length > 0) {
        profileContext = `Patient profile: ${parts.join(", ")}. `
        profileSummary = `**👤 Based on Your Profile:** Age ${userProfile.age}, ${userProfile.gender}, activity level: ${userProfile.activityLevel}\n\n`
      }
    }

    // Enhanced AI response with conversation awareness
    let mockAnalysis = ""
    let fieldUpdates: any = {}
    let questions: string[] = []

    if (context === "symptom_analysis") {
      // Rule-based diagnostic system - no API dependency
      const symptomText = text.toLowerCase()
      console.log("Symptom text (lowercase):", symptomText)
      console.log("Contains 'pregnant':", symptomText.includes('pregnant'))
      console.log("Contains 'pregnancy':", symptomText.includes('pregnancy'))
      console.log("Contains 'pregnent':", symptomText.includes('pregnent'))
      console.log("Contains 'pregnat':", symptomText.includes('pregnat'))
      console.log("Contains 'expecting':", symptomText.includes('expecting'))
      
      // Check for pregnancy-related symptoms (handle common misspellings)
      if (symptomText.includes('pregnant') || symptomText.includes('pregnancy') || symptomText.includes('pregnent') || symptomText.includes('pregnat') || symptomText.includes('pregnency') || symptomText.includes('expecting')) {
        console.log("✓ MATCHED PREGNANCY KEYWORD")
        mockAnalysis = profileSummary + `🧠 **Possible Cause**
• **Pregnancy-related nausea** (morning sickness)
• Very common in **first trimester**
• **Hormonal changes** during pregnancy
• May occur at any time of day

💊 **What you can do**
• Eat **small, frequent meals** throughout the day
• Avoid **strong odors** and triggers
• Stay **hydrated** with small sips
• Rest when needed
• Try **ginger** or **peppermint tea**
• Eat **crackers** before getting out of bed

⚠️ **When to worry**
• **Severe vomiting** preventing fluid intake
• **Weight loss** during pregnancy
• **Dizziness** or fainting
• Symptoms persist beyond first trimester
• **Fever** accompanies nausea

To help you better: How many weeks pregnant are you? When did the nausea start? Does anything make it better or worse?`
        questions.push("How many weeks pregnant are you?")
        questions.push("When did the nausea start?")
        questions.push("Does anything make it better or worse?")
      }
      // Check for nausea
      else if (symptomText.includes('nausea') || symptomText.includes('vomit') || symptomText.includes('dizzy')) {
        let possibleCause = "Nausea can have various causes including **food poisoning**, **viral infection**, **medication side effects**, **migraines**, or **stress**"
        let whatToDo = "Stay **hydrated** with small sips, rest, avoid strong odors, eat **bland foods**, monitor for 24-48 hours"
        let whenToWorry = "Persistent vomiting beyond 24 hours, signs of **dehydration**, severe **abdominal pain**, **blood in vomit**, fever above 101°F"

        // Add profile-specific context
        if (userProfile?.conditions?.toLowerCase().includes('migraine')) {
          possibleCause = "Could be **migraine-related nausea** given your history"
          whatToDo += ", consider migraine medication if prescribed"
        }
        if (userProfile?.conditions?.toLowerCase().includes('asthma')) {
          possibleCause = "Could be **medication side effect** given asthma history"
        }

        mockAnalysis = profileSummary + `🧠 **Possible Cause**
• ${possibleCause}
• **Digestive upset** or infection
• **Stress** or anxiety
• **Motion sickness**

💊 **What you can do**
• ${whatToDo}
• Avoid solid foods temporarily
• Try **ginger** or **peppermint**
• Rest in a quiet, dark room

⚠️ **When to worry**
• ${whenToWorry}
• **Severe headache** accompanies nausea
• **Confusion** or difficulty speaking
• Symptoms worsen despite home care

To help identify the cause: How long have you been experiencing this? Does it happen at specific times?`
        questions.push("How long have you had nausea?")
        questions.push("Does it happen at specific times?")
        questions.push("Any food or smell triggers?")
      }
      // Check for back pain
      else if (symptomText.includes('back') && symptomText.includes('pain')) {
        let possibleCause = "Back pain can stem from **muscle strain**, **poor posture**, **injury**, or **age-related changes**"
        let whatToDo = "Rest, **gentle stretching**, apply **heat or cold**, maintain good posture, avoid **heavy lifting**"
        let whenToWorry = "Pain radiates down legs, **numbness** or weakness, loss of **bladder/bowel control**, fever with back pain, severe pain that doesn't improve"

        // Add profile-specific context
        if (userProfile?.activityLevel === 'high' || userProfile?.activityLevel === 'medium') {
          possibleCause = "Could be **exercise-related muscle strain** given your activity level"
        }
        if (userProfile?.age && userProfile.age > 40) {
          possibleCause += ". At your age, consider **degenerative changes**"
        }

        mockAnalysis = profileSummary + `🧠 **Possible Cause**
• ${possibleCause}
• **Poor posture** or ergonomics
• **Stress** or tension
• Underlying medical conditions

💊 **What you can do**
• ${whatToDo}
• **Over-the-counter pain relief** if appropriate
• **Gentle yoga** or stretching
• Consider **ergonomic adjustments**

⚠️ **When to worry**
• ${whenToWorry}
• Pain after injury or fall
• **Unexplained weight loss** with pain
• Pain that worsens at night

To help you better: Where exactly is the pain? What type of pain is it?`
        questions.push("Where exactly is the pain?")
        questions.push("What type of pain is it?")
        questions.push("What makes it better or worse?")
      }
      // Check for headache
      else if (symptomText.includes('headache') || symptomText.includes('migraine')) {
        let possibleCause = "Headaches can be **tension-type**, **migraine**, or **stress-related**"
        let whatToDo = "Rest, stay **hydrated**, apply **cold compress**, try **relaxation techniques**"
        let whenToWorry = "**Sudden severe headache**, **vision changes**, **numbness**, or **confusion**"

        // Add profile-specific context
        if (userProfile?.conditions?.toLowerCase().includes('migraine')) {
          possibleCause = "Likely **migraine episode** given your history"
          whatToDo += ", take prescribed migraine medication"
        }
        if (userProfile?.stressLevel) {
          possibleCause += ". **Stress** can be a major trigger"
        }

        mockAnalysis = profileSummary + `🧠 **Possible Cause**
• ${possibleCause}

💊 **What you can do**
• ${whatToDo}

⚠️ **When to worry**
• ${whenToWorry}

To understand yours better: How long have you had this? Is it on one side or both?`
        questions.push("How long have you had this?")
        questions.push("Is it on one side or both?")
        questions.push("Any light or sound sensitivity?")
      }
      // Check for workout-related pain
      else if (symptomText.includes('workout') || symptomText.includes('exercise') || symptomText.includes('gym')) {
        let possibleCause = "Workout-related pain from **muscle strain**, **improper form**, or **overexertion**"
        let whatToDo = "Rest the affected area, apply **ice**, **gentle stretching**, proper warm-up next time, stay **hydrated**"
        let whenToWorry = "Severe pain that doesn't improve with rest, **swelling** that doesn't go down, inability to move the area, pain during normal activities"

        // Add profile-specific context
        if (userProfile?.activityLevel === 'low') {
          possibleCause = "Body may need more time to adapt to exercise given low activity level"
        }

        mockAnalysis = profileSummary + `🧠 **Possible Cause**
• ${possibleCause}
• **Muscle soreness** (DOMS)
• Minor injury or strain
• Improper exercise technique

💊 **What you can do**
• ${whatToDo}
• Consider lighter intensity initially
• Focus on proper form
• Gradually increase intensity

⚠️ **When to worry**
• ${whenToWorry}
• **Sharp pain** during exercise
• Pain that persists for more than a week
• Visible swelling or bruising

To help you better: What type of exercise were you doing? How long ago was the workout?`
        questions.push("What type of exercise were you doing?")
        questions.push("How long ago was the workout?")
        questions.push("Rate the severity on 1-10")
      }
      // Generic fallback with profile context
      else {
        let possibleCause = `Symptom "${text.substring(0, 30)}..." could have various causes including **environmental factors**, **stress**, or underlying conditions`
        let whatToDo = "Monitor symptoms, rest, stay **hydrated**, track patterns, avoid known triggers"
        let whenToWorry = "Symptoms persist beyond 48 hours, severity increases significantly, new symptoms develop, **fever** above 101°F"

        // Add profile-specific context for generic symptoms
        if (userProfile?.conditions) {
          possibleCause += `. Could be related to pre-existing conditions (${userProfile.conditions})`
        }

        mockAnalysis = profileSummary + `🧠 **Possible Cause**
• ${possibleCause}
• Lifestyle factors
• Environmental triggers
• **Stress** or fatigue

💊 **What you can do**
• ${whatToDo}
• Maintain regular routine
• Consider lifestyle adjustments
• Document patterns

⚠️ **When to worry**
• ${whenToWorry}
• Difficulty breathing or **chest pain**
• Severe pain interfering with daily activities
• Sudden, severe symptoms

I'd like to understand your situation better: How long have you been experiencing this? What makes it better or worse?`
        questions.push("How long have you been experiencing this?")
        questions.push("What makes it better or worse?")
        questions.push("Rate severity on 1-10")
      }
    } else if (context === "followup_question") {
      // Use Groq AI API for intelligent follow-up responses
      const groqApiKey = process.env.GROQ_API_KEY
      
      if (groqApiKey) {
        try {
          // Build conversation history
          const conversationHistory = conversation || []
          
          // Build symptom context for AI
          let symptomContextStr = ""
          if (symptomContext) {
            const contextParts = []
            if (symptomContext.symptom) contextParts.push(`Symptom: ${symptomContext.symptom}`)
            if (symptomContext.severity) contextParts.push(`Severity: ${symptomContext.severity}/5`)
            if (symptomContext.bodyPart) contextParts.push(`Body Part: ${symptomContext.bodyPart}`)
            if (symptomContext.notes) contextParts.push(`Notes: ${symptomContext.notes}`)
            if (symptomContext.sleepHours) contextParts.push(`Sleep: ${symptomContext.sleepHours}h`)
            if (symptomContext.stressLevel) contextParts.push(`Stress: ${symptomContext.stressLevel}/5`)
            if (symptomContext.weather) contextParts.push(`Weather: ${symptomContext.weather}`)
            if (symptomContext.medications) contextParts.push(`Medications: ${symptomContext.medications}`)
            if (contextParts.length > 0) {
              symptomContextStr = `\n\nThe user is asking about a previously logged symptom with these details:\n${contextParts.join('\n')}\n\nKeep this context in mind when answering their question.`
            }
          }
          
          const messages = [
            {
              role: "system",
              content: `You are a helpful and empathetic health assistant. You help users understand their symptoms, provide general health information, and suggest when to seek medical attention. Always be supportive, clear, and concise. If symptoms are severe or persistent, recommend seeing a healthcare provider. Never provide definitive medical diagnoses - always suggest consulting a doctor for proper evaluation. ${symptomContextStr}${profileContext}Only mention pre-existing conditions if they are directly relevant to the current symptoms being discussed. Focus primarily on the symptoms the user is actively experiencing.`
            },
            ...conversationHistory.map((msg: any) => ({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.text
            })),
            {
              role: "user",
              content: text
            }
          ]

          const axios = (await import('axios')).default
          const https = (await import('https')).default
          const agent = new https.Agent({ rejectUnauthorized: false })

          const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: "llama-3.3-70b-versatile",
            messages: messages,
            temperature: 0.7,
            max_tokens: 500
          }, {
            headers: {
              "Authorization": `Bearer ${groqApiKey}`,
              "Content-Type": "application/json"
            },
            httpsAgent: agent
          })

          mockAnalysis = response.data.choices[0]?.message?.content || "I couldn't generate a response. Please try again."
        } catch (error: any) {
          console.error("Groq API fetch error:", error)
          mockAnalysis = "I'm experiencing technical difficulties. Please try again, or if your symptoms are concerning, please consult a healthcare provider."
        }
      } else {
        mockAnalysis = "AI service is not configured. Please contact support."
      }
    }

    return NextResponse.json({ 
      analysis: mockAnalysis,
      questions: questions.length > 0 ? questions : undefined,
      fieldUpdates: Object.keys(fieldUpdates).length > 0 ? fieldUpdates : undefined,
      debug: {
        context: context,
        text: text,
        userProfile: userProfile,
        matchedCondition: context === "symptom_analysis" ? (text.toLowerCase().includes('pregnant') || text.toLowerCase().includes('pregnancy') || text.toLowerCase().includes('pregnent') || text.toLowerCase().includes('pregnat') || text.toLowerCase().includes('expecting') ? 'pregnancy' : 'other') : 'ai_api'
      }
    })

  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}