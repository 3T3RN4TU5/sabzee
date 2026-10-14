import { PageIntro } from '../components/PageIntro.tsx'
import { DbscanSection } from './unsupervised/DbscanSection.tsx'
import { KMeansSection } from './unsupervised/KMeansSection.tsx'
import { PcaSection, TsneSection } from './unsupervised/PcaSection.tsx'

export default function UnsupervisedPage() {
  return (
    <div className="space-y-5">
      <PageIntro
        title="Unsupervised learning"
        lead="Structure without labels: watch Lloyd's algorithm alternate between assigning and averaging, let DBSCAN grow clusters from dense cores, and project real datasets (Iris, Wine, 8×8 digits) with PCA and t-SNE, all computed by the from-scratch engine."
      />
      <KMeansSection />
      <DbscanSection />
      <PcaSection />
      <TsneSection />
    </div>
  )
}
