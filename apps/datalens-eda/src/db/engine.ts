/**
 * DuckDB-WASM engine. This module (and the ~35 MB WebAssembly binary it pulls in) is loaded
 * lazily after first paint. DuckDB runs inside its own Web Worker; the UI thread only ever
 * talks to it through async messages and receives Apache Arrow record batches back.
 *
 * The worker and .wasm files are bundled locally via Vite `?url` imports, so nothing is
 * fetched from a CDN at runtime. We ship the single-threaded "mvp" and "eh"
 * (exception-handling) builds, which need no cross-origin-isolation headers.
 */
import * as duckdb from '@duckdb/duckdb-wasm'
import ehWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'
import mvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import ehWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import mvpWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import { Table, type RecordBatch, type Schema } from 'apache-arrow'
import { createTableSql, detectFormat, quoteIdent, stripTrailingSemicolons, tableNameFromFile, type FileFormat } from '../lib/sql.ts'
import { categoryFromDuckType, type TypeCategory } from '../lib/types.ts'

export interface ColumnMeta {
  name: string
  type: string
  category: TypeCategory
}

export interface TableMeta {
  name: string
  kind: 'table' | 'view'
  rows: number
  columns: ColumnMeta[]
  source?: string
}

export interface QueryResult {
  table: Table
  rowCount: number
  truncated: boolean
  ms: number
}

export interface InitProgress {
  stage: 'download' | 'instantiate' | 'ready'
  loaded?: number
  total?: number
}

function tableFromBatches(schema: Schema | undefined, batches: RecordBatch[]): Table {
  if (batches.length) return new Table(batches)
  return schema ? new Table(schema) : new Table()
}

export class QueryCancelledError extends Error {
  constructor() {
    super('Query cancelled')
    this.name = 'QueryCancelledError'
  }
}

/** Results larger than this are truncated (the grid shows a notice) to protect browser memory. */
export const MAX_RESULT_ROWS = 2_000_000

export class Engine {
  readonly db: duckdb.AsyncDuckDB
  /** Connection for user queries (cancellable). */
  private user!: duckdb.AsyncDuckDBConnection
  /** Connection for metadata, profiling and charts so they never contend with cancellation. */
  private internal!: duckdb.AsyncDuckDBConnection
  private running = false
  private cancelRequested = false
  private sources = new Map<string, string>()
  version = ''
  bundle = ''

  private constructor(db: duckdb.AsyncDuckDB) {
    this.db = db
  }

