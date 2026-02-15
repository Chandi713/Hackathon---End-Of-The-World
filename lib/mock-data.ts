import { CountryRisk } from "./types"

export type { CountryRisk }

export const getRiskColor = (score: number) => {
  if (score >= 70) return "hsl(0, 84%, 60%)"
  if (score >= 50) return "hsl(24, 94%, 50%)"
  if (score >= 30) return "hsl(45, 93%, 47%)"
  if (score >= 15) return "hsl(142, 71%, 45%)"
  return "hsl(217, 91%, 60%)"
}

export const getRiskBg = (score: number) => {
  if (score >= 70) return "bg-destructive/10 text-destructive"
  if (score >= 50) return "bg-orange-500/10 text-orange-500"
  if (score >= 30) return "bg-yellow-500/10 text-yellow-500"
  if (score >= 15) return "bg-green-500/10 text-green-500"
  return "bg-blue-500/10 text-blue-500"
}
