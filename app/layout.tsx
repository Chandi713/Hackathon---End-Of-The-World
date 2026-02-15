import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
})

export const metadata: Metadata = {
  title: "ResilienceAI - Supply Chain Risk Intelligence",
  description:
    "AI-powered multi-agent supply chain risk intelligence platform monitoring global risks across 266 countries.",
}

export const viewport: Viewport = {
  themeColor: "#0a0f1a",
}


// ... imports

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex h-screen overflow-hidden">
            <AppSidebar />
            <main className="flex-1 overflow-y-auto dot-grid">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
