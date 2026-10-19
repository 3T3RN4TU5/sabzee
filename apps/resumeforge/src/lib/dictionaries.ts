/** Static word lists used by the analysers. Pure data, no dependencies. */

export const STOPWORDS = new Set(
  `a about above across after afterwards again against all almost alone along already also although always am among amongst an and another any anyhow anyone anything anyway anywhere are around as at back be became because become becomes becoming been before beforehand behind being below beside besides between beyond both but by can cannot could did do does doing done down due during each eg e.g either else elsewhere enough etc even ever every everyone everything everywhere except few for former formerly from further get gets getting give given go had has have having he hence her here hereafter hereby herein hereupon hers herself him himself his how however i ie i.e if in indeed into is it its itself just keep last latter latterly least less let like likely made make many may me meanwhile might mine more moreover most mostly much must my myself namely neither never nevertheless next no nobody none noone nor not nothing now nowhere of off often on once one only onto or other others otherwise our ours ourselves out over own per perhaps please put quite rather re really regarding same say see seem seemed seeming seems several she should show side since so some somehow someone something sometime sometimes somewhere still such take than that the their them themselves then thence there thereafter thereby therefore therein thereupon these they this those though through throughout thru thus to together too toward towards under until up upon us very via was we well were what whatever when whence whenever where whereafter whereas whereby wherein whereupon wherever whether which while whither who whoever whole whom whose why will with within without would yet you your yours yourself yourselves
  ability able ideal ideally candidate candidates role roles position positions job jobs opportunity opportunities company companies team teams teammates member members looking seeking join joining work working works worked experience experiences experienced year years yr yrs month months strong stronger excellent good great solid proven demonstrated demonstrable track record plus bonus nice preferred preferably required requirement requirements require requires qualification qualifications qualified minimum least responsibilities responsibility responsible duties include includes including etc skill skills knowledge understanding familiarity familiar exposure proficiency proficient hands-on using use used new day days help helping ensure ensuring based within across also well-versed related relevant field equivalent degree environment environments level levels high highly drive driven passion passionate love world class best key core various multiple across successful success apply applicants applicant benefits salary competitive culture inclusive diverse equal employer offer offers perks remote hybrid onsite office location full-time part-time full time part time contract permanent we're you'll you're we'll they'll it's let's what's that's hiring hire hires`
    .split(/\s+/)
    .filter(Boolean),
)

export type TermCategory =
  | 'language'
  | 'frontend'
  | 'backend'
  | 'database'
  | 'cloud'
  | 'devops'
  | 'testing'
  | 'mobile'
  | 'data'
  | 'ml'
  | 'design'
  | 'tool'
  | 'security'
  | 'methodology'
  | 'soft'
  | 'business'
  | 'certification'

export interface Term {
  name: string
  category: TermCategory
  aliases: string[]
}

const t = (name: string, category: TermCategory, ...aliases: string[]): Term => ({ name, category, aliases })

