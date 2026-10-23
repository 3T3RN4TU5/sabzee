/**
 * Word (.docx) export — the `docx` half. Converts a `DocxModel` (docxModel.ts) into a `docx`
 * Document: built-in Title / Heading 1 styles (Word's navigation pane and ATS parsers see real
 * headings), right-aligned tab stops for dates, a real bullet list, clickable hyperlinks, page size
 * and margins from the design. DOM-free: works in Node tests (Packer.toBuffer) and in the browser
 * (Packer.toBlob). The browser loads this module with a dynamic import so `docx` stays out of the
 * main bundle.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  LineRuleType,
  Packer,
  Paragraph,
  Tab,
  TabStopType,
  TextRun,
  UnderlineType,
  type IParagraphOptions,
  type ParagraphChild,
} from 'docx'
import { inlineRuns, letterDocxModel, resumeDocxModel, type DocxModel, type DocxPara, type DocxRun, type DocxTheme } from './docxModel.ts'

export { Packer, inlineRuns, letterDocxModel, resumeDocxModel }

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const BULLETS = 'rf-bullets'
/** Gaps in points at design.spacing = 1. */
const SECTION_GAP = 9
const ENTRY_GAP = 6

/** points → twips (spacing) */
const tw = (pt: number) => Math.round(pt * 20)
/** points → half-points (font size) */
const hp = (pt: number) => Math.round(pt * 2)

function children(runs: DocxRun[], theme: DocxTheme, sizePt?: number): ParagraphChild[] {
  return runs.map((r) => {
    const run = new TextRun({
      text: r.text,
      bold: r.bold || undefined,
      italics: r.italic || undefined,
      color: r.href ? undefined : r.color,
      font: r.code ? theme.monoFont : undefined,
      size: sizePt ? hp(sizePt) : undefined,
      break: r.breakBefore ? 1 : undefined,
      style: r.href ? 'Hyperlink' : undefined,
    })
    return r.href ? new ExternalHyperlink({ link: r.href, children: [run] }) : run
  })
}

function paragraph(p: DocxPara, theme: DocxTheme): Paragraph {
  const t = theme
  const contentWidth = t.page.width - 2 * t.page.margin
  const before = p.gapBefore === 'section' ? tw(SECTION_GAP * t.spacing) : p.gapBefore === 'entry' ? tw(ENTRY_GAP * t.spacing) : 0
  const right = p.right?.length ? [new TextRun({ children: [new Tab()] }), ...children(p.right, t)] : []
  const base: IParagraphOptions = {
    keepNext: p.keepNext || undefined,
    keepLines: true,
    tabStops: right.length ? [{ type: TabStopType.RIGHT, position: contentWidth }] : undefined,
    border: p.ruleBelow ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: t.rule, space: 6 } } : undefined,
  }
  const make = (o: IParagraphOptions, size?: number) => new Paragraph({ ...base, ...o, children: [...children(p.runs, t, size), ...right] })

  switch (p.kind) {
    case 'name':
      return make({ heading: HeadingLevel.TITLE, alignment: t.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT })
    case 'headline':
      return make({ alignment: t.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: tw(3) } }, t.sizePt * 1.2)
    case 'contact':
      return make({ alignment: t.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: tw(2) } }, t.sizePt * 0.92)
    case 'heading':
      return make({ heading: HeadingLevel.HEADING_1, spacing: { before, after: tw(3) } })
    case 'entry-head':
      return make({ spacing: { before } })
    case 'entry-sub':
    case 'entry-meta':
    case 'line':
      return make({ spacing: { before, after: tw(1) } })
    case 'body':
      return make({ spacing: { before, after: tw(2) } })
    case 'bullet':
      return make({ numbering: { reference: BULLETS, level: 0 }, spacing: { after: tw(1.5) } })
    case 'letter-greeting':
      return make({ spacing: { before, after: tw(9) } })
    case 'letter-body':
      return make({ spacing: { after: tw(9) } })
    case 'letter-closing':
      return make({ spacing: { before: tw(6), after: tw(24) } })
    default:
      // letter date, recipient, subject, signature
      return make({ spacing: { before } })
  }
}

/** Build the Word document for a model. */
export function renderDocx(model: DocxModel): Document {
  const t = model.theme
  const upper = t.headingCase === 'upper'
  return new Document({
    ...model.meta,
    lastModifiedBy: 'ResumeForge',
    styles: {
      default: {
        document: {
          run: { font: t.font, size: hp(t.sizePt), color: t.text },
          paragraph: { spacing: { line: Math.round(240 * t.lineMultiple), lineRule: LineRuleType.AUTO, before: 0, after: 0 } },
        },
        title: {
          run: { font: t.headingFont, size: hp(t.sizePt * 2.2), bold: true, color: t.heading },
          paragraph: { spacing: { before: 0, after: tw(2), line: 240, lineRule: LineRuleType.AUTO } },
        },
        heading1: {
          run: { font: t.headingFont, size: hp(t.sizePt * 1.12), bold: true, color: t.accent, allCaps: upper, characterSpacing: upper ? 16 : 0 },
          paragraph: {
            keepNext: true,
            keepLines: true,
            spacing: { before: tw(SECTION_GAP * t.spacing), after: tw(3) },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: t.rule, space: 2 } },
          },
        },
        hyperlink: { run: { color: t.accent, underline: { type: UnderlineType.NONE } } },
        listParagraph: { run: { font: t.font, size: hp(t.sizePt) } },
      },
    },
    numbering: {
      config: [
        {
          reference: BULLETS,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 340, hanging: 220 } }, run: { color: t.accent } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: t.page.width, height: t.page.height },
            margin: { top: t.page.margin, right: t.page.margin, bottom: t.page.margin, left: t.page.margin },
          },
        },
        children: model.paragraphs.map((p) => paragraph(p, t)),
      },
    ],
  })
}
