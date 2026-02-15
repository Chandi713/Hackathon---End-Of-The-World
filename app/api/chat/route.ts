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

        // --- FORMATTER STEP ---
        // The user explicitly requested better formatting. We'll ask the agent to prettify it.
        const originalContent = data.response;
        const originalTrace = data.trace || [];

        // Add formatter to trace
        const trace = [...originalTrace, "Formatter activated..."];

        const formatPrompt = `
        Format the following text into clean, readable Markdown.
        Use headers (##), bullet points, and bold text to improve readability.
        Ensure there is proper spacing between sections.
        Do NOT change the content or meaning, just the format.
        
        Text to format:
        ${originalContent}
        `;

        let formattedContent = originalContent;

        try {
            console.log(`[API] Calling Formatter...`);
            const formatResponse = await fetch(agentUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: formatPrompt,
                    thread_id: "formatter-session",
                }),
            });

            if (formatResponse.ok) {
                const formatData = await formatResponse.json();
                formattedContent = formatData.response;
                trace.push("Process completed");
            } else {
                console.warn("[API] Formatter failed, returning original.");
                trace.push("Formatter failed", "Process completed");
            }
        } catch (e) {
            console.error("Error in formatter:", e);
        }

        return NextResponse.json({
            content: formattedContent,
            trace: trace,
            sources: ["ResilienceAI Agent Network"],
        })

    } catch (error) {
        console.error("Error in chat API:", error)
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        )
    }
}