/** Canonical terms. Aliases are lowercase and may be multi-word (max 3 tokens). */
export const TERMS: Term[] = [
  // languages
  t('JavaScript', 'language', 'javascript', 'js', 'es6', 'ecmascript'),
  t('TypeScript', 'language', 'typescript', 'ts'),
  t('Python', 'language', 'python', 'python3'),
  t('Java', 'language', 'java'),
  t('Kotlin', 'language', 'kotlin'),
  t('Swift', 'language', 'swift'),
  t('Go', 'language', 'golang', 'go'),
  t('Rust', 'language', 'rust'),
  t('C++', 'language', 'c++', 'cpp'),
  t('C#', 'language', 'c#', 'csharp'),
  t('C', 'language', 'c'),
  t('Ruby', 'language', 'ruby'),
  t('PHP', 'language', 'php'),
  t('Scala', 'language', 'scala'),
  t('R', 'language', 'r'),
  t('SQL', 'language', 'sql'),
  t('Bash', 'language', 'bash', 'shell scripting', 'shell'),
  t('HTML', 'frontend', 'html', 'html5'),
  t('CSS', 'frontend', 'css', 'css3'),
  t('Dart', 'language', 'dart'),
  // frontend
  t('React', 'frontend', 'react', 'react.js', 'reactjs'),
  t('Next.js', 'frontend', 'next.js', 'nextjs'),
  t('Vue.js', 'frontend', 'vue', 'vue.js', 'vuejs'),
  t('Angular', 'frontend', 'angular', 'angularjs'),
  t('Svelte', 'frontend', 'svelte', 'sveltekit'),
  t('Redux', 'frontend', 'redux', 'redux toolkit'),
  t('Zustand', 'frontend', 'zustand'),
  t('Tailwind CSS', 'frontend', 'tailwind', 'tailwind css', 'tailwindcss'),
  t('Sass', 'frontend', 'sass', 'scss'),
  t('Webpack', 'frontend', 'webpack'),
  t('Vite', 'frontend', 'vite'),
  t('jQuery', 'frontend', 'jquery'),
  t('Accessibility', 'frontend', 'accessibility', 'a11y', 'wcag'),
  t('Responsive design', 'frontend', 'responsive design', 'responsive'),
  t('Web performance', 'frontend', 'web performance', 'core web vitals', 'performance optimization'),
  t('Frontend', 'frontend', 'frontend', 'front-end', 'front end'),
  // backend
  t('Node.js', 'backend', 'node.js', 'nodejs', 'node'),
  t('Express', 'backend', 'express', 'express.js', 'expressjs'),
  t('NestJS', 'backend', 'nestjs', 'nest.js'),
  t('Django', 'backend', 'django'),
  t('Flask', 'backend', 'flask'),
  t('FastAPI', 'backend', 'fastapi'),
  t('Spring Boot', 'backend', 'spring boot', 'spring'),
  t('Ruby on Rails', 'backend', 'rails', 'ruby on rails'),
  t('.NET', 'backend', '.net', 'dotnet', 'asp.net'),
  t('GraphQL', 'backend', 'graphql'),
  t('REST APIs', 'backend', 'rest', 'restful', 'rest api', 'rest apis', 'restful apis', 'apis', 'api'),
  t('gRPC', 'backend', 'grpc'),
  t('tRPC', 'backend', 'trpc'),
  t('Microservices', 'backend', 'microservices', 'microservice', 'micro-services'),
  t('Distributed systems', 'backend', 'distributed systems', 'distributed system'),
  t('Kafka', 'backend', 'kafka', 'apache kafka'),
  t('RabbitMQ', 'backend', 'rabbitmq'),
  t('WebSockets', 'backend', 'websockets', 'websocket', 'socket.io'),
  t('Backend', 'backend', 'backend', 'back-end', 'back end'),
  t('Full-stack', 'backend', 'full-stack', 'full stack', 'fullstack'),
  // databases
  t('PostgreSQL', 'database', 'postgresql', 'postgres', 'psql'),
  t('MySQL', 'database', 'mysql'),
  t('MongoDB', 'database', 'mongodb', 'mongo'),
  t('Redis', 'database', 'redis'),
  t('DynamoDB', 'database', 'dynamodb'),
  t('Elasticsearch', 'database', 'elasticsearch', 'elastic search', 'opensearch'),
  t('SQLite', 'database', 'sqlite'),
  t('Cassandra', 'database', 'cassandra'),
  t('Snowflake', 'data', 'snowflake'),
  t('BigQuery', 'data', 'bigquery', 'big query'),
  t('Supabase', 'database', 'supabase'),
  t('Firebase', 'database', 'firebase', 'firestore'),
  t('Prisma', 'database', 'prisma'),
  // cloud & devops
  t('AWS', 'cloud', 'aws', 'amazon web services'),
  t('Azure', 'cloud', 'azure', 'microsoft azure'),
  t('GCP', 'cloud', 'gcp', 'google cloud', 'google cloud platform'),
  t('Lambda', 'cloud', 'lambda', 'aws lambda', 'serverless'),
  t('Vercel', 'cloud', 'vercel'),
  t('Docker', 'devops', 'docker', 'containers', 'containerization'),
  t('Kubernetes', 'devops', 'kubernetes', 'k8s', 'eks', 'gke'),
  t('Terraform', 'devops', 'terraform', 'infrastructure as code', 'iac'),
  t('CI/CD', 'devops', 'ci/cd', 'cicd', 'continuous integration', 'continuous delivery', 'continuous deployment'),
  t('GitHub Actions', 'devops', 'github actions'),
  t('Jenkins', 'devops', 'jenkins'),
  t('Linux', 'devops', 'linux', 'unix'),
  t('Observability', 'devops', 'observability', 'monitoring', 'prometheus', 'grafana', 'datadog'),
  t('Git', 'tool', 'git', 'github', 'gitlab', 'version control'),
  // testing
  t('Unit testing', 'testing', 'unit testing', 'unit tests', 'jest', 'vitest', 'pytest', 'junit'),
  t('End-to-end testing', 'testing', 'e2e', 'end-to-end', 'playwright', 'cypress', 'selenium'),
  t('Test-driven development', 'methodology', 'tdd', 'test-driven development', 'test driven development'),
  // mobile
  t('React Native', 'mobile', 'react native'),
  t('Flutter', 'mobile', 'flutter'),
  t('iOS', 'mobile', 'ios'),
  t('Android', 'mobile', 'android'),
  // data & ML
  t('Machine learning', 'ml', 'machine learning', 'ml'),
  t('Deep learning', 'ml', 'deep learning'),
  t('NLP', 'ml', 'nlp', 'natural language processing'),
  t('Computer vision', 'ml', 'computer vision', 'opencv'),
  t('LLMs', 'ml', 'llm', 'llms', 'large language models', 'generative ai', 'genai'),
  t('PyTorch', 'ml', 'pytorch'),
  t('TensorFlow', 'ml', 'tensorflow', 'keras'),
  t('scikit-learn', 'ml', 'scikit-learn', 'sklearn', 'scikit learn'),
  t('MLOps', 'ml', 'mlops', 'mlflow', 'model deployment'),
  t('pandas', 'data', 'pandas'),
  t('NumPy', 'data', 'numpy'),
  t('Spark', 'data', 'spark', 'pyspark', 'apache spark'),
  t('Airflow', 'data', 'airflow', 'apache airflow'),
  t('dbt', 'data', 'dbt'),
  t('ETL', 'data', 'etl', 'elt', 'data pipelines', 'data pipeline'),
  t('Data analysis', 'data', 'data analysis', 'analytics', 'data analytics'),
  t('Data visualization', 'data', 'data visualization', 'tableau', 'power bi', 'looker', 'dashboards'),
  t('Statistics', 'data', 'statistics', 'statistical', 'a/b testing', 'experimentation', 'hypothesis testing'),
  t('Excel', 'tool', 'excel', 'spreadsheets', 'google sheets'),
  // design & tools
  t('Figma', 'design', 'figma'),
  t('UI/UX', 'design', 'ui/ux', 'ux', 'ui', 'user experience', 'user interface'),
  t('Design systems', 'design', 'design system', 'design systems', 'component library'),
  t('Jira', 'tool', 'jira', 'confluence'),
  // security
  t('Security', 'security', 'security', 'owasp', 'application security'),
  t('OAuth', 'security', 'oauth', 'oauth2', 'oidc', 'sso', 'authentication'),
  // methodology
  t('Agile', 'methodology', 'agile', 'scrum', 'kanban', 'sprint', 'sprints'),
  t('Code review', 'methodology', 'code review', 'code reviews'),
  t('System design', 'methodology', 'system design', 'architecture', 'software architecture'),
  t('Object-oriented programming', 'methodology', 'oop', 'object-oriented', 'object oriented'),
  t('Data structures & algorithms', 'methodology', 'data structures', 'algorithms', 'dsa'),
  t('Scalability', 'methodology', 'scalability', 'scalable', 'high availability', 'reliability'),
  t('Debugging', 'methodology', 'debugging', 'troubleshooting'),
  t('Documentation', 'methodology', 'documentation', 'technical writing'),
  // soft skills
  t('Leadership', 'soft', 'leadership', 'led', 'lead'),
  t('Mentoring', 'soft', 'mentoring', 'mentorship', 'mentor', 'mentored', 'coaching'),
  t('Communication', 'soft', 'communication', 'communicator', 'written and verbal'),
  t('Collaboration', 'soft', 'collaboration', 'collaborative', 'collaborate', 'teamwork'),
  t('Cross-functional', 'soft', 'cross-functional', 'cross functional'),
  t('Stakeholder management', 'soft', 'stakeholder management', 'stakeholders', 'stakeholder'),
  t('Problem solving', 'soft', 'problem solving', 'problem-solving'),
  t('Ownership', 'soft', 'ownership', 'end-to-end ownership'),
  t('Project management', 'soft', 'project management', 'program management'),
  t('Product management', 'business', 'product management', 'roadmap', 'roadmaps', 'product strategy'),
  // business domains
  t('SaaS', 'business', 'saas', 'b2b', 'b2c'),
  t('E-commerce', 'business', 'e-commerce', 'ecommerce'),
  t('Fintech', 'business', 'fintech', 'payments', 'banking'),
  t('Startup', 'business', 'startup', 'start-up'),
  t('SEO', 'business', 'seo', 'search engine optimization'),
  // certifications
  t('AWS certification', 'certification', 'aws certified', 'aws certification'),
  t('PMP', 'certification', 'pmp'),
  t('Scrum Master', 'certification', 'csm', 'scrum master', 'certified scrum master'),
]

