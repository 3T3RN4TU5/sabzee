import type { Resume, Settings } from './types'

export const sampleResume: Resume = {
  basics: {
    name: 'Aarav Mehta',
    title: 'Full-Stack Developer',
    email: 'aarav.mehta@example.com',
    phone: '+91 98765 43210',
    location: 'Bengaluru, India',
    website: 'aarav.dev',
    linkedin: 'linkedin.com/in/aaravmehta',
    github: 'github.com/aaravmehta',
    summary:
      'Full-stack developer with 2+ years of experience building fast, accessible web apps with React, Next.js and Node.js. Shipped features used by 200k+ users, cut page load time by 45% and love turning messy requirements into clean, well-tested products.',
  },
  experience: [
    {
      id: 'e1',
      role: 'Software Engineer',
      company: 'Finlytics Technologies',
      location: 'Bengaluru',
      start: 'Jul 2024',
      end: '',
      current: true,
      bullets:
        'Built a real-time portfolio dashboard in Next.js and WebSockets used by 200k+ monthly users\nReduced Largest Contentful Paint by 45% through code-splitting, image optimisation and edge caching\nDesigned a typed REST + tRPC API layer in Node.js/PostgreSQL, cutting API bugs by 30%\nMentored 3 interns and introduced PR review guidelines and Playwright end-to-end tests',
    },
    {
      id: 'e2',
      role: 'Frontend Developer Intern',
      company: 'Kirana Cloud',
      location: 'Remote',
      start: 'Jan 2024',
      end: 'Jun 2024',
      current: false,
      bullets:
        'Developed 15+ reusable React components for the merchant storefront design system\nImplemented offline-first order capture with IndexedDB, increasing order completion by 18%\nAutomated deployments with GitHub Actions and Vercel preview environments',
    },
  ],
  projects: [
    {
      id: 'p1',
      name: 'Sabzee — Grocery Storefront',
      link: 'sabzee.vercel.app',
      tech: 'Next.js, TypeScript, Tailwind CSS, Zustand',
      description: 'Quick-commerce storefront with filters, persistent cart, coupon engine, checkout validation and an order tracker.',
    },
    {
      id: 'p2',
      name: 'TaskFlow — Kanban Board',
      link: 'github.com/aaravmehta/taskflow',
      tech: 'React, dnd-kit, Zustand',
      description: 'Trello-style board with accessible drag & drop, labels, checklists, due-date alerts and analytics.',
    },
  ],
  education: [
    { id: 'ed1', degree: 'B.Tech, Computer Science & Engineering', school: 'RV College of Engineering', start: '2020', end: '2024', score: 'CGPA 8.7 / 10' },
    { id: 'ed2', degree: 'Class XII (CBSE), PCM', school: 'Delhi Public School', start: '2019', end: '2020', score: '93.4%' },
  ],
  skills: [
    { id: 's1', group: 'Languages', items: 'TypeScript, JavaScript, Python, Java, SQL' },
    { id: 's2', group: 'Frontend', items: 'React, Next.js, Tailwind CSS, Redux, Zustand, HTML, CSS' },
    { id: 's3', group: 'Backend', items: 'Node.js, Express, PostgreSQL, MongoDB, REST, tRPC' },
    { id: 's4', group: 'Tools', items: 'Git, Docker, GitHub Actions, Vercel, Playwright, Jest' },
  ],
  certifications: [
    { id: 'c1', name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', year: '2025' },
    { id: 'c2', name: 'Meta Front-End Developer', issuer: 'Coursera', year: '2024' },
  ],
}

export const emptyResume: Resume = {
  basics: { name: '', title: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '', summary: '' },
  experience: [],
  education: [],
  projects: [],
  skills: [],
  certifications: [],
}

export const defaultSettings: Settings = {
  template: 'modern',
  accent: '#4f46e5',
  order: ['summary', 'experience', 'projects', 'skills', 'education', 'certifications'],
  hidden: [],
}

export const accents = ['#4f46e5', '#0f766e', '#be123c', '#1d4ed8', '#7c3aed', '#c2410c', '#0f172a']
