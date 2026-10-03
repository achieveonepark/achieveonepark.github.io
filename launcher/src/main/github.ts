import { ACCOUNT, AUTHOR_EMAIL, REPOSITORY, editablePaths, editableTextPaths, makeChanges, type Draft, type Snapshot, type User, type Deployment, type Change } from '../shared/model';

type TreeEntry = { path: string; sha: string; type: string; mode: string };
type Tree = { sha: string; tree: TreeEntry[]; truncated?: boolean };
export class GitHub {
  constructor(private token: string, private request: typeof fetch = fetch) {}

  async api<T>(endpoint: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await this.request(`https://api.github.com${endpoint}`, {
      method, headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'Achieveone-Studio', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30_000), redirect: 'error',
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('GitHub 로그인이 만료됐어요. 다시 로그인해 주세요.');
      if (response.status === 403) throw new Error('GitHub 접근 권한 또는 요청 한도를 확인해 주세요.');
      if (response.status === 409 || response.status === 422) throw new Error('GitHub의 최신 내용이 바뀌었어요. 새로 불러온 뒤 변경사항을 확인해 주세요.');
      throw new Error(`GitHub 요청에 실패했어요 (${response.status}). 잠시 후 다시 시도해 주세요.`);
    }
    return response.json() as Promise<T>;
  }

  async user(): Promise<User> {
    const user = await this.api<{ login: string; name: string; avatar_url: string }>('/user');
    if (user.login.toLowerCase() !== ACCOUNT) throw new Error('achieveonepark 계정으로 로그인해 주세요.');
    const repo = await this.api<{ permissions?: { push?: boolean } }>(`/repos/${REPOSITORY}`);
    if (!repo.permissions?.push) throw new Error('이 저장소에 게시할 권한이 없어요.');
    return { login: user.login, name: user.name || user.login, avatar: user.avatar_url };
  }

  private async head() {
    const ref = await this.api<{ object: { sha: string } }>(`/repos/${REPOSITORY}/git/ref/heads/main`);
    const commit = await this.api<{ tree: { sha: string } }>(`/repos/${REPOSITORY}/git/commits/${ref.object.sha}`);
    const tree = await this.api<Tree>(`/repos/${REPOSITORY}/git/trees/${commit.tree.sha}?recursive=1`);
    if (tree.truncated) throw new Error('저장소가 너무 커서 전체 내용을 읽지 못했어요.');
    return { commitSha: ref.object.sha, treeSha: commit.tree.sha, entries: tree.tree };
  }

  async snapshot(): Promise<Snapshot> {
    const head = await this.head();
    const files: Snapshot['files'] = {};
    const wanted = head.entries.filter(entry => editableTextPaths.includes(entry.path) && entry.type === 'blob' && entry.mode === '100644');
    // Keep requests bounded even when both languages have many company pages.
    for (let index = 0; index < wanted.length; index += 4) {
      await Promise.all(wanted.slice(index, index + 4).map(async entry => {
        const blob = await this.api<{ content: string; encoding: string }>(`/repos/${REPOSITORY}/git/blobs/${entry.sha}`);
        if (blob.encoding !== 'base64') throw new Error('지원하지 않는 콘텐츠 형식이에요.');
        const content = Buffer.from(blob.content.replace(/\s/g, ''), 'base64').toString('utf8');
        if (content.length > 200_000) throw new Error('콘텐츠가 너무 길어요.');
        files[entry.path] = { sha: entry.sha, content };
      }));
    }
    return { commitSha: head.commitSha, treeSha: head.treeSha, files, profileSha: head.entries.find(entry => entry.path === 'images/profile.png')?.sha ?? null, loadedAt: new Date().toISOString() };
  }

  async publish(draft: Draft, message: string) {
    await this.user();
    const changes = makeChanges(draft.base, draft.content);
    if (!changes.length) throw new Error('게시할 변경사항이 없어요.');
    const head = await this.head();
    this.checkConflicts(draft.base, head.entries, changes);
    const entries = [];
    for (const change of changes) {
      if (!editablePaths.has(change.path)) throw new Error('이 파일은 편집할 수 없어요.');
      if (change.encoding === 'base64') validatePng(change.content);
      const blob = await this.api<{ sha: string }>(`/repos/${REPOSITORY}/git/blobs`, 'POST', { content: change.content, encoding: change.encoding });
      entries.push({ path: change.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const tree = await this.api<{ sha: string }>(`/repos/${REPOSITORY}/git/trees`, 'POST', { base_tree: head.treeSha, tree: entries });
    const identity = { name: ACCOUNT, email: AUTHOR_EMAIL };
    const commit = await this.api<{ sha: string; html_url: string }>(`/repos/${REPOSITORY}/git/commits`, 'POST', { message: message.trim() || 'content: 포트폴리오 콘텐츠 업데이트', tree: tree.sha, parents: [head.commitSha], author: identity, committer: identity });
    // A concurrent main update is rejected by GitHub; never force a branch update.
    await this.api(`/repos/${REPOSITORY}/git/refs/heads/main`, 'PATCH', { sha: commit.sha, force: false });
    // Publishing has succeeded at this point. Do not report it as failed if a
    // subsequent read is unavailable, which could invite a duplicate publish.
    const files = { ...draft.base.files };
    for (const entry of entries) {
      const change = changes.find(item => item.path === entry.path)!;
      if (change.encoding === 'utf-8') files[change.path] = { sha: entry.sha, content: change.content };
    }
    const snapshot: Snapshot = { ...draft.base, commitSha: commit.sha, treeSha: tree.sha, files, profileSha: entries.find(entry => entry.path === 'images/profile.png')?.sha ?? draft.base.profileSha, loadedAt: new Date().toISOString() };
    return { sha: commit.sha, url: commit.html_url, snapshot };
  }

  private checkConflicts(base: Snapshot, entries: TreeEntry[], changes: Change[]) {
    for (const change of changes) {
      const current = entries.find(entry => entry.path === change.path);
      const originalSha = change.path === 'images/profile.png' ? base.profileSha : base.files[change.path]?.sha ?? null;
      if ((current?.sha ?? null) !== originalSha) throw new Error(`${change.label} 내용이 다른 곳에서 수정됐어요. 초안은 보관돼 있어요. 최신 내용을 확인해 주세요.`);
    }
  }

  async deployment(sha: string): Promise<Deployment | null> {
    const runs = await this.api<{ workflow_runs: { status: string; conclusion: string | null; html_url: string; head_sha: string; name: string }[] }>(`/repos/${REPOSITORY}/actions/runs?head_sha=${sha}&per_page=20`);
    const run = runs.workflow_runs.find(run => run.name === 'Deploy to GitHub Pages');
    return run ? { status: run.status, conclusion: run.conclusion, url: run.html_url, sha: run.head_sha } : null;
  }

  async profileImage(sha: string) {
    const blob = await this.api<{ content: string }>(`/repos/${REPOSITORY}/git/blobs/${sha}`);
    const encoded = blob.content.replace(/\s/g, ''); validatePng(encoded);
    return `data:image/png;base64,${encoded}`;
  }
}

export function validatePng(base64: string): Buffer {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw new Error('PNG 파일을 다시 선택해 주세요.');
  const data = Buffer.from(base64, 'base64');
  if (data.length > 5 * 1024 * 1024 || !data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('5MB 이하의 PNG 사진을 선택해 주세요.');
  return data;
}