/** Ambiguous aliases (common words or single letters) only count when the source token has a capital letter. */
export const AMBIGUOUS_ALIASES = new Set(['c', 'r', 'go', 'ts', 'ui', 'ux', 'api', 'apis', 'ml', 'node', 'rest', 'swift', 'dart', 'rust', 'spring', 'express', 'shell', 'next', 'sprint', 'lambda', 'spark', 'flask', 'ruby', 'scala'])

/** Strong action verbs grouped by what they communicate. Base forms. */
export const ACTION_VERBS: Record<string, string[]> = {
  Leadership: ['lead', 'direct', 'spearhead', 'orchestrate', 'champion', 'mentor', 'coach', 'supervise', 'head', 'mobilize', 'unite', 'inspire'],
  Building: ['build', 'develop', 'engineer', 'architect', 'design', 'implement', 'program', 'automate', 'deploy', 'integrate', 'ship', 'prototype', 'launch'],
  Improvement: ['optimize', 'streamline', 'reduce', 'accelerate', 'improve', 'enhance', 'refactor', 'modernize', 'overhaul', 'simplify', 'consolidate', 'upgrade'],
  Impact: ['achieve', 'deliver', 'exceed', 'surpass', 'earn', 'win', 'secure', 'boost', 'double', 'triple', 'save', 'outperform'],
  Analysis: ['analyze', 'evaluate', 'investigate', 'forecast', 'model', 'measure', 'quantify', 'research', 'assess', 'identify', 'diagnose', 'audit'],
  Collaboration: ['partner', 'collaborate', 'negotiate', 'present', 'persuade', 'author', 'document', 'facilitate', 'advocate', 'align', 'influence', 'publish'],
  Management: ['manage', 'coordinate', 'plan', 'prioritize', 'organize', 'execute', 'oversee', 'administer', 'budget', 'schedule', 'own', 'establish'],
  Growth: ['grow', 'expand', 'generate', 'increase', 'acquire', 'scale', 'monetize', 'convert', 'capture', 'retain', 'drive', 'cut'],
  Creative: ['create', 'conceptualize', 'craft', 'pioneer', 'invent', 'redesign', 'revamp', 'produce', 'shape', 'define', 'introduce', 'write'],
  Support: ['resolve', 'train', 'onboard', 'guide', 'troubleshoot', 'restore', 'safeguard', 'educate', 'maintain', 'standardize', 'validate', 'teach'],
}

