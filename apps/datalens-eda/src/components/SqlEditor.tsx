/**
 * CodeMirror 6 SQL editor. Loaded lazily (React.lazy) so the editor bundle never blocks
 * first paint. Autocomplete knows the live schema: table names, and column names after
 * `table.` or anywhere once a table is in scope.
 */
import { useEffect, useRef, type RefObject } from 'react'
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, type Completion, type CompletionContext } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab, toggleComment } from '@codemirror/commands'
import { PostgreSQL, sql, type SQLNamespace } from '@codemirror/lang-sql'
import { bracketMatching, HighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { Compartment, EditorState, Prec } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
  rectangularSelection,
} from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

export interface EditorApi {
  focus: () => void
  /** Selected text if any, else the whole document. */
  getRunnable: () => string
  setValue: (v: string) => void
}

const DUCKDB_FUNCTIONS = [
  'count', 'sum', 'avg', 'min', 'max', 'median', 'mode', 'quantile_cont', 'quantile_disc', 'stddev_samp', 'stddev_pop', 'var_samp',
  'corr', 'covar_samp', 'regr_slope', 'regr_intercept', 'regr_r2', 'skewness', 'kurtosis', 'mad', 'approx_count_distinct',
  'approx_quantile', 'arg_max', 'arg_min', 'any_value', 'first', 'last', 'list', 'string_agg', 'histogram', 'bool_and',
  'bool_or', 'date_trunc', 'date_part', 'date_diff', 'date_add', 'strftime', 'strptime', 'epoch', 'epoch_ms', 'make_date',
  'current_date', 'now', 'dayname', 'monthname', 'year', 'month', 'day', 'hour', 'week', 'quarter', 'dayofweek', 'time_bucket',
  'round', 'floor', 'ceil', 'abs', 'ln', 'log10', 'log2', 'sqrt', 'pow', 'exp', 'greatest', 'least', 'coalesce', 'nullif',
  'ifnull', 'length', 'lower', 'upper', 'trim', 'ltrim', 'rtrim', 'substring', 'replace', 'split_part', 'concat', 'concat_ws',
  'regexp_matches', 'regexp_extract', 'regexp_replace', 'contains', 'starts_with', 'ends_with', 'left', 'right', 'lpad',
  'rpad', 'strip_accents', 'levenshtein', 'jaro_winkler_similarity', 'row_number', 'rank', 'dense_rank', 'percent_rank',
  'cume_dist', 'ntile', 'lag', 'lead', 'first_value', 'last_value', 'nth_value', 'try_cast', 'typeof', 'unnest', 'range',
  'generate_series', 'read_csv', 'read_csv_auto', 'read_parquet', 'read_json_auto', 'list_value', 'struct_pack', 'hash', 'md5',
  'random', 'setseed', 'uuid', 'gen_random_uuid', 'array_agg', 'list_sort', 'list_distinct', 'len',
]
const DUCKDB_KEYWORDS = ['SUMMARIZE', 'DESCRIBE', 'PIVOT', 'UNPIVOT', 'QUALIFY', 'EXCLUDE', 'REPLACE', 'COLUMNS', 'USING SAMPLE', 'GROUP BY ALL', 'ORDER BY ALL', 'ASOF JOIN', 'POSITIONAL JOIN', 'ANTI JOIN', 'SEMI JOIN']

const functionCompletions: Completion[] = [
  ...DUCKDB_FUNCTIONS.map((f) => ({ label: f, type: 'function', apply: `${f}(`, boost: -1 })),
  ...DUCKDB_KEYWORDS.map((k) => ({ label: k, type: 'keyword', boost: -2 })),
]

function duckFunctions(ctx: CompletionContext) {
  const word = ctx.matchBefore(/[\w]+/)
  if (!word || (word.from === word.to && !ctx.explicit)) return null
  const before = ctx.state.sliceDoc(Math.max(0, word.from - 1), word.from)
  if (before === '.' || before === '"') return null
  return { from: word.from, options: functionCompletions, validFor: /^\w*$/ }
}

