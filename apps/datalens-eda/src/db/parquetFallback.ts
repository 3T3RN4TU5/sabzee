/**
 * Fallback Parquet reader/writer built on parquet-wasm (Rust arrow-rs compiled to WASM).
 *
 * DuckDB-WASM reads Parquet through its `parquet` extension, which it autoloads from the
 * official extension repository on first use. When that download is blocked (offline,
 * strict corporate proxies), we decode the file with parquet-wasm into Arrow IPC and hand
 * it to DuckDB via `insertArrowFromIPCStream` — so Parquet always works. This module and
 * its ~5 MB wasm are only fetched if the fallback is actually needed.
 */
import init, { readParquet, Table as WasmTable, writeParquet } from 'parquet-wasm/esm'
import wasmUrl from 'parquet-wasm/esm/parquet_wasm_bg.wasm?url'

let ready: Promise<unknown> | null = null
const boot = () => (ready ??= init({ module_or_path: wasmUrl }))

/** Parquet bytes → Arrow IPC stream bytes. */
export async function parquetToIpc(bytes: Uint8Array): Promise<Uint8Array> {
  await boot()
  return readParquet(bytes).intoIPCStream()
}

/** Arrow IPC stream bytes → Parquet bytes. */
export async function ipcToParquet(ipc: Uint8Array): Promise<Uint8Array> {
  await boot()
  return writeParquet(WasmTable.fromIPCStream(ipc))
}
