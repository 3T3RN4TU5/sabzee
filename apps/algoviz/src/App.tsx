import { useState } from 'react'
import { Footer } from './components/Footer.tsx'
import { Header } from './components/Header.tsx'
import { HowToDialog } from './components/HowToDialog.tsx'
import { PathfindingView } from './components/pathfinding/PathfindingView.tsx'
import { SortingView } from './components/sorting/SortingView.tsx'
import { TAB_IDS, type Tab } from './config.ts'
import { useHashRoute } from './lib/hooks.ts'
import { STORAGE_KEYS, readStorage, writeStorage } from './lib/storage.ts'

export default function App() {
  const tab = useHashRoute<Tab>(TAB_IDS, 'sorting')
  // Show the guide automatically on the first visit only.
  const [helpOpen, setHelpOpen] = useState(() => readStorage(STORAGE_KEYS.onboarded, (v) => v === true) !== true)

  const closeHelp = () => {
    setHelpOpen(false)
    writeStorage(STORAGE_KEYS.onboarded, true)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-slate-900 px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        Skip to content
      </a>
      <Header tab={tab} onHelp={() => setHelpOpen(true)} />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 outline-none sm:px-6 sm:py-8">
        {/* Both views stay mounted so switching tabs keeps their state. */}
        <div id="panel-sorting" role="tabpanel" aria-labelledby="tab-sorting" hidden={tab !== 'sorting'}>
          <SortingView active={tab === 'sorting' && !helpOpen} />
        </div>
        <div id="panel-pathfinding" role="tabpanel" aria-labelledby="tab-pathfinding" hidden={tab !== 'pathfinding'}>
          <PathfindingView active={tab === 'pathfinding'} />
        </div>
      </main>
      <Footer />
      <HowToDialog open={helpOpen} tab={tab} onClose={closeHelp} />
    </div>
  )
}
