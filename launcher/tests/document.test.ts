import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseContent } from '../src/shared/model';
import { bodyHtml, defaultDocumentOptions, documentHtml } from '../src/shared/document';
import { fixture } from './fixtures';

test('resume composes selected experience into text sections and excludes personal fields from website data', () => {
  const content = parseContent(fixture()); const options = defaultDocumentOptions(content, 'ko');
  options.companies = ['snowpipe']; options.projects = []; options.phone = '010-TEST-ONLY';
  const html = documentHtml(content, options);
  assert.match(html, /010-TEST-ONLY/); assert.match(html, /Snowpipe/);
  assert.doesNotMatch(html, /상세 경력/); assert.ok(!JSON.stringify(content).includes('010-TEST-ONLY'));
});
test('career tables preserve columns, nested lists and soft-wrapped paragraphs without executable links', () => {
  const content = parseContent(fixture());
  const html = bodyHtml(content.languages.ko.companies.gridinc.body);
  assert.match(html, /<table>/); assert.match(html, /<th>Android<\/th>/); assert.match(html, /<td>Google<\/td>/);
  assert.doesNotMatch(html, /\| ---/);
  const formatted = bodyHtml('First line\nsecond line\n\n- Parent\n  - Child\n\n[click](javascript:alert(1))\n<img src=x onerror=alert(1)>');
  assert.match(formatted, /<p>First line\nsecond line<\/p>/);
  assert.match(formatted, /<li>Parent[\s\S]*<ul>[\s\S]*<li>Child/);
  assert.doesNotMatch(formatted, /<a |<img/);
});
test('career document includes full selected work and escapes HTML in every field', () => {
  const content = parseContent(fixture()); const options = defaultDocumentOptions(content, 'ko');
  options.kind = 'career'; options.name = '<script>alert(1)</script>'; options.companies = ['111percent']; options.projects = [];
  content.languages.ko.companies['111percent'].body += '\n<script>evil()</script>';
  const html = documentHtml(content, options);
  assert.match(html, /doc-company-page/); assert.match(html, /결제/); assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<iframe|<video/);
});
