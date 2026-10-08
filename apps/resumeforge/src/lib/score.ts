import type { Resume } from './types'

export interface Check {
  label: string
  passed: boolean
  weight: number
  tip: string
}

const actionVerbs = /^(built|led|designed|developed|created|implemented|reduced|increased|improved|launched|shipped|automated|optimi[sz]ed|migrated|mentored|managed|delivered|architected|introduced|owned|scaled|drove|wrote|refactored)\b/i

export function analyse(r: Resume): { score: number; checks: Check[] } {
  const bullets = r.experience.flatMap((e) => e.bullets.split('\n').map((b) => b.trim()).filter(Boolean))
  const skillCount = r.skills.flatMap((s) => s.items.split(',').map((x) => x.trim()).filter(Boolean)).length
  const summaryWords = r.basics.summary.trim().split(/\s+/).filter(Boolean).length

  const checks: Check[] = [
    { label: 'Name & job title', passed: Boolean(r.basics.name.trim() && r.basics.title.trim()), weight: 10, tip: 'Add your full name and the role you are targeting.' },
    { label: 'Email & phone', passed: /\S+@\S+\.\S+/.test(r.basics.email) && r.basics.phone.replace(/\D/g, '').length >= 10, weight: 10, tip: 'Recruiters need a valid email and a 10-digit phone number.' },
    { label: 'LinkedIn or GitHub', passed: Boolean(r.basics.linkedin.trim() || r.basics.github.trim()), weight: 5, tip: 'Link your LinkedIn and GitHub so hiring teams can see your work.' },
    { label: 'Summary of 25–80 words', passed: summaryWords >= 25 && summaryWords <= 80, weight: 10, tip: `Your summary has ${summaryWords} words — aim for 2–4 punchy sentences.` },
    { label: 'Work experience or internships', passed: r.experience.length > 0, weight: 15, tip: 'Add internships, freelance or open-source work if you are a fresher.' },
    { label: 'Bullets start with action verbs', passed: bullets.length > 0 && bullets.filter((b) => actionVerbs.test(b)).length / bullets.length >= 0.6, weight: 10, tip: 'Start bullets with verbs like Built, Reduced, Led, Automated.' },
    { label: 'Quantified impact (numbers)', passed: bullets.filter((b) => /\d/.test(b)).length >= 2, weight: 15, tip: 'Add metrics: "cut load time by 40%", "used by 10k users".' },
    { label: 'At least 2 projects', passed: r.projects.length >= 2, weight: 10, tip: 'Showcase 2–4 projects with tech stack and a live link.' },
    { label: '8+ relevant skills', passed: skillCount >= 8, weight: 10, tip: `You list ${skillCount} skills — group them by Languages, Frontend, Backend, Tools.` },
    { label: 'Education added', passed: r.education.length > 0, weight: 5, tip: 'Include your degree, college and graduation year.' },
  ]

  const total = checks.reduce((s, c) => s + c.weight, 0)
  const score = Math.round((checks.filter((c) => c.passed).reduce((s, c) => s + c.weight, 0) / total) * 100)
  return { score, checks }
}
