import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseContent, makeChanges, mergeContent, documentPath } from '../src/shared/model';
import { fixture } from './fixtures';
test('opening the actual bilingual portfolio produces no changes', () => {
  const snapshot = fixture();
  const content = parseContent(snapshot);
  assert.equal(content.languages.ko.profile.name, '박성일');
  assert.equal(content.languages.en.projects.length, 3);
  assert.deepEqual(makeChanges(snapshot, content), []);
});
test('editing a Korean profile preserves every unrelated English and career file', () => {
  const snapshot = fixture(); const content = parseContent(snapshot);
  content.languages.ko.profile.name = '테스트 이름';
  const changes = makeChanges(snapshot, content);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].path, documentPath('ko', 'about'));
  assert.match(changes[0].content, /이름: 테스트 이름/);
  assert.ok(changes[0].content.includes(content.languages.ko.profile.body));
});
test('technical stack updates shared data and both OS skill lists', () => {
  const snapshot = fixture(); const content = parseContent(snapshot);
  content.techStack[0].values.push('Unreal');
  assert.deepEqual(makeChanges(snapshot, content).map(change => change.path).sort(), ['src/content/site.json', documentPath('ko', 'skills'), documentPath('en', 'skills')].sort());
});
test('link and project validation rejects values that the public site cannot render', () => {
  const snapshot = fixture(); const content = parseContent(snapshot);
  content.languages.ko.links.items[0].value = 'javascript:alert(1)';
  assert.throws(() => makeChanges(snapshot, content), /올바른/);
  const projects = parseContent(snapshot); projects.languages.en.projects[0].video = 'https://evil.example/video';
  assert.throws(() => makeChanges(snapshot, projects), /YouTube/);
});
test('refresh merges independent edits and identifies overlapping fields', () => {
  const original = parseContent(fixture()); const local = structuredClone(original); const remote = structuredClone(original);
  local.languages.ko.profile.name = 'local'; remote.languages.en.profile.name = 'remote';
  const merged = mergeContent(original, local, remote);
  assert.deepEqual(merged.conflicts, []);
  assert.equal(merged.content.languages.ko.profile.name, 'local'); assert.equal(merged.content.languages.en.profile.name, 'remote');
  remote.languages.ko.profile.name = 'other';
  assert.deepEqual(mergeContent(original, local, remote).conflicts, ['content.languages.ko.profile.name']);
  assert.equal(mergeContent(original, local, remote, 'remote').content.languages.ko.profile.name, 'other');
});
