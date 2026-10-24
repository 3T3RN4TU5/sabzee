/**
 * Shared template toolkit — import everything from '../shared' inside a template folder.
 * - This file is index.ts, not index.tsx, so the registry glob './*\/index.tsx' never mistakes it for a template.
 * - It deliberately does NOT export PagedDocument / TemplateThumbnail (they import the registry, which
 *   imports every template — a cycle). App code imports those from 'src/templates' (../index.ts).
 */
export { PageLayout } from './PageLayout.tsx'
export { useDocContext, useOptionalDocContext, DocContext, type DocContextValue } from './context.ts'
export { docCssVars, DEFAULT_GAPS } from './cssVars.ts'
export { ensureFont, useFont, fontsReady } from './fonts.ts'
export { Rich, RichParagraphs, type RichProps, type RichParagraphsProps } from './Rich.tsx'
export { ContactList, ContactText, type ContactListProps } from './Contact.tsx'
export { ContactIcon, GithubIcon, LinkedinIcon } from './icons.tsx'
export { Photo, type PhotoProps } from './Photo.tsx'
export { LevelBar, LevelDots, LevelSegments, type LevelProps } from './Level.tsx'
export { Bullets, DefaultEntry, EntryLink, Keywords, MaybeLink, type BulletsProps, type DefaultEntryProps, type KeywordsProps } from './entries.tsx'
export { sectionsToBlocks, type BlockRenderers } from './blocks.tsx'
export { cx, headingCaseStyle, contactEntries, contactGridFits, breakChunks, hasPhoto, shortUrl, PHOTO_RADIUS, CONTACT_ORDER, type ContactEntry, type ContactKey } from './utils.ts'
export { displayName, initials, paperSize, mmToPx, type EntryView, type SectionView, type PaperSize } from '../../lib/templateData.ts'
export type { Block, DocMode, LayoutInfo, PageLayoutProps, PageSlots, TemplateMeta, TemplateProps, TemplateTag } from '../types.ts'