const IRREGULAR_PAST: Record<string, string> = {
  build: 'built',
  lead: 'led',
  drive: 'drove',
  grow: 'grew',
  write: 'wrote',
  win: 'won',
  cut: 'cut',
  teach: 'taught',
  oversee: 'oversaw',
  set: 'set',
  run: 'ran',
  make: 'made',
  hold: 'held',
  rebuild: 'rebuilt',
  sell: 'sold',
  speak: 'spoke',
  take: 'took',
  give: 'gave',
  begin: 'began',
  bring: 'brought',
  think: 'thought',
  undertake: 'undertook',
  ship: 'shipped',
  plan: 'planned',
  program: 'programmed',
  map: 'mapped',
  commit: 'committed',
  control: 'controlled',
  submit: 'submitted',
  double: 'doubled',
  find: 'found',
  understand: 'understood',
  overcome: 'overcame',
}

const EXTRA_VERBS = [
  'accelerate', 'administer', 'advise', 'allocate', 'analyse', 'compile', 'configure', 'contribute', 'convert', 'customize', 'debug', 'decrease', 'deliver', 'devise', 'draft', 'edit', 'eliminate', 'enable', 'expedite', 'formulate', 'found', 'hire', 'initiate', 'innovate', 'institute', 'interview', 'introduce', 'launch', 'maximize', 'migrate', 'minimize', 'moderate', 'monitor', 'motivate', 'navigate', 'operate', 'optimise', 'organise', 'pilot', 'prepare', 'process', 'publish', 'rebuild', 'recruit', 'redefine', 'reengineer', 'reorganize', 'restructure', 'revitalize', 'review', 'solve', 'sponsor', 'strengthen', 'structure', 'synthesize', 'test', 'track', 'transform', 'translate', 'uncover', 'unify', 'visualize', 'mentor', 'host', 'curate', 'study', 'teach', 'serve', 'run', 'hold', 'speak', 'sell', 'support', 'help', 'assist', 'handle', 'work', 'use', 'participate', 'involve', 'make', 'do', 'try', 'get', 'utilize',
]

