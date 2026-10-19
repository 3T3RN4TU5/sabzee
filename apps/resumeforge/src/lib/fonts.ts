import type { FontId } from './types.ts'

export interface FontPairing {
  id: FontId
  label: string
  heading: string
  body: string
  mono: string
  /** Google Fonts css2 `family=` query (null for system fonts). */
  google: string | null
  /** Word-safe fallback used for DOCX export. */
  docx: string
  category: 'Sans' | 'Serif' | 'System'
}

const MONO = "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace"

export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: 'inter',
    label: 'Inter',
    heading: "'Inter', ui-sans-serif, system-ui, sans-serif",
    body: "'Inter', ui-sans-serif, system-ui, sans-serif",
    mono: MONO,
    google: 'family=Inter:wght@300;400;500;600;700;800',
    docx: 'Calibri',
    category: 'Sans',
  },
  {
    id: 'merriweather',
    label: 'Merriweather',
    heading: "'Merriweather', Georgia, serif",
    body: "'Merriweather', Georgia, serif",
    mono: MONO,
    google: 'family=Merriweather:ital,wght@0,300;0,400;0,700;1,400',
    docx: 'Georgia',
    category: 'Serif',
  },
  {
    id: 'playfair',
    label: 'Playfair & Source Sans',
    heading: "'Playfair Display', Georgia, serif",
    body: "'Source Sans 3', ui-sans-serif, system-ui, sans-serif",
    mono: MONO,
    google: 'family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400',
    docx: 'Georgia',
    category: 'Serif',
  },
  {
    id: 'garamond',
    label: 'EB Garamond',
    heading: "'EB Garamond', Garamond, Georgia, serif",
    body: "'EB Garamond', Garamond, Georgia, serif",
    mono: MONO,
    google: 'family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400',
    docx: 'Garamond',
    category: 'Serif',
  },
  {
    id: 'poppins',
    label: 'Poppins & Inter',
    heading: "'Poppins', ui-sans-serif, system-ui, sans-serif",
    body: "'Inter', ui-sans-serif, system-ui, sans-serif",
    mono: MONO,
    google: 'family=Poppins:wght@500;600;700;800&family=Inter:wght@400;500;600;700',
    docx: 'Calibri',
    category: 'Sans',
  },
  {
    id: 'plex',
    label: 'IBM Plex',
    heading: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
    body: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
    mono: MONO,
    google: 'family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600',
    docx: 'Arial',
    category: 'Sans',
  },
  {
    id: 'montserrat',
    label: 'Montserrat & Open Sans',
    heading: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
    body: "'Open Sans', ui-sans-serif, system-ui, sans-serif",
    mono: MONO,
    google: 'family=Montserrat:wght@500;600;700;800&family=Open+Sans:ital,wght@0,400;0,600;0,700;1,400',
    docx: 'Arial',
    category: 'Sans',
  },
  {
    id: 'raleway',
    label: 'Raleway & Lato',
    heading: "'Raleway', ui-sans-serif, system-ui, sans-serif",
    body: "'Lato', ui-sans-serif, system-ui, sans-serif",
    mono: MONO,
    google: 'family=Raleway:wght@300;400;600;700;800&family=Lato:ital,wght@0,300;0,400;0,700;1,400',
    docx: 'Calibri',
    category: 'Sans',
  },
  {
    id: 'system',
    label: 'Arial (system)',
    heading: 'Arial, Helvetica, sans-serif',
    body: 'Arial, Helvetica, sans-serif',
    mono: "ui-monospace, 'Courier New', monospace",
    google: null,
    docx: 'Arial',
    category: 'System',
  },
  {
    id: 'georgia',
    label: 'Georgia (system)',
    heading: "Georgia, 'Times New Roman', serif",
    body: "Georgia, 'Times New Roman', serif",
    mono: "ui-monospace, 'Courier New', monospace",
    google: null,
    docx: 'Georgia',
    category: 'System',
  },
]

export const FONT_BY_ID = Object.fromEntries(FONT_PAIRINGS.map((f) => [f.id, f])) as Record<FontId, FontPairing>

export function googleFontsUrl(id: FontId): string | null {
  const f = FONT_BY_ID[id]
  return f?.google ? `https://fonts.googleapis.com/css2?${f.google}&display=swap` : null
}
