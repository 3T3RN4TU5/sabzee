import type { ReactNode } from 'react'
import { PageIntro } from '../components/PageIntro.tsx'
import { Tex } from '../components/Tex.tsx'
import { REPO_URL } from '../config.ts'

interface Section {
  id: string
  title: string
  source: string
  body: ReactNode
}

const T = Tex
const B = ({ children }: { children: string }) => <Tex block>{children}</Tex>

const SECTIONS: Section[] = [
  {
    id: 'autograd',
    title: 'Reverse-mode autodiff and backpropagation',
    source: 'src/engine/tensor.ts',
    body: (
      <>
        <p>
          Every operation records its inputs and a local derivative rule, building a directed acyclic graph. For a scalar loss <T>L</T>, <code>backward()</code> sorts the graph
          topologically and visits it from the output to the leaves, applying the chain rule. A node that feeds several consumers sums their contributions:
        </p>
        <B>{'\\bar v \\;=\\; \\frac{\\partial L}{\\partial v} \\;=\\; \\sum_{u \\,\\in\\, \\text{children}(v)} \\bar u \\, \\frac{\\partial u}{\\partial v}'}</B>
        <p>The rules for the core ops of a dense layer <T>{'Y = XW + b'}</T> (with <T>b</T> broadcast over rows, so its gradient sums over the batch):</p>
        <B>{'\\bar X = \\bar Y W^\\top, \\qquad \\bar W = X^\\top \\bar Y, \\qquad \\bar b = \\textstyle\\sum_i \\bar Y_{i,:}'}</B>
        <p>
          Softmax and cross-entropy are fused for numerical stability (log-sum-exp). The gradient with respect to the logits is simply
        </p>
        <B>{'L = -\\frac1N \\sum_i \\log \\operatorname{softmax}(z_i)_{y_i}, \\qquad \\frac{\\partial L}{\\partial z_i} = \\frac1N\\big(\\operatorname{softmax}(z_i) - \\mathbf{1}_{y_i}\\big)'}</B>
        <p>
          Every op is checked against central finite differences <T>{'\\big(f(x+\\varepsilon) - f(x-\\varepsilon)\\big)/2\\varepsilon'}</T> in the test suite, including broadcasting cases.
        </p>
      </>
    ),
  },
  {
    id: 'init',
    title: 'Initialisation, regularisation, dropout',
    source: 'src/engine/nn.ts',
    body: (
      <>
        <p>Weights are drawn to keep activation variance roughly constant across layers:</p>
        <B>{'\\text{Xavier: } \\operatorname{Var}(W) = \\frac{2}{n_\\text{in} + n_\\text{out}} \\qquad \\text{He: } \\operatorname{Var}(W) = \\frac{2}{n_\\text{in}}'}</B>
        <p>
          L2 weight decay adds <T>{'\\tfrac{\\lambda}{2}\\lVert W \\rVert^2'}</T> to the loss (gradient <T>{'\\lambda W'}</T>). Inverted dropout multiplies activations by a mask{' '}
          <T>{'m_j \\sim \\text{Bernoulli}(1-p)/(1-p)'}</T> during training, so <T>{'\\mathbb E[m_j] = 1'}</T> and inference needs no rescaling.
        </p>
      </>
    ),
  },
  {
    id: 'optim',
    title: 'Optimizers and learning-rate schedules',
    source: 'src/engine/optim.ts',
    body: (
      <>
        <B>{'\\begin{aligned} \\text{SGD:}\\;& \\theta \\leftarrow \\theta - \\eta g \\\\ \\text{Momentum:}\\;& v \\leftarrow \\mu v + g,\\;\\; \\theta \\leftarrow \\theta - \\eta v \\\\ \\text{Nesterov:}\\;& v \\leftarrow \\mu v + g,\\;\\; \\theta \\leftarrow \\theta - \\eta (g + \\mu v) \\\\ \\text{RMSProp:}\\;& s \\leftarrow \\rho s + (1-\\rho) g^2,\\;\\; \\theta \\leftarrow \\theta - \\eta\\, g/(\\sqrt{s}+\\epsilon) \\end{aligned}'}</B>
        <p>Adam keeps bias-corrected first and second moments; AdamW decouples weight decay from the adaptive step:</p>
        <B>{'m \\leftarrow \\beta_1 m + (1-\\beta_1) g,\\;\\; v \\leftarrow \\beta_2 v + (1-\\beta_2) g^2,\\;\\; \\theta \\leftarrow \\theta - \\eta \\frac{m/(1-\\beta_1^t)}{\\sqrt{v/(1-\\beta_2^t)}+\\epsilon} \\;\\big[-\\,\\eta\\lambda\\theta\\big]_{\\text{AdamW}}'}</B>
        <B>{'\\eta_\\text{step}(e) = \\eta_0 \\gamma^{\\lfloor e/s \\rfloor}, \\qquad \\eta_\\text{cos}(e) = \\eta_\\min + \\tfrac12(\\eta_0 - \\eta_\\min)\\big(1 + \\cos(\\pi \\tfrac{e \\bmod T}{T})\\big)'}</B>
      </>
    ),
  },
  {
    id: 'linear',
    title: 'Linear and ridge regression',
    source: 'src/engine/classical/linear.ts · linalg.ts',
    body: (
      <>
        <p>After centring <T>X</T> and <T>y</T> (so the intercept is not penalised), ridge regression has the closed form</p>
        <B>{'\\hat w = (X^\\top X + \\alpha I)^{-1} X^\\top y, \\qquad b = \\bar y - \\bar x^\\top \\hat w'}</B>
        <p>
          The <b>Cholesky</b> path factors <T>{'X^\\top X + \\alpha I = LL^\\top'}</T> and solves two triangular systems. The <b>QR</b> path never forms <T>{'X^\\top X'}</T> (which squares the
          condition number): Householder reflections give <T>{'\\begin{bmatrix} X \\\\ \\sqrt\\alpha I\\end{bmatrix} = QR'}</T>, then <T>{'R\\hat w = Q^\\top \\tilde y'}</T>. Both agree with
          scikit-learn to 1e-8 and with gradient descent run through the autograd engine.
        </p>
        <p>Bias–variance: for squared loss the expected test error decomposes as</p>
        <B>{'\\mathbb E\\big[(y - \\hat f(x))^2\\big] = \\underbrace{\\big(f(x) - \\mathbb E \\hat f(x)\\big)^2}_{\\text{bias}^2} + \\underbrace{\\operatorname{Var}\\,\\hat f(x)}_{\\text{variance}} + \\sigma^2'}</B>
      </>
    ),
  },
  {
    id: 'logistic',
    title: 'Logistic regression (Newton / IRLS)',
    source: 'src/engine/classical/linear.ts',
    body: (
      <>
        <B>{'p_i = \\sigma(w^\\top x_i), \\quad \\nabla = \\tfrac1n X^\\top (p - y) + \\lambda w, \\quad H = \\tfrac1n X^\\top S X + \\lambda I, \\;\\; S = \\operatorname{diag}\\big(p_i(1-p_i)\\big)'}</B>
        <p>
          Newton's step <T>{'w \\leftarrow w - H^{-1}\\nabla'}</T> (Cholesky solve) converges quadratically, in under ten iterations here. Polynomial features make the boundary non-linear;
          with more than two classes the model becomes softmax regression trained by gradient descent.
        </p>
      </>
    ),
  },
  {
    id: 'svm',
    title: 'Support vector machines and SMO',
    source: 'src/engine/classical/svm.ts',
    body: (
      <>
        <p>The soft-margin dual, with kernel <T>{'K(x, x\') = e^{-\\gamma \\lVert x - x\' \\rVert^2}'}</T> for RBF:</p>
        <B>{'\\min_\\alpha \\tfrac12 \\sum_{i,j} \\alpha_i \\alpha_j y_i y_j K(x_i, x_j) - \\sum_i \\alpha_i \\quad \\text{s.t. } 0 \\le \\alpha_i \\le C,\\; \\sum_i y_i \\alpha_i = 0'}</B>
        <p>
          SMO updates two multipliers at a time (the smallest set that keeps the equality constraint), choosing the pair with LIBSVM's second-order rule: <T>i</T> maximises the KKT
          violation <T>{'-y_i \\nabla_i'}</T> and <T>j</T> maximises the guaranteed decrease <T>{'b_{ij}^2 / a_{ij}'}</T> with <T>{'a_{ij} = K_{ii} + K_{jj} - 2K_{ij}'}</T>. The prediction is{' '}
          <T>{'f(x) = \\sum_i \\alpha_i y_i K(x_i, x) - \\rho'}</T>; points with <T>{'\\alpha_i > 0'}</T> are the support vectors.
        </p>
      </>
    ),
  },
  {
    id: 'trees',
    title: 'Decision trees and random forests',
    source: 'src/engine/classical/tree.ts',
    body: (
      <>
        <B>{'\\text{Gini}(S) = 1 - \\sum_c p_c^2, \\qquad H(S) = -\\sum_c p_c \\log_2 p_c, \\qquad \\Delta = I(S) - \\tfrac{|S_L|}{|S|} I(S_L) - \\tfrac{|S_R|}{|S|} I(S_R)'}</B>
        <p>
          CART sorts each feature once per node and sweeps the class counts to evaluate every threshold, greedily taking the split with the largest impurity decrease. A forest
          averages trees grown on bootstrap samples with <T>{'\\sqrt d'}</T> random features per split, which de-correlates them and reduces variance.
        </p>
      </>
    ),
  },
  {
    id: 'knn-nb',
    title: 'k-NN and Gaussian naive Bayes',
    source: 'src/engine/classical/knn.ts · naiveBayes.ts',
    body: (
      <>
        <p>
          k-NN votes among the <T>k</T> closest training points. A k-d tree splits on the median of alternating axes; the search descends to the query's leaf and only crosses a splitting
          plane when <T>{'(q_a - s_a)^2'}</T> is smaller than the current k-th best distance.
        </p>
        <B>{'\\hat y = \\arg\\max_c \\Big[ \\log P(c) + \\sum_j \\log \\mathcal N\\big(x_j \\mid \\mu_{cj}, \\sigma^2_{cj}\\big) \\Big]'}</B>
      </>
    ),
  },
  {
    id: 'kmeans',
    title: 'k-means++ and DBSCAN',
    source: 'src/engine/unsupervised/kmeans.ts · dbscan.ts',
    body: (
      <>
        <p>Lloyd's algorithm minimises the inertia by alternating two steps that each can only decrease it:</p>
        <B>{'J = \\sum_i \\lVert x_i - \\mu_{c_i} \\rVert^2, \\qquad c_i \\leftarrow \\arg\\min_k \\lVert x_i - \\mu_k\\rVert, \\qquad \\mu_k \\leftarrow \\frac{1}{|C_k|}\\sum_{i \\in C_k} x_i'}</B>
        <p>
          k-means++ seeds each new centre with probability <T>{'\\propto D(x)^2'}</T>, giving an <T>{'O(\\log k)'}</T>-competitive start. Silhouette{' '}
          <T>{'s_i = (b_i - a_i)/\\max(a_i, b_i)'}</T> scores the result. DBSCAN instead calls a point <i>core</i> if <T>{'|N_\\varepsilon(x)| \\ge \\text{minPts}'}</T> and grows clusters
          through chains of core points.
        </p>
      </>
    ),
  },
  {
    id: 'pca',
    title: 'PCA: Jacobi and power iteration',
    source: 'src/engine/unsupervised/pca.ts · linalg.ts',
    body: (
      <>
        <B>{'\\Sigma = \\tfrac{1}{n-1} X_c^\\top X_c = V \\Lambda V^\\top, \\qquad Z = X_c V_{:,1:k}, \\qquad \\text{EVR}_k = \\lambda_k / \\textstyle\\sum_j \\lambda_j'}</B>
        <p>
          Cyclic Jacobi applies plane rotations <T>{'J^\\top \\Sigma J'}</T> that zero one off-diagonal entry at a time, with <T>{'\\tan\\theta'}</T> chosen from{' '}
          <T>{'\\cot 2\\theta = (\\sigma_{qq} - \\sigma_{pp}) / 2\\sigma_{pq}'}</T>, until the matrix is diagonal. Power iteration repeats <T>{'v \\leftarrow \\Sigma v / \\lVert \\Sigma v\\rVert'}</T>{' '}
          and deflates <T>{'\\Sigma \\leftarrow \\Sigma - \\lambda v v^\\top'}</T>. Both match scikit-learn on Iris.
        </p>
      </>
    ),
  },
  {
    id: 'tsne',
    title: 't-SNE',
    source: 'src/engine/unsupervised/tsne.ts',
    body: (
      <>
        <B>{'p_{j|i} = \\frac{e^{-\\beta_i \\lVert x_i - x_j\\rVert^2}}{\\sum_{k\\ne i} e^{-\\beta_i \\lVert x_i - x_k\\rVert^2}}, \\quad 2^{H(P_i)} = \\text{perplexity}, \\quad q_{ij} = \\frac{(1+\\lVert y_i - y_j\\rVert^2)^{-1}}{\\sum_{k\\ne l}(1+\\lVert y_k - y_l\\rVert^2)^{-1}}'}</B>
        <B>{'\\frac{\\partial\\, \\mathrm{KL}(P\\Vert Q)}{\\partial y_i} = 4 \\sum_j (p_{ij} - q_{ij})(y_i - y_j)\\big(1 + \\lVert y_i - y_j\\rVert^2\\big)^{-1}'}</B>
      </>
    ),
  },
  {
    id: 'metrics',
    title: 'Evaluation metrics',
    source: 'src/engine/metrics.ts',
    body: (
      <>
        <B>{'\\text{precision} = \\frac{TP}{TP+FP}, \\quad \\text{recall} = \\frac{TP}{TP+FN}, \\quad F_1 = \\frac{2PR}{P+R}, \\quad \\text{AUC} = P\\big(s(x^+) > s(x^-)\\big)'}</B>
        <p>The ROC curve sweeps the decision threshold over the sorted scores (grouping ties) and the AUC is integrated with the trapezoid rule.</p>
      </>
    ),
  },
]

export default function MathPage() {
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Sections" className="hidden lg:block">
        <div className="sticky top-24 space-y-1">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#math`} onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }) }} className="block rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200">
              {s.title}
            </a>
          ))}
        </div>
      </nav>
      <div className="min-w-0 space-y-5">
        <PageIntro
          title="How it works"
          lead="The maths behind every demo, with a pointer to the file that implements it. Nothing here calls an ML library: the tensors, gradients, solvers and eigen-decompositions are all hand-written TypeScript."
        />
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="card prose-math scroll-mt-24 p-5">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-100">{s.title}</h2>
              <a href={`${REPO_URL}/blob/main/${s.source.split(' · ')[0]}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-cyan-400/80 hover:text-cyan-300">
                {s.source}
              </a>
            </div>
            {s.body}
          </section>
        ))}
      </div>
    </div>
  )
}
