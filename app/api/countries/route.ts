import { NextResponse } from "next/server"
import { getDashboardData } from "@/lib/data-loader"

export async function GET() {
    const data = getDashboardData()
    
    if (!data) {
        return NextResponse.json({ error: "Failed to load country data" }, { status: 500 })
    }

    // Extract relevant fields for the dropdown
    const countries = data.countries
        .filter(c => c.country_name) // Filter out entries without a name
        .map(c => ({
            id: c.id,
            name: c.country_name,
            iso3: c.iso3,
            risk_level: c.risk_level
        }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))

    return NextResponse.json(countries)
}
