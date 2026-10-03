import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { editableTextPaths, type Snapshot } from '../src/shared/model';

export function fixture(): Snapshot {
  const files: Snapshot['files'] = {};
  for (const file of editableTextPaths) {
    const full = path.resolve('..', file);
    if (existsSync(full)) files[file] = { content: readFileSync(full, 'utf8'), sha: 'a'.repeat(40) };
  }
  return { commitSha: 'b'.repeat(40), treeSha: 'c'.repeat(40), files, profileSha: 'd'.repeat(40), loadedAt: new Date().toISOString() };
}
