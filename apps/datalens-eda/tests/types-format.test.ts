import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatBytes,
  formatCell,
  formatCompact,
  formatDuration,
  formatFloat,
  formatNumber,
  formatPercent,
  formatTimestamp,
  toPlain,
} from '../src/lib/format.ts'
import { categoryFromArrowType, categoryFromDuckType, inferTypeFromStrings, isNumeric, typeBadge } from '../src/lib/types.ts'

describe('type categories', () => {
  it('maps DuckDB type names', () => {
    const cases: [string, string][] = [
      ['BIGINT', 'integer'],
      ['UTINYINT', 'integer'],
      ['HUGEINT', 'integer'],
      ['INTEGER', 'integer'],
      ['DOUBLE', 'float'],
      ['FLOAT', 'float'],
      ['DECIMAL(18,3)', 'decimal'],
      ['VARCHAR', 'string'],
      ['UUID', 'string'],
      ['BOOLEAN', 'boolean'],
      ['DATE', 'date'],
      ['TIMESTAMP', 'timestamp'],
      ['TIMESTAMP WITH TIME ZONE', 'timestamp'],
      ['TIMESTAMP_NS', 'timestamp'],
      ['TIME', 'time'],
      ['INTERVAL', 'interval'],
      ['VARCHAR[]', 'list'],
      ['STRUCT(a INTEGER)', 'struct'],
      ['MAP(VARCHAR, INTEGER)', 'struct'],
      ['BLOB', 'blob'],
    ]
    for (const [input, expected] of cases) assert.equal(categoryFromDuckType(input), expected, input)
  })
  it('maps Arrow type strings', () => {
    const cases: [string, string][] = [
      ['Int64', 'integer'],
      ['Float64', 'float'],
      ['Utf8', 'string'],
      ['Bool', 'boolean'],
      ['Date32<DAY>', 'date'],
      ['Timestamp<MICROSECOND>', 'timestamp'],
      ['Time64<MICROSECOND>', 'time'],
      ['Decimal[18e3]', 'decimal'],
      ['List<Int32>', 'list'],
      ['Struct<{a:Int32}>', 'struct'],
      ['Dictionary<Int32, Utf8>', 'string'],
    ]
    for (const [input, expected] of cases) assert.equal(categoryFromArrowType(input), expected, input)
    assert.equal(categoryFromArrowType('Uint32'), 'integer')
  })
  it('has badges and numeric predicate', () => {
    assert.equal(typeBadge('string'), 'ABC')
    assert.ok(isNumeric('decimal'))
    assert.ok(!isNumeric('date'))
  })
  it('infers types from text samples', () => {
    assert.equal(inferTypeFromStrings(['1', '-2', '', null, '30']), 'integer')
    assert.equal(inferTypeFromStrings(['1', '2.5', '1e3', 'NA']), 'float')
    assert.equal(inferTypeFromStrings(['true', 'FALSE']), 'boolean')
    assert.equal(inferTypeFromStrings(['2024-01-01', '1999-12-31']), 'date')
    assert.equal(inferTypeFromStrings(['2024-01-01 10:00:00', '2024-01-01T10:00Z']), 'timestamp')
    assert.equal(inferTypeFromStrings(['1', 'two']), 'string')
    assert.equal(inferTypeFromStrings(['', null]), 'other')
  })
})

describe('formatting', () => {
  it('formats floats compactly', () => {
    assert.equal(formatFloat(3.14159265), '3.141593')
    assert.equal(formatFloat(1234567.891), '1234567.891')
    assert.equal(formatFloat(0.1 + 0.2), '0.3')
    assert.equal(formatFloat(98765432109.87), '98765432110')
    assert.equal(formatFloat(1e-9), '1.000e-9')
    assert.equal(formatFloat(Number.NaN), 'NaN')
  })
  it('formats numbers, percents, bytes and durations', () => {
    assert.equal(formatNumber(1234567.891), '1,234,567.89')
    assert.equal(formatNumber(12345678901234567890n), '12,345,678,901,234,567,890')
    assert.equal(formatNumber(null), '—')
    assert.equal(formatPercent(0.1234), '12.3%')
    assert.equal(formatPercent(0.5), '50%')
    assert.equal(formatPercent(0.00001), '<0.1%')
    assert.equal(formatBytes(512), '512 B')
    assert.equal(formatBytes(1536), '1.5 KB')
    assert.equal(formatBytes(3 * 1024 ** 3), '3.0 GB')
    assert.equal(formatDuration(0.5), '0.50 ms')
    assert.equal(formatDuration(412.4), '412 ms')
    assert.equal(formatDuration(2310), '2.31 s')
    assert.equal(formatDuration(64_000), '1m 04s')
  })
  it('formats axis labels compactly', () => {
    assert.equal(formatCompact(1200), '1.2k')
    assert.equal(formatCompact(3_400_000), '3.4M')
    assert.equal(formatCompact(250_000), '250k')
    assert.equal(formatCompact(0), '0')
    assert.equal(formatCompact(12.5), '12.5')
    assert.equal(formatCompact(-1500), '-1.5k')
  })
  it('formats cells by category', () => {
    const ms = Date.UTC(2024, 0, 5, 13, 4, 9)
    assert.equal(formatCell(ms, 'date'), '2024-01-05')
    assert.equal(formatCell(ms, 'timestamp'), '2024-01-05 13:04:09')
    assert.equal(formatCell(new Date(ms + 7), 'timestamp'), '2024-01-05 13:04:09.007')
    assert.equal(formatTimestamp(ms), '2024-01-05 13:04:09')
    assert.equal(formatCell(10n, 'integer'), '10')
    assert.equal(formatCell(2.5, 'float'), '2.5')
    assert.equal(formatCell(true, 'boolean'), 'true')
    assert.equal(formatCell(null, 'string'), 'NULL')
    assert.equal(formatCell([1n, 2n], 'list'), '[1,2]')
    assert.equal(formatCell({ a: 1, b: [true] }, 'struct'), '{"a":1,"b":[true]}')
  })
  it('converts nested values to plain JSON-safe data', () => {
    assert.deepEqual(toPlain({ toJSON: () => ({ n: 9007199254740993n }) }), { n: '9007199254740993' })
    assert.deepEqual(toPlain(new BigInt64Array([1n, 2n])), [1, 2])
  })
})