export function pastTense(base: string): string {
  const b = base.toLowerCase()
  if (IRREGULAR_PAST[b]) return IRREGULAR_PAST[b]
  if (b.endsWith('e')) return `${b}d`
  if (/[^aeiou]y$/.test(b)) return `${b.slice(0, -1)}ied`
  return `${b}ed`
}

export function thirdPerson(base: string): string {
  const b = base.toLowerCase()
  if (/(s|sh|ch|x|z|o)$/.test(b)) return `${b}es`
  if (/[^aeiou]y$/.test(b)) return `${b.slice(0, -1)}ies`
  return `${b}s`
}

const ALL_BASES = [...new Set([...Object.values(ACTION_VERBS).flat(), ...EXTRA_VERBS])]

/** word → { base, tense } for every verb form we know. */
export const VERB_FORMS: Map<string, { base: string; tense: 'past' | 'present' }> = (() => {
  const m = new Map<string, { base: string; tense: 'past' | 'present' }>()
  for (const base of ALL_BASES) {
    m.set(base, { base, tense: 'present' })
    m.set(thirdPerson(base), { base, tense: 'present' })
  }
  for (const base of ALL_BASES) m.set(pastTense(base), { base, tense: 'past' })
  return m
})()

export const STRONG_VERBS = new Set(Object.values(ACTION_VERBS).flat())

export interface WeakPhrase {
  pattern: RegExp
  phrase: string
  suggestions: string[]
}

