/**
 * App-facing template API. Feature code imports from 'src/templates':
 *   import { PagedDocument, TemplateThumbnail, TEMPLATES, getTemplate } from '../../templates'
 * Template folders must import from './shared' / '../shared' instead (no registry → no import cycle).
 */
export { PagedDocument, type PagedDocumentProps } from './shared/PagedDocument.tsx'
export { TemplateThumbnail, type TemplateThumbnailProps } from './shared/Thumbnail.tsx'
export { TEMPLATES, getTemplate, hasTemplate, FALLBACK_TEMPLATE } from './registry.ts'
export { fontsReady, ensureFont } from './shared/fonts.ts'
export { Rich, RichParagraphs } from './shared/Rich.tsx'
export { ContactList } from './shared/Contact.tsx'
export { Photo } from './shared/Photo.tsx'
export { docCssVars } from './shared/cssVars.ts'
export type { Block, DocMode, LayoutInfo, PageLayoutProps, PageSlots, TemplateDef, TemplateMeta, TemplateModule, TemplateProps, TemplateTag } from './types.ts'
