import { defaultDesign } from './design.ts'
import { uid } from './ids.ts'
import { emptyBasics, emptyCoverLetter } from './normalize.ts'
import { createEntry, createSection } from './sections.ts'
import type { Design, Entry, ResumeData, ResumeDoc, SectionKind } from './types.ts'

/** Fictional personas only — every email uses example.com. */

const e = (kind: SectionKind, patch: Partial<Entry>): Entry => createEntry(kind, { bullets: [], ...patch })

export function developerSample(): ResumeData {
  return {
    basics: {
      ...emptyBasics,
      name: 'Aarav Mehta',
      title: 'Full-Stack Developer',
      email: 'aarav.mehta@example.com',
      phone: '+91 98765 43210',
      location: 'Bengaluru, India',
      website: 'aarav.dev',
      linkedin: 'linkedin.com/in/aaravmehta',
      github: 'github.com/aaravmehta',
    },
    sections: [
      createSection('summary', 'Summary', {
        content:
          'Full-stack developer with 2+ years of experience building fast, accessible web apps with **React**, **Next.js** and **Node.js**. Shipped features used by 200k+ users, cut page load time by 45% and enjoy turning messy requirements into clean, well-tested products.',
      }),
      createSection('experience', 'Experience', {
        items: [
          e('experience', {
            title: 'Software Engineer',
            subtitle: 'Finlytics Technologies',
            location: 'Bengaluru',
            start: '2024-07',
            current: true,
            bullets: [
              'Built a real-time portfolio dashboard in Next.js and WebSockets used by **200k+ monthly users**',
              'Reduced Largest Contentful Paint by 45% through code-splitting, image optimisation and edge caching',
              'Designed a typed REST + tRPC API layer in Node.js and PostgreSQL, cutting API bugs by 30%',
              'Mentored 3 interns and introduced PR review guidelines and Playwright end-to-end tests',
            ],
          }),
          e('experience', {
            title: 'Frontend Developer Intern',
            subtitle: 'Kirana Cloud',
            location: 'Remote',
            start: '2024-01',
            end: '2024-06',
            bullets: [
              'Developed 15+ reusable React components for the merchant storefront design system',
              'Implemented offline-first order capture with IndexedDB, increasing order completion by 18%',
              'Automated deployments with GitHub Actions and Vercel preview environments',
            ],
          }),
        ],
      }),
      createSection('projects', 'Projects', {
        items: [
          e('projects', {
            title: 'Sabzee — Grocery Storefront',
            url: 'sabzee.vercel.app',
            keywords: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Zustand'],
            description: 'Quick-commerce storefront with filters, persistent cart, coupon engine, checkout validation and an order tracker.',
          }),
          e('projects', {
            title: 'TaskFlow — Kanban Board',
            url: 'github.com/aaravmehta/taskflow',
            keywords: ['React', 'dnd-kit', 'Zustand'],
            description: 'Trello-style board with accessible drag & drop, labels, checklists, due-date alerts and analytics.',
          }),
        ],
      }),
      createSection('skills', 'Skills', {
        items: [
          e('skills', { title: 'Languages', level: 5, keywords: ['TypeScript', 'JavaScript', 'Python', 'Java', 'SQL'] }),
          e('skills', { title: 'Frontend', level: 5, keywords: ['React', 'Next.js', 'Tailwind CSS', 'Redux', 'Zustand'] }),
          e('skills', { title: 'Backend', level: 4, keywords: ['Node.js', 'Express', 'PostgreSQL', 'MongoDB', 'tRPC'] }),
          e('skills', { title: 'Tools', level: 4, keywords: ['Git', 'Docker', 'GitHub Actions', 'Vercel', 'Playwright'] }),
        ],
      }),
      createSection('education', 'Education', {
        items: [
          e('education', { title: 'B.Tech, Computer Science & Engineering', subtitle: 'RV College of Engineering', location: 'Bengaluru', start: '2020', end: '2024', meta: 'CGPA 8.7 / 10' }),
        ],
      }),
      createSection('certifications', 'Certifications', {
        items: [
          e('certifications', { title: 'AWS Certified Cloud Practitioner', subtitle: 'Amazon Web Services', start: '2025-03' }),
          e('certifications', { title: 'Meta Front-End Developer', subtitle: 'Coursera', start: '2024-05' }),
        ],
      }),
      createSection('languages', 'Languages', {
        items: [e('languages', { title: 'English', level: 5 }), e('languages', { title: 'Hindi', level: 5 }), e('languages', { title: 'Kannada', level: 3 })],
      }),
    ],
  }
}