/** Weak openers, matched at the start of a bullet. */
export const WEAK_PHRASES: WeakPhrase[] = [
  { pattern: /^(was |am |is )?responsible for\b/i, phrase: 'Responsible for', suggestions: ['Led', 'Owned', 'Managed'] },
  { pattern: /^(was |am )?in charge of\b/i, phrase: 'In charge of', suggestions: ['Led', 'Directed', 'Headed'] },
  { pattern: /^worked (on|with|in)\b/i, phrase: 'Worked on', suggestions: ['Built', 'Developed', 'Delivered'] },
  { pattern: /^helped( to| with)?\b/i, phrase: 'Helped', suggestions: ['Enabled', 'Accelerated', 'Partnered with'] },
  { pattern: /^assisted( with| in)?\b/i, phrase: 'Assisted', suggestions: ['Supported', 'Coordinated', 'Partnered on'] },
  { pattern: /^(participated|took part) in\b/i, phrase: 'Participated in', suggestions: ['Contributed to', 'Collaborated on', 'Drove'] },
  { pattern: /^(was )?involved in\b/i, phrase: 'Involved in', suggestions: ['Contributed to', 'Drove', 'Shaped'] },
  { pattern: /^(was )?tasked with\b/i, phrase: 'Tasked with', suggestions: ['Owned', 'Led', 'Delivered'] },
  { pattern: /^duties included\b/i, phrase: 'Duties included', suggestions: ['Rewrite as an achievement: Built…, Reduced…, Led…'] },
  { pattern: /^handled\b/i, phrase: 'Handled', suggestions: ['Managed', 'Resolved', 'Processed'] },
  { pattern: /^dealt with\b/i, phrase: 'Dealt with', suggestions: ['Resolved', 'Managed', 'Negotiated'] },
  { pattern: /^(did|done)\b/i, phrase: 'Did', suggestions: ['Executed', 'Delivered', 'Completed'] },
  { pattern: /^made\b/i, phrase: 'Made', suggestions: ['Created', 'Built', 'Produced'] },
  { pattern: /^used\b/i, phrase: 'Used', suggestions: ['Applied', 'Implemented', 'Adopted'] },
  { pattern: /^utili[sz]ed\b/i, phrase: 'Utilized', suggestions: ['Applied', 'Implemented', 'Deployed'] },
  { pattern: /^tried\b/i, phrase: 'Tried', suggestions: ['Tested', 'Piloted', 'Prototyped'] },
  { pattern: /^got\b/i, phrase: 'Got', suggestions: ['Earned', 'Secured', 'Achieved'] },
  { pattern: /^looked after\b/i, phrase: 'Looked after', suggestions: ['Managed', 'Maintained', 'Oversaw'] },
  { pattern: /^(was )?part of\b/i, phrase: 'Part of', suggestions: ['Contributed to', 'Collaborated on', 'Delivered'] },
]

export const BUZZWORDS: string[] = [
  'team player',
  'hard worker',
  'hard-working',
  'hardworking',
  'go-getter',
  'detail-oriented',
  'detail oriented',
  'results-driven',
  'results driven',
  'results-oriented',
  'self-starter',
  'self starter',
  'think outside the box',
  'out of the box',
  'synergy',
  'synergize',
  'rockstar',
  'rock star',
  'ninja',
  'guru',
  'go-to person',
  'best of breed',
  'proven track record',
  'highly motivated',
  'strategic thinker',
  'thought leader',
  'value add',
  'value-add',
  'move the needle',
  'game changer',
  'game-changer',
  'world-class',
  'cutting-edge',
  'bleeding-edge',
  'goal-oriented',
  'strong work ethic',
  'works well under pressure',
  'multitasker',
  'multi-tasker',
  'hit the ground running',
  'wear many hats',
  'dynamic individual',
  'excellent communication skills',
  'passionate about',
  'responsible individual',
  'quick learner',
  'fast learner',
]

