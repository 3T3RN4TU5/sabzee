import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createTableSql,
  detectFormat,
  isQueryStatement,
  quoteIdent,
  quoteLiteral,
  splitStatements,
  stripComments,
  stripTrailingSemicolons,
  tableNameFromFile,
  withPreviewLimit,
} from '../src/lib/sql.ts'

describe('quoting', () => {
  it('quotes identifiers and doubles embedded quotes', () => {
    assert.equal(quoteIdent('fare'), '"fare"')
    assert.equal(quoteIdent('my "col"'), '"my ""col"""')
  })
  it('quotes literals and doubles single quotes', () => {
    assert.equal(quoteLiteral("it's"), "'it''s'")
  })
})

describe('statement handling', () => {
  it('strips trailing semicolons and trailing comment lines', () => {
    assert.equal(stripTrailingSemicolons('SELECT 1;;  '), 'SELECT 1')
    assert.equal(stripTrailingSemicolons('SELECT 1;\n-- LIMIT 10'), 'SELECT 1')
  })
  it('strips comments but keeps strings intact', () => {
    assert.equal(stripComments("SELECT '--not' -- yes\nFROM t /* x */").replace(/\s+/g, ' ').trim(), "SELECT '--not' FROM t")
  })
  it('splits on top-level semicolons only', () => {
    assert.deepEqual(splitStatements("SELECT ';'; SELECT 2 -- ;\n;"), ["SELECT ';'", 'SELECT 2'])
  })
  it('recognises row-returning statements', () => {
    assert.equal(isQueryStatement('select * from t;'), true)
    assert.equal(isQueryStatement('WITH a AS (SELECT 1) SELECT * FROM a'), true)
    assert.equal(isQueryStatement('FROM t'), true)
    assert.equal(isQueryStatement('(SELECT 1) UNION (SELECT 2)'), true)
    assert.equal(isQueryStatement('CREATE TABLE x AS SELECT 1'), false)
    assert.equal(isQueryStatement('SELECT 1; SELECT 2'), false)
  })
  it('adds a preview LIMIT unless one exists', () => {
    assert.equal(withPreviewLimit('SELECT 1;', 5), 'SELECT * FROM (\nSELECT 1\n) LIMIT 5')
    assert.equal(withPreviewLimit('SELECT 1 LIMIT 3', 5), 'SELECT 1 LIMIT 3')
  })
})

describe('files', () => {
  it('detects formats by extension', () => {
    assert.equal(detectFormat('a.CSV'), 'csv')
    assert.equal(detectFormat('a.tsv'), 'tsv')
    assert.equal(detectFormat('a.ndjson'), 'json')
    assert.equal(detectFormat('a.parquet'), 'parquet')
    assert.equal(detectFormat('a.csv.gz'), 'csv')
    assert.equal(detectFormat('a.xlsx'), null)
  })
  it('derives safe unique table names', () => {
    assert.equal(tableNameFromFile('Sales 2024 (Q1).csv'), 'sales_2024_q1')
    assert.equal(tableNameFromFile('2024.csv'), 't_2024')
    assert.equal(tableNameFromFile('Café.json'), 'cafe')
    assert.equal(tableNameFromFile('select.csv'), 'select_data')
    assert.equal(tableNameFromFile('!!!.csv'), 'data')
    assert.equal(tableNameFromFile('orders.csv', ['orders', 'orders_2']), 'orders_3')
  })
  it('builds a CREATE TABLE with the right reader', () => {
    assert.equal(createTableSql('t', 'parquet', "x'.parquet"), `CREATE OR REPLACE TABLE "t" AS SELECT * FROM read_parquet('x''.parquet')`)
    assert.match(createTableSql('t', 'tsv', 'x.tsv'), /read_csv\('x\.tsv', delim = '\\t'/)
    assert.match(createTableSql('t', 'json', 'x.json'), /read_json_auto\('x\.json'\)/)
  })
})
