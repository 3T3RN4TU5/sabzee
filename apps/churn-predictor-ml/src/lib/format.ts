export const pct = (x: number, digits = 1): string => `${(x * 100).toFixed(digits)}%`
export const num = (x: number, digits = 3): string => x.toFixed(digits)
export const usd = (x: number): string =>
  `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
export const signed = (x: number, digits = 2): string => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(digits)}`
