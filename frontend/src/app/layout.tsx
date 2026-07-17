import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";
import PageTracker from "@/components/PageTracker";
import PostHogProvider from "@/components/PostHogProvider";
import { Suspense } from "react";
import { I18nProvider } from "@/i18n/client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://workscanai.vercel.app"),
  title: {
    default: "WorkScanAI — AI-Powered Workflow Analysis",
    template: "%s",
  },
  description:
    "Analyze any job or workflow with AI. Get a per-task automation score, ROI in hours and cost saved, and importable n8n workflows — free, instant, no signup.",
  applicationName: "WorkScanAI",
  keywords: [
    "is my job automatable",
    "workflow automation analysis",
    "automation ROI calculator",
    "n8n workflow generator",
    "AI automation assessment",
  ],
  openGraph: {
    siteName: "WorkScanAI",
    type: "website",
    url: "https://workscanai.vercel.app",
    title: "WorkScanAI — AI-Powered Workflow Analysis",
    description:
      "Get a per-task automation score, ROI, and importable n8n workflows for any role or workflow. Free and instant.",
  },
  twitter: {
    card: "summary_large_image",
    title: "WorkScanAI — AI-Powered Workflow Analysis",
    description:
      "Per-task automation score, ROI, and importable n8n workflows for any role. Free and instant.",
  },
};

// Site-wide Organization + WebSite JSON-LD (entity signals for search + LLMs).
const orgJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "WorkScanAI",
      url: "https://workscanai.vercel.app",
      description:
        "Free AI tool that analyzes any job or workflow for automation potential, ROI, and importable n8n workflows.",
    },
    {
      "@type": "WebSite",
      name: "WorkScanAI",
      url: "https://workscanai.vercel.app",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <I18nProvider>
          <AuthProvider>
            <Suspense fallback={null}>
              <PostHogProvider />
            </Suspense>
            <PageTracker />
            <SiteHeader />
            {children}
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

