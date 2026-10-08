"use client";

import { useState } from "react";
import { Send } from "lucide-react";

/** Opens the visitor's email client with a pre-filled message — no backend or third-party service needed. */
export function ContactForm({ email }: { email: string }) {
  const [form, setForm] = useState({ name: "", subject: "", message: "" });
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.name.trim().length < 2 || form.message.trim().length < 10) {
      setError("Please add your name and a message of at least 10 characters.");
      return;
    }
    setError("");
    const subject = encodeURIComponent(form.subject.trim() || `Hello from ${form.name.trim()}`);
    const body = encodeURIComponent(`${form.message.trim()}\n\n— ${form.name.trim()}`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }

  const input =
    "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/10";

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <input aria-label="Your name" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
        <input aria-label="Subject" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={input} />
      </div>
      <textarea
        aria-label="Message"
        placeholder="Tell me about the role or project…"
        rows={5}
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        className={`${input} resize-none`}
      />
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-violet-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:opacity-90"
      >
        <Send className="h-4 w-4" /> Send message
      </button>
    </form>
  );
}
