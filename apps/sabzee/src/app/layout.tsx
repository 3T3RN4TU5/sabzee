import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/Toaster";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Sabzee — Farm-fresh vegetables & fruits delivered",
    template: "%s · Sabzee",
  },
  description:
    "Sabzee is a modern grocery storefront for farm-fresh vegetables, fruits, greens and herbs — delivered in 30 minutes. Built with Next.js, TypeScript and Tailwind CSS.",
  keywords: ["grocery", "vegetables", "fruits", "e-commerce", "Next.js", "sabzi"],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
