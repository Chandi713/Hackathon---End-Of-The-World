import { NextResponse } from "next/server"
import { getCountryData } from "@/lib/data-loader"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ iso3: string }> }
) {
    const { iso3 } = await params
    const country = getCountryData(iso3)

    if (!country) {
        return NextResponse.json({ error: "Country not found" }, { status: 404 })
    }

    return NextResponse.json(country)
}
