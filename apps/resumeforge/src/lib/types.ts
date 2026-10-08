export interface Basics {
  name: string
  title: string
  email: string
  phone: string
  location: string
  website: string
  linkedin: string
  github: string
  summary: string
}

export interface Experience {
  id: string
  role: string
  company: string
  location: string
  start: string
  end: string
  current: boolean
  bullets: string
}

export interface Education {
  id: string
  degree: string
  school: string
  start: string
  end: string
  score: string
}

export interface Project {
  id: string
  name: string
  link: string
  tech: string
  description: string
}

export interface SkillGroup {
  id: string
  group: string
  items: string
}

export interface Certification {
  id: string
  name: string
  issuer: string
  year: string
}

export type SectionId = 'summary' | 'experience' | 'projects' | 'education' | 'skills' | 'certifications'

export type TemplateId = 'modern' | 'classic' | 'minimal'

export interface Resume {
  basics: Basics
  experience: Experience[]
  education: Education[]
  projects: Project[]
  skills: SkillGroup[]
  certifications: Certification[]
}

export interface Settings {
  template: TemplateId
  accent: string
  order: SectionId[]
  hidden: SectionId[]
}

export const sectionLabels: Record<SectionId, string> = {
  summary: 'Summary',
  experience: 'Experience',
  projects: 'Projects',
  education: 'Education',
  skills: 'Skills',
  certifications: 'Certifications',
}
