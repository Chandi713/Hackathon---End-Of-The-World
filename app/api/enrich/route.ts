import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const { countries } = await req.json()

        if (!countries || !Array.isArray(countries) || countries.length === 0) {
            return NextResponse.json({ descriptions: {} })
        }

        // Limit to top 10 to avoid huge context
        const targetCountries = countries.slice(0, 10).map((c: any) =>
            `${c.country_name} (${c.iso3}): Risk Score ${c.composite_score}`
        ).join(", ");

        const prompt = `
        You are a risk analyst.
        Generate a concise, 1-sentence risk summary (max 10 words) for each of the following countries based on their high risk score.
        Focus on specific potential threats (e.g. "Currency devaluation and unrest", "Supply chain blockade").
        
        Countries:
        ${targetCountries}
        
        Return ONLY a raw JSON object where keys are the ISO3 codes and values are the summaries. 
        Do not use Markdown formatting. Do not include "json" code blocks.
        Example format: { "USA": "Inflation and political polarization risks.", "CHN": "Trade restrictions and slowing growth." }
        `

        // Call the local Python agent server
        const agentUrl = "http://127.0.0.1:8000/chat";

        const response = await fetch(agentUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: prompt,
                thread_id: "enrichment-session",
            }),
        })

        if (!response.ok) {
            throw new Error(`Agent server error: ${response.status}`)
        }

        const data = await response.json()
        let content = data.response;

        // Clean up markdown code blocks if present
        content = content.replace(/```json/g, "").replace(/```/g, "").trim();

        let descriptions = {};
        try {
            descriptions = JSON.parse(content);
        } catch (e) {
            console.error("Failed to parse enrichment JSON:", content);
            // Fallback: try to find JSON-like structure
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    descriptions = JSON.parse(jsonMatch[0]);
                } catch (e2) {
                    console.error("Failed to parse extracted JSON");
                }
            }
        }

        return NextResponse.json({ descriptions })

    } catch (error) {
        console.error("Error in enrich API:", error)
        return NextResponse.json({ descriptions: {} })
    }
}
