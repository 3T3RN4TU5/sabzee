"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { profile } from "@/data/profile";

const links = [
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "github", label: "GitHub" },
  { id: "contact", label: "Contact" },
];

export function Nav() {
  const [active, setActive] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5] },
    );
    for (const l of links) {
      const el = document.getElementById(l.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#05060a]/75 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4" aria-label="Main">
        <a href="#top" className="font-mono text-sm font-bold text-white">
          <span className="text-violet-400">&lt;</span>
          {profile.name.toLowerCase()}
          <span className="text-violet-400"> /&gt;</span>
        </a>
        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${active === l.id ? "text-white" : "text-slate-400 hover:text-white"}`}
              >
                {l.label}
                <span className={`mx-auto mt-0.5 block h-0.5 rounded-full bg-violet-400 transition-all ${active === l.id ? "w-4" : "w-0"}`} />
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#contact"
          className="hidden rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-violet-200 md:inline-block"
        >
          Hire me
        </a>
        <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-lg p-2 text-slate-300 md:hidden" aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>
      {open && (
        <ul className="border-t border-white/5 px-5 pb-4 md:hidden">
          {links.map((l) => (
            <li key={l.id}>
              <a href={`#${l.id}`} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-3 text-sm font-medium text-slate-300 hover:text-white">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
