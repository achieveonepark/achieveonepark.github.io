import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GitHub, validatePng } from '../src/main/github';
import { ACCOUNT, AUTHOR_EMAIL, parseContent, documentPath, type Draft } from '../src/shared/model';
import { fixture } from './fixtures';

function backend(conflict = false, race = false) {
  const base = fixture(); const writes: { endpoint: string; body: any }[] = [];
  const request = async (url: string | URL | Request, options?: RequestInit) => {
    const endpoint = String(url).replace('https://api.github.com', '');
    const body = options?.body ? JSON.parse(options.body as string) : null;
    if (options?.method !== 'GET' && options?.method) writes.push({ endpoint, body });
    let value: unknown;
    if (endpoint === '/user') value = { login: ACCOUNT, name: 'Park', avatar_url: '' };
    else if (endpoint.endsWith('/achieveonepark.github.io')) value = { permissions: { push: true } };
    else if (endpoint.endsWith('/git/ref/heads/main')) value = { object: { sha: 'e'.repeat(40) } };
    else if (endpoint.includes('/git/commits/') && !body) value = { tree: { sha: 'f'.repeat(40) } };
    else if (endpoint.includes('/git/trees/') && !body) value = { tree: Object.entries(base.files).map(([path, file]) => ({ path, sha: conflict && path === documentPath('ko', 'about') ? '9'.repeat(40) : file.sha, type: 'blob', mode: '100644' })), truncated: false };
    else if (endpoint.endsWith('/git/blobs')) value = { sha: '1'.repeat(40) };
    else if (endpoint.endsWith('/git/trees')) value = { sha: '2'.repeat(40) };
    else if (endpoint.endsWith('/git/commits')) value = { sha: '3'.repeat(40), html_url: 'https://github.com/commit' };
    else if (endpoint.endsWith('/git/refs/heads/main')) { if (race) return new Response('{}', { status: 422 }); value = {}; }
    else throw new Error(`Unexpected endpoint: ${endpoint}`);
    return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const content = parseContent(base); content.languages.ko.profile.name = '테스트';
  const draft: Draft = { version: 1, base, content, savedAt: new Date().toISOString() };
  return { api: new GitHub('fake-never-use-live-token', request as typeof fetch), draft, writes };
}
test('publishing preserves the current tree and uses the required identity without forcing main', async () => {
  const { api, draft, writes } = backend(); await api.publish(draft, 'test');
  assert.deepEqual(writes.map(write => write.endpoint.split('/').at(-1)), ['blobs', 'trees', 'commits', 'main']);
  assert.equal(writes[1].body.base_tree, 'f'.repeat(40));
  assert.deepEqual(writes[2].body.parents, ['e'.repeat(40)]);
  assert.deepEqual(writes[2].body.author, { name: ACCOUNT, email: AUTHOR_EMAIL });
  assert.deepEqual(writes[2].body.committer, writes[2].body.author);
  assert.equal(writes[3].body.force, false);
});
test('a changed edited file blocks all remote mutations', async () => {
  const { api, draft, writes } = backend(true); await assert.rejects(() => api.publish(draft, 'test'), /다른 곳/); assert.deepEqual(writes, []);
});
test('a concurrent main update is surfaced instead of forced through', async () => {
  const { api, draft, writes } = backend(false, true); await assert.rejects(() => api.publish(draft, 'test'), /최신 내용/); assert.equal(writes.at(-1)?.body.force, false);
});
test('image uploads reject oversized, non-PNG and malformed data', () => {
  assert.throws(() => validatePng(Buffer.from('not a PNG').toString('base64')));
  assert.throws(() => validatePng('data:image/png;base64,AAAA'));
  const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(oversized);
  assert.throws(() => validatePng(oversized.toString('base64')), /5MB/);
});
test('private profile images are fetched through authenticated GitHub blobs and returned as image data', async () => {
  const encoded = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString('base64');
  const sha = 'a'.repeat(40);
  const api = new GitHub('test-private-token', (async (url, options) => {
    assert.equal(String(url), `https://api.github.com/repos/achieveonepark/achieveonepark.github.io/git/blobs/${sha}`);
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer test-private-token');
    return new Response(JSON.stringify({ content: encoded, encoding: 'base64' }));
  }) as typeof fetch);
  assert.equal(await api.profileImage(sha), `data:image/png;base64,${encoded}`);
});