/** A longer, two-page persona that exercises publications, awards, references and pagination. */
export function researcherSample(): ResumeData {
  return {
    basics: {
      ...emptyBasics,
      name: 'Dr. Meera Iyer',
      title: 'Senior Machine Learning Scientist',
      email: 'meera.iyer@example.com',
      phone: '+91 99001 23456',
      location: 'Hyderabad, India',
      website: 'meeraiyer.ai',
      linkedin: 'linkedin.com/in/meeraiyer',
      github: 'github.com/meera-iyer',
    },
    sections: [
      createSection('summary', 'Profile', {
        content:
          'Machine learning scientist with 8 years of experience taking NLP and forecasting research from paper to production. Led teams of up to 9, published 12 peer-reviewed papers and shipped models that save **₹14 crore a year** in logistics costs. Comfortable across PyTorch, distributed training, MLOps and stakeholder communication.',
      }),
      createSection('experience', 'Experience', {
        items: [
          e('experience', {
            title: 'Senior ML Scientist',
            subtitle: 'Kestrel Logistics',
            location: 'Hyderabad',
            start: '2021-04',
            current: true,
            bullets: [
              'Lead a team of 9 scientists and engineers building demand-forecasting models for 4,000+ delivery hubs',
              'Designed a hierarchical transformer forecaster that cut forecast error (WAPE) by 23% versus the gradient-boosting baseline',
              'Built a feature store and Airflow retraining pipeline, reducing model refresh time from 3 days to 4 hours',
              'Partnered with operations leaders to translate forecasts into staffing plans, saving ₹14 crore annually',
              'Introduced offline evaluation standards and model cards adopted by 5 product teams',
            ],
          }),
          e('experience', {
            title: 'Machine Learning Engineer',
            subtitle: 'Vaani Labs',
            location: 'Bengaluru',
            start: '2018-07',
            end: '2021-03',
            bullets: [
              'Trained multilingual speech-to-intent models for 11 Indian languages serving 2M+ monthly queries',
              'Distilled a 300M-parameter model into a 40M on-device model with only a 1.2% accuracy drop',
              'Cut GPU training cost by 38% with mixed precision, gradient checkpointing and spot-instance scheduling',
              'Open-sourced a Hindi–English code-mixed dataset (25k utterances) now cited by 60+ papers',
            ],
          }),
          e('experience', {
            title: 'Research Intern',
            subtitle: 'Microsoft Research India',
            location: 'Bengaluru',
            start: '2017-05',
            end: '2017-08',
            bullets: [
              'Prototyped low-resource transliteration models; results published at EMNLP Findings',
              'Implemented a beam-search decoder in C++ that ran 6× faster than the Python baseline',
            ],
          }),
          e('experience', {
            title: 'Teaching Assistant — Machine Learning',
            subtitle: 'IIT Madras',
            location: 'Chennai',
            start: '2016-08',
            end: '2018-05',
            bullets: ['Ran weekly labs for 120 students and redesigned assignments around real-world datasets', 'Received the departmental award for teaching excellence (2017)'],
          }),
        ],
      }),
      createSection('education', 'Education', {
        items: [
          e('education', { title: 'PhD, Computer Science (Natural Language Processing)', subtitle: 'IIT Madras', location: 'Chennai', start: '2014', end: '2018', meta: 'Thesis: Learning from noisy multilingual text' }),
          e('education', { title: 'M.Sc., Mathematics', subtitle: 'University of Hyderabad', location: 'Hyderabad', start: '2012', end: '2014', meta: 'First class with distinction' }),
          e('education', { title: 'B.Sc., Mathematics & Statistics', subtitle: "St. Francis College for Women", location: 'Hyderabad', start: '2009', end: '2012', meta: '91.2%' }),
        ],
      }),
      createSection('publications', 'Selected publications', {
        items: [
          e('publications', { title: 'Hierarchical Transformers for Multi-Horizon Demand Forecasting', meta: 'M. Iyer, R. Varma, S. Khan', subtitle: 'KDD Applied Data Science Track', start: '2024-08', url: 'doi.org/10.1145/0000001' }),
          e('publications', { title: 'Code-Mixed Speech Intent Detection with Weak Supervision', meta: 'M. Iyer, A. Rao', subtitle: 'Interspeech', start: '2021-09' }),
          e('publications', { title: 'Distilling Multilingual Encoders for On-Device Assistants', meta: 'M. Iyer, P. Sen, A. Rao', subtitle: 'EMNLP Industry Track', start: '2020-11' }),
          e('publications', { title: 'Low-Resource Transliteration via Phonetic Alignment', meta: 'M. Iyer, K. Bali', subtitle: 'Findings of EMNLP', start: '2018-10' }),
          e('publications', { title: 'Learning from Noisy Multilingual Text (PhD thesis)', meta: 'M. Iyer', subtitle: 'IIT Madras', start: '2018-06' }),
        ],
      }),
      createSection('projects', 'Open source', {
        items: [
          e('projects', { title: 'hinglish-intents', url: 'github.com/meera-iyer/hinglish-intents', keywords: ['PyTorch', 'Hugging Face', 'Datasets'], description: 'Code-mixed intent dataset and baselines; 1.4k GitHub stars.' }),
          e('projects', { title: 'forecastkit', url: 'github.com/meera-iyer/forecastkit', keywords: ['Python', 'Polars', 'Lightning'], description: 'Evaluation toolkit for hierarchical forecasts with reconciliation and backtesting utilities.' }),
        ],
      }),
      createSection('skills', 'Skills', {
        items: [
          e('skills', { title: 'Machine learning', level: 5, keywords: ['PyTorch', 'Transformers', 'Time series', 'NLP', 'Speech', 'Bayesian methods'] }),
          e('skills', { title: 'Engineering', level: 4, keywords: ['Python', 'SQL', 'Spark', 'Airflow', 'Docker', 'Kubernetes'] }),
          e('skills', { title: 'Cloud & MLOps', level: 4, keywords: ['AWS SageMaker', 'MLflow', 'Feature stores', 'CI/CD'] }),
          e('skills', { title: 'Leadership', level: 4, keywords: ['Hiring', 'Mentoring', 'Roadmapping', 'Stakeholder management'] }),
        ],
      }),
      createSection('awards', 'Awards', {
        items: [
          e('awards', { title: 'Best Applied Paper Award', subtitle: 'KDD', start: '2024-08' }),
          e('awards', { title: 'Google PhD Fellowship in NLP', subtitle: 'Google Research', start: '2016-04' }),
          e('awards', { title: 'Teaching Excellence Award', subtitle: 'IIT Madras', start: '2017-05' }),
        ],
      }),
      createSection('certifications', 'Certifications', {
        items: [e('certifications', { title: 'AWS Certified Machine Learning — Specialty', subtitle: 'Amazon Web Services', start: '2023-02' })],
      }),
      createSection('volunteering', 'Volunteering', {
        items: [
          e('volunteering', {
            title: 'Mentor',
            subtitle: 'Women in ML India',
            start: '2019-01',
            current: true,
            bullets: ['Mentored 30+ early-career researchers; 12 have since published at top-tier venues'],
          }),
        ],
      }),
      createSection('languages', 'Languages', {
        items: [e('languages', { title: 'English', level: 5 }), e('languages', { title: 'Tamil', level: 5 }), e('languages', { title: 'Hindi', level: 4 }), e('languages', { title: 'Telugu', level: 3 })],
      }),
      createSection('references', 'References', {
        items: [
          e('references', { title: 'Prof. Anil Rao', subtitle: 'Professor of CSE, IIT Madras', meta: 'anil.rao@example.com' }),
          e('references', { title: 'Sana Khan', subtitle: 'VP Data Science, Kestrel Logistics', meta: 'sana.khan@example.com' }),
        ],
      }),
      createSection('interests', 'Interests', {
        items: [e('interests', { title: 'Carnatic music' }), e('interests', { title: 'Trail running' }), e('interests', { title: 'Science outreach' })],
      }),
    ],
  }
}

export function blankData(): ResumeData {
  return {
    basics: { ...emptyBasics },
    sections: [
      createSection('summary'),
      createSection('experience', undefined, { items: [createEntry('experience')] }),
      createSection('education', undefined, { items: [createEntry('education')] }),
      createSection('skills', undefined, { items: [createEntry('skills')] }),
    ],
  }
}

export type StarterKind = 'developer' | 'researcher' | 'blank'

export function makeDoc(starter: StarterKind, name?: string, design?: Partial<Design>): ResumeDoc {
  const now = Date.now()
  const data = starter === 'developer' ? developerSample() : starter === 'researcher' ? researcherSample() : blankData()
  return {
    id: uid(),
    name: name ?? (starter === 'blank' ? 'Untitled resume' : `${data.basics.name} — ${data.basics.title}`),
    createdAt: now,
    updatedAt: now,
    data,
    design: { ...defaultDesign, ...(starter === 'researcher' ? { template: 'academic' as const, accent: '#1e3a5f' } : {}), ...design },
    coverLetter: { ...emptyCoverLetter },
    jobDescription: '',
    snapshots: [],
  }
}
