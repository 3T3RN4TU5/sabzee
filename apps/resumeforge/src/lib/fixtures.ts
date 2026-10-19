/**
 * QA fixtures for templates: a "kitchen sink" resume that uses every section kind and the awkward
 * cases templates must survive (markdown, links, free-text dates, missing fields, long text).
 * Fictional data only — every email uses example.com.
 */
import { createEntry, createSection } from './sections.ts'
import { researcherSample } from './samples.ts'
import type { ResumeData } from './types.ts'

export function kitchenSinkData(): ResumeData {
  const d = researcherSample()
  const find = (k: string) => d.sections.find((s) => s.kind === k)!
  // markdown + links in a bullet and description
  find('experience').items[0].bullets[1] = 'Designed a **hierarchical transformer** forecaster ([paper](doi.org/10.1145/0000001)) that cut forecast error by *23%*'
  find('projects').items[0].description = 'Code-mixed intent dataset with `PyTorch` baselines — **1.4k** GitHub stars and [docs](hinglish-intents.example.com).'
  // free-text date, no location, no end date
  find('experience').items.push(createEntry('experience', { title: 'Freelance Data Consultant', subtitle: 'Self-employed', start: 'Summer 2016', bullets: ['Built churn models for 3 early-stage startups'] }))
  // skills without level / without title; languages without level
  find('skills').items.push(createEntry('skills', { title: 'Soft skills', keywords: ['Writing', 'Public speaking'] }), createEntry('skills', { keywords: ['LaTeX', 'Git'] }))
  find('languages').items.push(createEntry('languages', { title: 'German' }))
  // interests with details
  find('interests').items.push(createEntry('interests', { title: 'Photography', keywords: ['film', 'street'] }))
  // references with a note
  find('references').items[0].description = 'PhD advisor (2014–2018).'
  // a custom section with every custom field
  d.sections.push(
    createSection('custom', 'Talks & workshops', {
      items: [
        createEntry('custom', {
          title: 'Forecasting at scale — keynote',
          subtitle: 'PyData India',
          location: 'Bengaluru',
          start: '2023-11',
          url: 'pydata.example.com/2023/keynote',
          description: 'A 40-minute talk on **hierarchical reconciliation** in production.',
          bullets: ['Audience of 600+', 'Slides downloaded 2,000 times'],
        }),
        createEntry('custom', { title: 'Hands-on NLP for Indian languages', subtitle: 'IIIT Hyderabad workshop', start: '2022-02', end: '2022-03' }),
      ],
    }),
  )
  d.basics.website = 'meeraiyer.ai/research/publications-and-talks'
  return d
}

/** A short one-page resume (for one-page templates and thumbnails). */
export function minimalData(): ResumeData {
  return {
    basics: { name: 'Riya Sen', title: 'Product Designer', email: 'riya.sen@example.com', phone: '+91 90000 11111', location: 'Pune, India', website: 'riyasen.design', linkedin: '', github: '', photo: '' },
    sections: [
      createSection('summary', 'Summary', { content: 'Product designer with 3 years of experience shipping **mobile-first** fintech products.' }),
      createSection('experience', 'Experience', {
        items: [createEntry('experience', { title: 'Product Designer', subtitle: 'PayLeaf', start: '2023-01', current: true, bullets: ['Redesigned onboarding, lifting activation 22%', 'Built a 120-component design system in Figma'] })],
      }),
      createSection('skills', 'Skills', { items: [createEntry('skills', { title: 'Design', keywords: ['Figma', 'Prototyping', 'User research'] })] }),
    ],
  }
}
