import type { Typist } from '../hooks/useRoomChat'

function describe(typists: Typist[]): string {
  const names = typists.map((t) => t.name)
  if (names.length === 1) return `${names[0]} is typing…`
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`
  if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]} are typing…`
  return 'Several people are typing…'
}

/** Fixed-height row so the message list never jumps when someone starts or stops typing. */
export function TypingIndicator({ typists }: { typists: Typist[] }) {
  return (
    <div className="h-6 px-3 sm:px-5" aria-live="polite">
      {typists.length > 0 && (
        <p className="mx-auto flex max-w-4xl items-center gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex gap-0.5" aria-hidden="true">
            {[0, 150, 300].map((delay) => (
              <span key={delay} className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500" style={{ animationDelay: `${delay}ms` }} />
            ))}
          </span>
          <span className="truncate">
            {typists.length <= 3 ? (
              <>
                <strong className="font-semibold" style={{ color: typists[0].color }}>
                  {typists[0].name}
                </strong>
                {describe(typists).slice(typists[0].name.length)}
              </>
            ) : (
              describe(typists)
            )}
          </span>
        </p>
      )}
    </div>
  )
}
