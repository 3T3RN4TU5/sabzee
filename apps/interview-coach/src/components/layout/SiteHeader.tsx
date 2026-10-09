"use client";

import { History, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/ui/icons";
import { StatusBadge } from "./StatusBadge";

export function SiteHeader() {
  const pathname = usePathname();
  const onHistory = pathname.startsWith("/history");

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/75 backdrop-blur-xl print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 rounded-lg" aria-label="AI Interview Coach — home">
          <LogoMark className="size-8 transition group-hover:scale-105" />
          <span className="hidden text-[15px] font-semibold tracking-tight text-white min-[400px]:inline">
            Interview<span className="text-zinc-400">Coach</span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <StatusBadge />
          <Link
            href="/history"
            aria-current={onHistory ? "page" : undefined}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-medium transition sm:px-3 ${
              onHistory ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <History className="size-4" aria-hidden />
            <span className="sr-only sm:not-sr-only">History</span>
          </Link>
          <Link
            href="/#setup"
            className="hidden h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-semibold text-ink-950 transition hover:bg-zinc-200 md:inline-flex"
          >
            <Plus className="size-4" aria-hidden />
            New interview
          </Link>
        </div>
      </div>
    </header>
  );
}
