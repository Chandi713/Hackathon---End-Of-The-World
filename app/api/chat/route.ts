import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const { message } = await req.json()

        // Call the local Python agent server
        const agentUrl = "http://127.0.0.1:8000/chat";
        console.log(`[API] Proxying request to ${agentUrl}`);

        const response = await fetch(agentUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message,
                thread_id: "default-session", // In a real app, manage sessions
            }),
        })

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[API] Agent server error: ${response.status} ${response.statusText} - ${errorText}`);
            throw new Error(`Agent server responded with ${response.status}: ${errorText}`)
        }

        const data = await response.json()

        // Return the response in a format the frontend expects
        // The python server returns { response: string }
        // The frontend expects { content: string, sources: string[], countryCard?: ... }
        // For now, we'll return just the content and maybe mock sources if the agent doesn't provide them nicely yet.
        // The agent output is just a string.

        return NextResponse.json({
            content: data.response,
            trace: data.trace,
            sources: ["ResilienceAI Agent Network"], // Placeholder until agents return structured sources
        })

    } catch (error) {
        console.error("Error in chat API:", error)
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        )
    }
}
