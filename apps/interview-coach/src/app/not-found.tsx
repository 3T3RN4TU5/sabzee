import { Compass } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-white/5 text-zinc-300 ring-1 ring-white/10 ring-inset">
        <Compass className="size-7" aria-hidden />
      </span>
      <p className="mt-5 text-sm font-medium text-violet-300">404</p>
      <h1 className="mt-1 text-2xl font-semibold text-white">This page doesn&apos;t exist</h1>
      <p className="mt-2 text-zinc-400">The link may be broken, or the page may have moved.</p>
      <Link href="/" className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink-950 transition hover:bg-zinc-200">
        Back to home
      </Link>
    </div>
  );
}
