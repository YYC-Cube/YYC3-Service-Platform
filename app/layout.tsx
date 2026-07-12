import type React from "react"
import type { Metadata, Viewport } from "next"
import { ResponsiveLayoutProvider } from "@/components/layout/responsive-layout"
import "./globals.css"

export const metadata: Metadata = {
  title: "言语云企业管理系统",
  description:
    "智能化、一体化的现代企业管理平台 · AI 驱动的全链路企业数字化解决方案。集成了 AI 智能助手、数据分析、任务管理、CRM 等核心功能。",
  generator: "YYC3 Service Platform",
  applicationName: "YYC3 Service Platform",
  keywords: ["企业管理", "AI", "CRM", "任务管理", "数据分析", "PWA"],
  authors: [{ name: "YYC-Cube", url: "https://github.com/YYC-Cube" }],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "言语云企业管理系统",
    title: "言语云企业管理系统",
    description:
      "智能化、一体化的现代企业管理平台 · AI 驱动的全链路企业数字化解决方案",
    images: [
      {
        url: "/Family-001.png",
        width: 1200,
        height: 630,
        alt: "YYC3 Service Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "言语云企业管理系统",
    description:
      "智能化、一体化的现代企业管理平台 · AI 驱动的全链路企业数字化解决方案",
    images: ["/Family-001.png"],
    creator: "YYC-Cube",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/yyc3-icons/Web App/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <ResponsiveLayoutProvider>{children}</ResponsiveLayoutProvider>
      </body>
    </html>
  )
}
