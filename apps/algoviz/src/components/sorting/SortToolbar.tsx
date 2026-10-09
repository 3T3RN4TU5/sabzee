import { BarChart3, Shuffle, Swords } from 'lucide-react'
import { SORT_ALGORITHMS, type SortId } from '../../algorithms/sorting/index.ts'
import { INPUT_PRESETS, MAX_SIZE, MIN_SIZE, type InputPreset } from '../../algorithms/sorting/inputs.ts'
import { Button, RangeField, Segmented, SelectField } from '../ui/controls.tsx'
import { SPEEDS, speedLabel, type SortMode, type SortSettings } from './settings.ts'

const ALGORITHM_OPTIONS = SORT_ALGORITHMS.map((a) => ({ value: a.id, label: a.id === 'quick' ? 'Quick Sort (Lomuto)' : a.name }))
/** Race mode shows two narrower pickers, so it uses the plain names. */
const RACE_OPTIONS = SORT_ALGORITHMS.map((a) => ({ value: a.id, label: a.name }))
const PRESET_OPTIONS = INPUT_PRESETS.map((p) => ({ value: p.id, label: p.label }))
const MODE_OPTIONS = [
  { value: 'single' as const, label: 'Single', icon: <BarChart3 className="size-4" aria-hidden /> },
  { value: 'race' as const, label: 'Race', icon: <Swords className="size-4" aria-hidden /> },
]

const item = 'min-w-[9.5rem] flex-1'

export function SortToolbar({
  settings,
  onChange,
  onNewArray,
}: {
  settings: SortSettings
  onChange: (patch: Partial<SortSettings>) => void
  onNewArray: () => void
}) {
  const race = settings.mode === 'race'
  return (
    <section className="card p-4" aria-label="Sorting controls">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <Segmented<SortMode>
          label="Mode"
          className="w-full sm:w-auto"
          value={settings.mode}
          options={MODE_OPTIONS}
          onChange={(mode) => onChange({ mode })}
        />
        <SelectField<SortId>
          label={race ? 'Algorithm A' : 'Algorithm'}
          className={race ? item : `${item} basis-full sm:basis-auto`}
          value={settings.algorithm}
          options={race ? RACE_OPTIONS : ALGORITHM_OPTIONS}
          onChange={(algorithm) => onChange({ algorithm })}
        />
        {race && (
          <SelectField<SortId>
            label="Algorithm B"
            className={item}
            value={settings.rival}
            options={RACE_OPTIONS}
            onChange={(rival) => onChange({ rival })}
          />
        )}
        <SelectField<InputPreset>
          label="Input"
          className={item}
          value={settings.preset}
          options={PRESET_OPTIONS}
          onChange={(preset) => onChange({ preset })}
        />
        <RangeField
          label="Array size"
          className={item}
          min={MIN_SIZE}
          max={MAX_SIZE}
          value={settings.size}
          valueText={`${settings.size} bars`}
          onChange={(size) => onChange({ size })}
        />
        <RangeField
          label="Speed"
          className={item}
          min={0}
          max={SPEEDS.length - 1}
          value={settings.speed}
          valueText={speedLabel(settings.speed, race ? 'ops' : 'steps')}
          onChange={(speed) => onChange({ speed })}
        />
        <Button onClick={onNewArray} className="w-full sm:w-auto" title="New array (N)">
          <Shuffle className="size-4" aria-hidden />
          New array
        </Button>
      </div>
    </section>
  )
}
