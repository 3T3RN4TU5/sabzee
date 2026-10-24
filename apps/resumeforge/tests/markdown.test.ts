import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { escapeHtml, inlineToHtml, inlineToPlain, parseInline, sanitizeUrl, toRuns } from '../src/lib/markdown.ts'

describe('inline markdown parser', () => {
  it('parses bold, italic, code and links', () => {
    assert.deepEqual(parseInline('Cut **load time** by *45%* with `vite`'), [
      { type: 'text', text: 'Cut ' },
      { type: 'strong', children: [{ type: 'text', text: 'load time' }] },
      { type: 'text', text: ' by ' },
      { type: 'em', children: [{ type: 'text', text: '45%' }] },
      { type: 'text', text: ' with ' },
      { type: 'code', text: 'vite' },
    ])
    assert.deepEqual(parseInline('[Demo](https://aarav.dev)'), [{ type: 'link', href: 'https://aarav.dev', children: [{ type: 'text', text: 'Demo' }] }])
  })

  it('leaves unmatched markers and arithmetic alone', () => {
    assert.equal(inlineToHtml('5 * 3 * 2'), '5 * 3 * 2')
    assert.equal(inlineToHtml('a **b'), 'a **b')
    assert.equal(inlineToHtml('snake_case_name'), 'snake_case_name')
  })

  it('supports nesting and backslash escapes', () => {
    assert.equal(inlineToHtml('**bold _and italic_**'), '<strong>bold <em>and italic</em></strong>')
    assert.equal(inlineToHtml('\\*not italic\\*'), '*not italic*')
  })

  it('renders plain text with optional urls', () => {
    assert.equal(inlineToPlain('See **[my site](aarav.dev)**'), 'See my site')
    assert.equal(inlineToPlain('See [my site](aarav.dev)', true), 'See my site (aarav.dev)')
  })

  it('produces flat runs for DOCX', () => {
    assert.deepEqual(
      toRuns('a **b** [c](x.dev)').map((r) => [r.text, r.bold, r.href]),
      [
        ['a ', false, null],
        ['b', true, null],
        [' ', false, null],
        ['c', false, 'https://x.dev'],
      ],
    )
  })
})

describe('XSS safety', () => {
  it('escapes raw HTML in text', () => {
    const html = inlineToHtml('<img src=x onerror=alert(1)> & <script>alert("x")</script>')
    assert.ok(!html.includes('<img'))
    assert.ok(!html.includes('<script'))
    assert.equal(html, '&lt;img src=x onerror=alert(1)&gt; &amp; &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
  })

  it('escapes HTML inside bold, code and link labels', () => {
    assert.equal(inlineToHtml('**<b>x</b>**'), '<strong>&lt;b&gt;x&lt;/b&gt;</strong>')
    assert.equal(inlineToHtml('`<svg onload=1>`'), '<code>&lt;svg onload=1&gt;</code>')
    assert.equal(inlineToHtml('[<i>hi</i>](https://ok.dev)'), '<a href="https://ok.dev" rel="noopener noreferrer">&lt;i&gt;hi&lt;/i&gt;</a>')
  })

  it('drops dangerous link targets but keeps the label', () => {
    for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>', 'vbscript:msgbox', '//evil.example', 'java\tscript:alert(1)', '&#106;avascript:alert(1)']) {
      const html = inlineToHtml(`[click](${bad})`)
      assert.ok(!html.includes('<a'), `${bad} should not become a link`)
      assert.ok(html.startsWith('click'), html)
    }
  })

  it('cannot break out of the href attribute', () => {
    const html = inlineToHtml('[x](https://ok.dev/"onmouseover="alert(1))')
    assert.ok(!html.includes('onmouseover="'))
  })

  it('sanitizes urls', () => {
    assert.equal(sanitizeUrl('github.com/aarav'), 'https://github.com/aarav')
    assert.equal(sanitizeUrl('https://x.dev/a?b=1'), 'https://x.dev/a?b=1')
    assert.equal(sanitizeUrl('mailto:a@example.com'), 'mailto:a@example.com')
    assert.equal(sanitizeUrl('a@example.com'), 'mailto:a@example.com')
    assert.equal(sanitizeUrl('javascript:alert(1)'), null)
    assert.equal(sanitizeUrl('not a url'), null)
    assert.equal(escapeHtml(`"'<>&`), '&quot;&#39;&lt;&gt;&amp;')
  })
})

describe('plain-text links inside parentheses', () => {
  it('avoids nested parentheses', () => {
    assert.equal(inlineToPlain('Built a tool (see [demo](https://x.com/d)) and [blog](https://b.dev)', true), 'Built a tool (see demo: x.com/d) and blog (b.dev)')
  })
})
