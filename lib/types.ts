export interface CountryRisk {
    id: string
    country_code: string
    country_name: string
    iso3: string
    lat: number
    lng: number
    composite_score: number
    risk_level: "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "MINIMAL"
    color: string
    top_threat: string
    domain_scores: {
        conflict: number
        political: number
        weather: number
        disaster: number
        economy: number
        food: number
        disease: number
        health: number
    }
    active_disasters: number
    conflict_details: any
    political_details: any
    weather_details: any
    disaster_details: any
    economy_details: any
    food_details: any
    disease_details: any
    health_details: any
    monthly_conflict: any[]
    monthly_weather: any[]
    disaster_breakdown: any[]
    timeline: any[]
}

export interface DashboardData {
    summary: {
        total_countries: number
        active_hotspots: number
        total_conflict_events: number
        total_disasters: number
        total_data_points: number
    }
    alerts: {
        id: number
        severity: "critical" | "high" | "moderate"
        text: string
        country: string
    }[]
    threat_matrix: {
        supply: string
        conflict: number
        weather: number
        pandemic: number
        trade: number
    }[]
    countries: CountryRisk[]
}
