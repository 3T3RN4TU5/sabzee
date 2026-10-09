import { useCallback, useEffect, useState } from 'react'
import { getSortAlgorithm } from '../../algorithms/sorting/index.ts'
import { generateInput, seededRng, type InputPreset } from '../../algorithms/sorting/inputs.ts'
import { STORAGE_KEYS, writeStorage } from '../../lib/storage.ts'
import { Kbd, ViewIntro } from '../ViewIntro.tsx'
import { RaceStage } from './RaceStage.tsx'
import { SingleStage } from './SingleStage.tsx'
import { loadSortSettings, type SortSettings } from './settings.ts'
import { SortToolbar } from './SortToolbar.tsx'

interface InputState {
  values: number[]
  /** Bumped on every new array so the stage remounts with fresh playback. */
  version: number
}

export function SortingView({ active }: { active: boolean }) {
  const [settings, setSettings] = useState(loadSortSettings)
  // Seeded so the very first render is deterministic; later arrays use Math.random.
  const [input, setInput] = useState<InputState>(() => ({
    values: generateInput(settings.preset, settings.size, seededRng(2410)),
    version: 0,
  }))

  useEffect(() => writeStorage(STORAGE_KEYS.sorting, settings), [settings])

  const regenerate = useCallback((preset: InputPreset, size: number) => {
    const values = generateInput(preset, size, Math.random)
    setInput((prev) => ({ values, version: prev.version + 1 }))
  }, [])

  const { preset, size } = settings
  const newArray = useCallback(() => regenerate(preset, size), [regenerate, preset, size])

  const onChange = (patch: Partial<SortSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    if (patch.preset !== undefined || patch.size !== undefined) regenerate(patch.preset ?? preset, patch.size ?? size)
  }

  const algorithm = getSortAlgorithm(settings.algorithm)
  const stageProps = { input: input.values, speed: settings.speed, active, onNewArray: newArray }

  return (
    <div className="flex flex-col gap-4">
      <ViewIntro
        title="Sorting algorithms"
        description="Every compare, swap and write is recorded as a step — play it back, scrub the timeline, or race two algorithms on the same input."
        shortcuts={
          <>
            <Kbd>Space</Kbd> play · <Kbd>←</Kbd>
            <Kbd>→</Kbd> step · <Kbd>R</Kbd> reset · <Kbd>N</Kbd> new array
          </>
        }
      />
      <SortToolbar settings={settings} onChange={onChange} onNewArray={newArray} />
      {settings.mode === 'single' ? (
        <SingleStage key={`single-${algorithm.id}-${input.version}`} algorithm={algorithm} {...stageProps} />
      ) : (
        <RaceStage
          key={`race-${algorithm.id}-${settings.rival}-${input.version}`}
          first={algorithm}
          second={getSortAlgorithm(settings.rival)}
          {...stageProps}
        />
      )}
    </div>
  )
}