  static async create(onProgress?: (p: InitProgress) => void): Promise<Engine> {
    const bundles: duckdb.DuckDBBundles = {
      mvp: { mainModule: mvpWasm, mainWorker: mvpWorker },
      eh: { mainModule: ehWasm, mainWorker: ehWorker },
    }
    const bundle = await duckdb.selectBundle(bundles)
    const worker = new Worker(bundle.mainWorker!)
    const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker)
    onProgress?.({ stage: 'download', loaded: 0 })
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker, (p) => {
      onProgress?.({ stage: 'download', loaded: p.bytesLoaded, total: p.bytesTotal })
    })
    onProgress?.({ stage: 'instantiate' })
    await db.open({
      query: { castDecimalToDouble: true, castTimestampToDate: true },
    })
    const engine = new Engine(db)
    engine.bundle = bundle.mainModule === ehWasm ? 'eh' : 'mvp'
    engine.user = await db.connect()
    engine.internal = await db.connect()
    engine.version = await db.getVersion()
    onProgress?.({ stage: 'ready' })
    return engine
  }

  /** Run on the internal connection and return the whole Arrow table. */
  async q(sql: string): Promise<Table> {
    return this.internal.query(sql)
  }

  /** Plain JS rows (for small metadata / profiling results). */
  async rows<T = Record<string, unknown>>(sql: string): Promise<T[]> {
    const t = await this.q(sql)
    return t.toArray().map((r) => r.toJSON() as T)
  }

  get isRunning(): boolean {
    return this.running
  }

  /**
   * Run a user query, streaming record batches so huge results can be truncated and the
   * query cancelled between batches.
   */
  async run(sql: string, maxRows = MAX_RESULT_ROWS): Promise<QueryResult> {
    if (this.running) throw new Error('Another query is still running — cancel it first.')
    this.running = true
    this.cancelRequested = false
    const t0 = performance.now()
    try {
      const reader = await this.user.send(stripTrailingSemicolons(sql), true)
      if (this.cancelRequested) throw new QueryCancelledError()
      const batches: RecordBatch[] = []
      let rowCount = 0
      let truncated = false
      for await (const batch of reader) {
        if (this.cancelRequested) {
          await this.user.cancelSent().catch(() => false)
          throw new QueryCancelledError()
        }
        if (rowCount + batch.numRows > maxRows) {
          batches.push(batch.slice(0, maxRows - rowCount))
          rowCount = maxRows
          truncated = true
          await this.user.cancelSent().catch(() => false)
          break
        }
        batches.push(batch)
        rowCount += batch.numRows
      }
      const schema: Schema | undefined = reader.schema ?? batches[0]?.schema
      const table = tableFromBatches(schema, batches)
      return { table, rowCount, truncated, ms: performance.now() - t0 }
    } catch (err) {
      if (this.cancelRequested) throw new QueryCancelledError()
      throw err
    } finally {
      this.running = false
    }
  }

  /** Ask DuckDB to interrupt the running user query. */
  async cancel(): Promise<boolean> {
    if (!this.running) return false
    this.cancelRequested = true
    return this.user.cancelSent().catch(() => false)
  }

  async listTables(): Promise<TableMeta[]> {
    const objects = await this.rows<{ name: string; kind: string; rows: number | bigint | null }>(
      `SELECT table_name AS name, 'table' AS kind, estimated_size AS rows FROM duckdb_tables() WHERE schema_name = 'main' AND NOT internal
       UNION ALL
       SELECT view_name, 'view', NULL FROM duckdb_views() WHERE schema_name = 'main' AND NOT internal
       ORDER BY name`,
    )
    if (objects.length === 0) return []
    const cols = await this.rows<{ table_name: string; column_name: string; data_type: string }>(
      `SELECT table_name, column_name, data_type FROM information_schema.columns
       WHERE table_schema = 'main' ORDER BY table_name, ordinal_position`,
    )
    return objects.map((o) => ({
      name: o.name,
      kind: o.kind === 'view' ? 'view' : 'table',
      rows: o.rows == null ? 0 : Number(o.rows),
      source: this.sources.get(o.name),
      columns: cols
        .filter((c) => c.table_name === o.name)
        .map((c) => ({ name: c.column_name, type: c.data_type, category: categoryFromDuckType(c.data_type) })),
    }))
  }

  /** Exact row count (estimated_size can lag for views and freshly created tables). */
  async countRows(table: string): Promise<number> {
    const [r] = await this.rows<{ n: bigint | number }>(`SELECT count(*) AS n FROM ${quoteIdent(table)}`)
    return Number(r.n)
  }

  /** Register a user-picked / dropped file without copying it into JS memory, then load it as a table. */
  async loadFile(file: File, taken: string[]): Promise<string> {
    const format = detectFormat(file.name)
    if (!format) throw new Error(`Unsupported file type: ${file.name}. Use CSV, TSV, JSON/NDJSON or Parquet.`)
    const virtualName = `upload_${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`
    await this.db.registerFileHandle(virtualName, file, duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true)
    const name = tableNameFromFile(file.name, taken)
    await this.createFrom(name, format, virtualName, async () => new Uint8Array(await file.arrayBuffer()))
    this.sources.set(name, file.name)
    return name
  }

  /** Fetch a bundled sample over HTTP and load it. */
  async loadUrl(url: string, fileName: string, tableName: string): Promise<string> {
    const format = detectFormat(fileName) as FileFormat
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Could not download ${fileName} (${res.status})`)
    const buf = new Uint8Array(await res.arrayBuffer())
    await this.db.registerFileBuffer(fileName, buf)
    await this.createFrom(tableName, format, fileName, async () => buf)
    this.sources.set(tableName, fileName)
    return tableName
  }

  /**
   * Materialize a registered file as a table. Parquet and JSON readers live in DuckDB
   * extensions that are autoloaded over the network; if that fails we fall back to
   * extension-free paths (parquet-wasm → Arrow IPC, and DuckDB-WASM's built-in JSON importer).
   */
  private async createFrom(table: string, format: FileFormat, fileName: string, bytes: () => Promise<Uint8Array>) {
    let nativeError: unknown
    try {
      await this.internal.query(createTableSql(table, format, fileName))
      return
    } catch (err) {
      if (format !== 'parquet' && format !== 'json') throw err
      nativeError = err
    }
    try {
      await this.internal.query(`DROP TABLE IF EXISTS ${quoteIdent(table)}`)
      if (format === 'parquet') {
        const { parquetToIpc } = await import('./parquetFallback.ts')
        await this.internal.insertArrowFromIPCStream(await parquetToIpc(await bytes()), { name: table, create: true })
      } else {
        await this.internal.insertJSONFromPath(fileName, { name: table, create: true })
      }
    } catch (fallbackError) {
      const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))
      throw new Error(`${msg(nativeError)} (fallback reader also failed: ${msg(fallbackError)})`)
    }
    this.fallbacks.add(table)
  }

  /** Tables that were loaded through a fallback reader (for the UI to mention). */
  readonly fallbacks = new Set<string>()

  async dropTable(name: string, kind: 'table' | 'view'): Promise<void> {
    await this.internal.query(`DROP ${kind === 'view' ? 'VIEW' : 'TABLE'} IF EXISTS ${quoteIdent(name)}`)
    this.sources.delete(name)
  }

  /** Write a query result to Parquet inside DuckDB's virtual FS and return the bytes. */
  async exportParquet(sql: string): Promise<Uint8Array> {
    const query = stripTrailingSemicolons(sql)
    const out = `export_${Date.now()}.parquet`
    try {
      await this.internal.query(`COPY (${query}) TO '${out}' (FORMAT PARQUET, COMPRESSION ZSTD)`)
      const bytes = await this.db.copyFileToBuffer(out)
      await this.db.dropFile(out).catch(() => null)
      return bytes
    } catch {
      // Parquet extension unavailable: encode the Arrow result with parquet-wasm instead.
      const [{ ipcToParquet }, arrow] = await Promise.all([import('./parquetFallback.ts'), import('apache-arrow')])
      const table = await this.internal.query(query)
      return ipcToParquet(arrow.tableToIPC(table, 'stream'))
    }
  }

  /** Physical plan text for EXPLAIN. */
  async explain(sql: string, analyze = false): Promise<string> {
    const t = await this.internal.query(`EXPLAIN ${analyze ? 'ANALYZE ' : ''}${stripTrailingSemicolons(sql)}`)
    const col = t.getChild('explain_value')
    if (!col) return ''
    const parts: string[] = []
    for (let i = 0; i < t.numRows; i++) parts.push(String(col.get(i)))
    return parts.join('\n')
  }
}
