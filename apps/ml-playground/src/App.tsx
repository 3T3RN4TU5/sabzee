import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { Footer } from './components/Footer.tsx'
import { Header } from './components/Header.tsx'
import { PAGE_IDS, type PageId } from './config.ts'
import { useHashRoute } from './lib/hooks.ts'

const pages: Record<PageId, LazyExoticComponent<ComponentType>> = {
  nn: lazy(() => import('./pages/NeuralNetPage.tsx')),
  optimizers: lazy(() => import('./pages/OptimizerRacePage.tsx')),
  classical: lazy(() => import('./pages/ClassicalPage.tsx')),
  unsupervised: lazy(() => import('./pages/UnsupervisedPage.tsx')),
  math: lazy(() => import('./pages/MathPage.tsx')),
}

export default function App() {
  const page = useHashRoute<PageId>(PAGE_IDS, 'nn')
  const Page = pages[page]
  return (
    <div className="flex min-h-dvh flex-col">
      <Header page={page} />
      <main id="main" className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Suspense fallback={<div className="py-24 text-center text-sm text-slate-500">Loading…</div>}>
          <Page key={page} />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
