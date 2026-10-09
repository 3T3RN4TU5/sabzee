export type BarState = 'idle' | 'compare' | 'swap' | 'pivot' | 'sorted'

/** Legend entries; the swatch classes mirror the bar colours in Bars.tsx. */
export const BAR_STATES: { state: BarState; label: string; swatch: string }[] = [
  { state: 'idle', label: 'Unsorted', swatch: 'bg-indigo-400/70' },
  { state: 'compare', label: 'Comparing', swatch: 'bg-amber-300' },
  { state: 'swap', label: 'Swap / write', swatch: 'bg-rose-500' },
  { state: 'pivot', label: 'Pivot / key', swatch: 'bg-fuchsia-400' },
  { state: 'sorted', label: 'Sorted', swatch: 'bg-emerald-400' },
]
