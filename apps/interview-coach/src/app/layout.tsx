import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { StatusProvider } from "@/components/layout/StatusProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const SITE_URL = "https://ai-interview-coach-jeevan.vercel.app";
const DESCRIPTION =
  "Practice realistic mock interviews with an AI interviewer powered by Claude. Answer by typing or voice and get scored, actionable feedback and a full readiness report.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AI Interview Coach — Mock interviews with scored feedback",
    template: "%s · AI Interview Coach",
  },
  description: DESCRIPTION,
  applicationName: "AI Interview Coach",
  authors: [{ name: "Jeevan", url: "https://github.com/Jeevan2410" }],
  openGraph: {
    title: "AI Interview Coach",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "AI Interview Coach",
    type: "website",
  },
  twitter: { card: "summary", title: "AI Interview Coach", description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#07070d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ink-950 font-sans text-zinc-100">
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-white px-4 py-2 font-medium text-ink-950 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <StatusProvider>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </StatusProvider>
      </body>
    </html>
  );
}
