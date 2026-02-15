import { NextResponse } from "next/server"
import { getDashboardData } from "@/lib/data-loader"

export async function GET() {
    const data = getDashboardData()
    if (!data) {
        return NextResponse.json({ error: "Failed to load risk data" }, { status: 500 })
    }
    return NextResponse.json(data)
}
