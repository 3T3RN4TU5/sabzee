interface ValueBlockProps {
  label: string
  value: string
  tone?: 'default' | 'fail' | 'pass'
}

export function ValueBlock({ label, value, tone = 'default' }: ValueBlockProps) {
  const color = tone === 'fail' ? 'text-fail' : tone === 'pass' ? 'text-pass' : 'text-ink'
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-ink-faint">{label}</p>
      <pre className={`max-h-48 overflow-auto rounded-lg bg-raised px-3 py-2 font-mono text-[13px] leading-5 break-all whitespace-pre-wrap ${color}`}>
        {value}
      </pre>
    </div>
  )
}