/** Wrong spelling/casing → correct form. Keys are matched case-sensitively as whole tokens. */
export const SPELLING: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  const add = (right: string, ...wrong: string[]) => wrong.forEach((w) => (m[w] = right))
  add('JavaScript', 'Javascript', 'javascript', 'JAVASCRIPT', 'Javscript', 'javscript', 'JavaScipt')
  add('TypeScript', 'Typescript', 'typescript', 'Typescipt', 'TypeScipt')
  add('GitHub', 'Github', 'github', 'GITHUB')
  add('GitLab', 'Gitlab', 'gitlab')
  add('Node.js', 'Nodejs', 'nodejs', 'NodeJS', 'NodeJs', 'Node.JS', 'node.js', 'NODEJS')
  add('React', 'Reactjs', 'reactjs', 'ReactJs', 'ReactJS', 'React.JS')
  add('Next.js', 'Nextjs', 'nextjs', 'NextJS', 'NextJs', 'Next.JS')
  add('Vue.js', 'Vuejs', 'vuejs', 'VueJS', 'VueJs')
  add('MongoDB', 'Mongodb', 'mongodb', 'MongoDb', 'mongoDB')
  add('PostgreSQL', 'Postgresql', 'postgresql', 'PostgreSql', 'postgreSQL', 'PostGreSQL')
  add('MySQL', 'Mysql', 'mysql', 'MySql', 'mySQL')
  add('GraphQL', 'Graphql', 'graphql', 'GraphQl', 'graphQL')
  add('jQuery', 'Jquery', 'jquery', 'JQuery', 'JQUERY')
  add('LinkedIn', 'Linkedin', 'linkedin', 'LINKEDIN', 'Linked-in')
  add('DevOps', 'Devops', 'devops', 'DevOPS', 'DEVOPS')
  add('RESTful', 'Restful', 'restful', 'RESTFul')
  add('HTML', 'Html', 'html')
  add('CSS', 'Css', 'css')
  add('SQL', 'Sql')
  add('AWS', 'Aws')
  add('GCP', 'Gcp')
  add('JSON', 'Json', 'json')
  add('iOS', 'Ios', 'IOS', 'ios')
  add('macOS', 'MacOS', 'macos', 'MacOs', 'Macos', 'MACOS')
  add('Kubernetes', 'Kubernates', 'kubernates', 'Kubernetees', 'kubernetes')
  add('PyTorch', 'Pytorch', 'pytorch', 'PyTorh')
  add('TensorFlow', 'Tensorflow', 'tensorflow', 'TensorFLow')
  add('NumPy', 'Numpy', 'numpy')
  add('FastAPI', 'Fastapi', 'fastapi', 'FastApi')
  add('WordPress', 'Wordpress', 'wordpress')
  add('YouTube', 'Youtube', 'youtube')
  add('PowerPoint', 'Powerpoint', 'powerpoint')
  add('SaaS', 'Saas', 'SAAS', 'saas')
  add('CI/CD', 'Ci/Cd', 'ci/cd', 'CI/cd', 'ci/CD')
  add('Python', 'Pyhton', 'pyhton', 'Phyton')
  add('VS Code', 'Vscode', 'vscode', 'VSCode', 'VScode')
  add('Tailwind CSS', 'Tailwindcss', 'TailwindCSS')
  add('npm', 'NPM', 'Npm')
  add('Docker', 'Dokcer')
  // common English misspellings
  const plain: [string, string][] = [
    ['achieve', 'acheive'], ['achieved', 'acheived'], ['receive', 'recieve'], ['received', 'recieved'], ['management', 'managment'], ['management', 'mangement'],
    ['development', 'developement'], ['environment', 'enviroment'], ['responsibility', 'responsibilty'], ['successful', 'sucessful'], ['successful', 'succesful'],
    ['successfully', 'sucessfully'], ['successfully', 'succesfully'], ['separate', 'seperate'], ['occurred', 'occured'], ['performance', 'perfomance'],
    ['experience', 'experiance'], ['knowledge', 'knowlege'], ['beginning', 'begining'], ['committee', 'comittee'], ['definitely', 'definately'],
    ['accommodate', 'accomodate'], ['business', 'buisness'], ['calendar', 'calender'], ['existence', 'existance'], ['independent', 'independant'],
    ['liaison', 'liason'], ['maintenance', 'maintainance'], ['maintenance', 'maintenence'], ['occasion', 'occassion'], ['privilege', 'priviledge'],
    ['recommend', 'recomend'], ['recommend', 'reccomend'], ['the', 'teh'], ['which', 'wich'], ['until', 'untill'], ['address', 'adress'],
    ['colleague', 'collegue'], ['efficiency', 'efficency'], ['government', 'goverment'], ['implemented', 'implimented'], ['implement', 'impliment'],
    ['information', 'infomation'], ['strategy', 'stratergy'], ['technical', 'techinal'], ['technology', 'tecnology'], ['technology', 'technolgy'],
    ['committed', 'commited'], ['consensus', 'concensus'], ['guarantee', 'gaurantee'], ['immediately', 'immediatly'], ['necessary', 'neccessary'],
    ['necessary', 'necesary'], ['noticeable', 'noticable'], ['pursue', 'persue'], ['preferred', 'prefered'], ['publicly', 'publically'],
    ['referred', 'reffered'], ['relevant', 'relevent'], ['responsible', 'resposible'], ['responsible', 'reponsible'], ['truly', 'truely'],
    ['writing', 'writting'], ['amount', 'ammount'], ['completely', 'completly'], ['forward', 'foward'], ['grammar', 'grammer'], ['length', 'lenght'],
    ['opportunity', 'oppurtunity'], ['opportunities', 'opportunites'], ['parallel', 'paralel'], ['success', 'sucess'], ['scalability', 'scalibility'],
    ['scalable', 'scaleable'], ['available', 'availible'], ['available', 'avaliable'], ['across', 'accross'], ['acquire', 'aquire'], ['believe', 'beleive'],
    ['budget', 'buget'], ['category', 'catagory'], ['collaborate', 'collaberate'], ['collaborate', 'colaborate'], ['communication', 'comunication'],
    ['consistent', 'consistant'], ['customer', 'custmer'], ['database', 'databse'], ['delivered', 'delivred'], ['developed', 'devloped'],
    ['developed', 'developped'], ['engineer', 'engeneer'], ['engineer', 'enginer'], ['improvement', 'improvment'], ['integration', 'intergration'],
    ['language', 'langauge'], ['leadership', 'leadeship'], ['optimized', 'optimzed'], ['professional', 'proffesional'], ['professional', 'profesional'],
    ['research', 'reasearch'], ['software', 'sofware'], ['software', 'softwear'], ['stakeholder', 'stakholder'], ['system', 'sytem'], ['systems', 'sytems'],
    ['their', 'thier'], ['updated', 'udpated'], ['analyze', 'analize'], ['conscious', 'concious'], ['interrupt', 'interupt'], ['tomorrow', 'tommorow'],
  ]
  for (const [right, wrong] of plain) {
    m[wrong] = right
    m[wrong[0].toUpperCase() + wrong.slice(1)] = right[0].toUpperCase() + right.slice(1)
  }
  return m
})()

/** Passive constructions: auxiliary + past participle. */
export const PASSIVE_RE =
  /\b(am|is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?(\w+ed|built|done|made|led|written|given|taken|shown|seen|driven|run|grown|known|held|kept|sent|spent|won|brought|taught|thought|found|lost|paid|sold|told|understood|begun|broken|drawn|thrown|overseen|undertaken)\b/i

/** Passive-looking phrases that are fine (achievements or adjectives). */
export const PASSIVE_ALLOW = new Set([
  'promoted', 'awarded', 'selected', 'recognized', 'recognised', 'nominated', 'invited', 'elected', 'chosen', 'hired', 'based', 'located', 'interested',
  'excited', 'focused', 'skilled', 'experienced', 'dedicated', 'motivated', 'qualified', 'certified', 'detailed', 'involved', 'responsible', 'pleased',
  'honored', 'honoured', 'featured', 'published', 'accepted', 'ranked', 'shortlisted', 'granted', 'funded',
])

export const PRONOUN_RE = /\b(I|me|my|mine|myself)\b/
