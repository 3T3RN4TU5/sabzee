let counter = 0

/** Short, collision-resistant id (time + counter + randomness). */
export function uid(): string {
  counter = (counter + 1) % 1296
  const rand = Math.floor(Math.random() * 36 ** 5)
    .toString(36)
    .padStart(5, '0')
  return `${Date.now().toString(36).slice(-5)}${counter.toString(36).padStart(2, '0')}${rand}`
}