const theme = EditorView.theme(
  {
    '&': { backgroundColor: 'transparent', color: '#e2e8f0' },
    '.cm-content': { caretColor: '#67e8f9', padding: '10px 0' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#67e8f9', borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'rgba(34,211,238,0.22)' },
    '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.03)' },
    '.cm-gutters': { backgroundColor: 'transparent', color: '#475569', border: 'none', paddingLeft: '6px' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#94a3b8' },
    '.cm-matchingBracket': { backgroundColor: 'rgba(34,211,238,0.18)', outline: '1px solid rgba(34,211,238,0.4)' },
    '.cm-selectionMatch': { backgroundColor: 'rgba(148,163,184,0.16)' },
    '.cm-tooltip': { backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' },
    '.cm-tooltip-autocomplete > ul': { fontFamily: 'var(--font-mono)', fontSize: '12.5px', maxHeight: '16em' },
    '.cm-tooltip-autocomplete > ul > li': { padding: '2px 8px !important' },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'rgba(34,211,238,0.18)', color: '#f8fafc' },
    '.cm-completionDetail': { color: '#64748b', fontStyle: 'normal', marginLeft: '8px' },
    '.cm-placeholder': { color: '#475569' },
    '.cm-panels': { backgroundColor: '#0f172a', color: '#e2e8f0', borderTop: '1px solid rgba(255,255,255,0.08)' },
    '.cm-panels input, .cm-panels button': { color: '#e2e8f0' },
    '.cm-searchMatch': { backgroundColor: 'rgba(251,191,36,0.25)' },
  },
  { dark: true },
)

const highlight = HighlightStyle.define([
  { tag: t.keyword, color: '#7dd3fc', fontWeight: '500' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#c4b5fd' },
  { tag: [t.string, t.special(t.string)], color: '#86efac' },
  { tag: [t.number, t.bool, t.null], color: '#fbbf24' },
  { tag: t.comment, color: '#64748b', fontStyle: 'italic' },
  { tag: [t.operator, t.punctuation], color: '#94a3b8' },
  { tag: [t.typeName, t.standard(t.name)], color: '#f0abfc' },
  { tag: t.special(t.name), color: '#fda4af' },
  { tag: t.name, color: '#e2e8f0' },
])

export default function SqlEditor({
  value,
  onChange,
  schema,
  onRun,
  onExplain,
  onSave,
  apiRef,
}: {
  value: string
  onChange: (v: string) => void
  schema: Record<string, string[]>
  onRun: (sql: string) => void
  onExplain: (sql: string) => void
  onSave: () => void
  apiRef: RefObject<EditorApi | null>
}) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const langConf = useRef(new Compartment())
  const handlers = useRef({ onChange, onRun, onExplain, onSave })
  handlers.current = { onChange, onRun, onExplain, onSave }

  useEffect(() => {
    const runnable = (v: EditorView) => {
      const sel = v.state.selection.main
      return sel.empty ? v.state.doc.toString() : v.state.sliceDoc(sel.from, sel.to)
    }
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          rectangularSelection(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          autocompletion({ override: null, activateOnTyping: true, icons: false }),
          langConf.current.of(sql({ dialect: PostgreSQL, schema: toNamespace(schema), upperCaseKeywords: true })),
          PostgreSQL.language.data.of({ autocomplete: duckFunctions }),
          syntaxHighlighting(highlight),
          theme,
          placeholder('Write SQL… e.g. SELECT * FROM taxi_trips LIMIT 100'),
          EditorView.contentAttributes.of({ 'aria-label': 'SQL editor' }),
          Prec.highest(
            keymap.of([
              { key: 'Mod-Enter', run: (vv) => (handlers.current.onRun(runnable(vv)), true) },
              { key: 'Shift-Enter', run: (vv) => (handlers.current.onRun(runnable(vv)), true) },
              { key: 'Mod-Shift-e', run: (vv) => (handlers.current.onExplain(runnable(vv)), true) },
              { key: 'Mod-s', run: () => (handlers.current.onSave(), true) },
              { key: 'Mod-/', run: toggleComment },
            ]),
          ),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...completionKeymap, indentWithTab]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) handlers.current.onChange(u.state.doc.toString())
          }),
        ],
      }),
    })
    view.current = v
    apiRef.current = {
      focus: () => v.focus(),
      getRunnable: () => runnable(v),
      setValue: (text) => v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text }, selection: { anchor: text.length } }),
    }
    return () => {
      v.destroy()
      view.current = null
      apiRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the editor in sync when the value is replaced from outside (history, share links, "open in editor").
  useEffect(() => {
    const v = view.current
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
    }
  }, [value])

  useEffect(() => {
    view.current?.dispatch({
      effects: langConf.current.reconfigure(sql({ dialect: PostgreSQL, schema: toNamespace(schema), upperCaseKeywords: true })),
    })
  }, [schema])

  return <div ref={host} className="h-full min-h-0 overflow-hidden" />
}

function toNamespace(schema: Record<string, string[]>): SQLNamespace {
  const ns: Record<string, readonly string[]> = {}
  for (const [table, cols] of Object.entries(schema)) ns[table] = cols
  return ns
}
