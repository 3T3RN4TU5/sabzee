import { SORT_IDS, type SortId } from '../../algorithms/sorting/index.ts'
import { INPUT_PRESETS, MAX_SIZE, MIN_SIZE, type InputPreset } from '../../algorithms/sorting/inputs.ts'
import { STORAGE_KEYS, intInRange, isRecord, oneOf, readStorage } from '../../lib/storage.ts'

export type SortMode = 'single' | 'race'

export interface SortSettings {
  mode: SortMode
  algorithm: SortId
  /** The second algorithm in race mode. */
  rival: SortId
  preset: InputPreset
  size: number
  /** Index into {@link SPEEDS}. */
  speed: number
}

/** Playback rates in steps (single) or operations (race) per second. */
export const SPEEDS = [1, 2, 4, 8, 15, 30, 60, 120, 250, 500, 1000, 2000] as const

export const DEFAULT_SORT_SETTINGS: SortSettings = {
  mode: 'single',
  algorithm: 'quick',
  rival: 'merge',
  preset: 'random',
  size: 40,
  speed: 6,
}

const PRESET_IDS = INPUT_PRESETS.map((p) => p.id)

export function loadSortSettings(): SortSettings {
  const d = DEFAULT_SORT_SETTINGS
  return (
    readStorage(STORAGE_KEYS.sorting, (raw) =>
      isRecord(raw)
        ? {
            mode: oneOf(raw.mode, ['single', 'race'] as const, d.mode),
            algorithm: oneOf(raw.algorithm, SORT_IDS, d.algorithm),
            rival: oneOf(raw.rival, SORT_IDS, d.rival),
            preset: oneOf(raw.preset, PRESET_IDS, d.preset),
            size: intInRange(raw.size, MIN_SIZE, MAX_SIZE, d.size),
            speed: intInRange(raw.speed, 0, SPEEDS.length - 1, d.speed),
          }
        : null,
    ) ?? d
  )
}

export const speedLabel = (speed: number, unit: string) => `${SPEEDS[speed].toLocaleString('en-US')} ${unit}/s`
