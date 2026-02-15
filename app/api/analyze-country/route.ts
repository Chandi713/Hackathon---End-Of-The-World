import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const { country } = await req.json()

        if (!country) {
            return NextResponse.json({ analysis: null })
        }

        const prompt = `
        You are a geopolitical risk analyst.
        Analyze the risk profile for ${country.country_name} (${country.iso3}).
        
        Data points:
        - Composite Risk Score: ${country.composite_score}/100
        - Risk Level: ${country.risk_level}
        - Top Threat: ${country.top_threat}
        - Active Alerts: ${country.active_disasters}
        - Domain Scores: Conflict (${country.domain_scores?.conflict}%), Economy (${country.domain_scores?.economy}%), Weather (${country.domain_scores?.weather}%), Food (${country.domain_scores?.food}%), Political (${country.domain_scores?.political}%).
        
        Write a professional, concise risk assessment paragraph (approx 3-4 sentences). 
        Focus on the primary drivers of risk and potential supply chain impacts. 
        Do not use markdown formatting like bolding. Write as plain text.
        `

        // Call the local Python agent server (assuming it's running on port 8000)
        // Similar to how /api/chat or /api/enrich works
        const agentUrl = "http://127.0.0.1:8000/chat";

        const response = await fetch(agentUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: prompt,
                thread_id: `analysis-${country.iso3}`, // Unique thread per country to avoid context pollution? Or just generic.
            }),
        })

        if (!response.ok) {
            console.error(`Agent server error: ${response.status}`)
            // Return null to trigger fallback or error state
            return NextResponse.json({ analysis: null })
        }

        const data = await response.json()
        let content = data.response;

        // Cleanup
        content = content.replace(/```json/g, "").replace(/```/g, "").trim();
        // Remove "Here is the analysis:" prefixes if any
        content = content.replace(/^Here is.*?:/i, "").trim();

        return NextResponse.json({ analysis: content })

    } catch (error) {
        console.error("Error in analyze-country API:", error)
        return NextResponse.json({ analysis: null })
    }
}
