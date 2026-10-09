import { PATH_ALGORITHMS, type PathId } from '../../algorithms/pathfinding/index.ts'
import { STORAGE_KEYS, intInRange, isRecord, oneOf, readStorage } from '../../lib/storage.ts'
import { SPEED_LEVELS, type Brush } from './board.ts'

export interface PathSettings {
  algorithm: PathId
  speed: number
  brush: Brush
}

export const DEFAULT_PATH_SETTINGS: PathSettings = { algorithm: 'dijkstra', speed: 2, brush: 'wall' }

const PATH_IDS = PATH_ALGORITHMS.map((a) => a.id)

export function loadPathSettings(): PathSettings {
  const d = DEFAULT_PATH_SETTINGS
  return (
    readStorage(STORAGE_KEYS.pathfinding, (raw) =>
      isRecord(raw)
        ? {
            algorithm: oneOf(raw.algorithm, PATH_IDS, d.algorithm),
            speed: intInRange(raw.speed, 0, SPEED_LEVELS.length - 1, d.speed),
            brush: oneOf(raw.brush, ['wall', 'weight'] as const, d.brush),
          }
        : null,
    ) ?? d
  )
}
