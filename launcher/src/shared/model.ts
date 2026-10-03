import { z } from 'zod';
import type { DocumentOptions } from './document';

export const REPOSITORY = 'achieveonepark/achieveonepark.github.io';
export const ACCOUNT = 'achieveonepark';
export const AUTHOR_EMAIL = 'park_achieveone@naver.com';
export const SITE_URL = 'https://www.somiri.dev/';
export const COMPANIES = ['111percent', 'snowpipe', 'gridinc', 'snowballs', 'dalcomsoft'] as const;
export const LOCALES = ['ko', 'en'] as const;
export type Locale = typeof LOCALES[number];
export type Company = typeof COMPANIES[number];
const text = z.string().max(200_000);
const title = z.string().max(300).refine(value => !/[\r\n]/.test(value), '한 줄로 입력해 주세요.');
const url = z.string().max(2000).refine(value => !value || /^https:\/\//i.test(value), 'https 주소를 입력해 주세요.');
const profileSchema = z.object({ title, subtitle: title, name: title, career: title, body: text });
const companySchema = z.object({ title, period: title, website: url, technologies: title, body: text });
const projectSchema = z.object({ id: title, title, period: title, technologies: title, video: url, body: text });
const linksSchema = z.object({ title, items: z.array(z.object({ label: title, value: title })).max(30) });
const localizedSchema = z.object({
  profile: profileSchema,
  experienceTitle: title,
  companies: z.object({ '111percent': companySchema, snowpipe: companySchema, gridinc: companySchema, snowballs: companySchema, dalcomsoft: companySchema }),
  projectsTitle: title,
  projects: z.array(projectSchema).max(60),
  links: linksSchema,
  skillsTitle: title,
});
export const contentSchema = z.object({
  branding: z.object({ name: title, role: title }),
  techStack: z.array(z.object({ key: title, values: z.array(title).max(30) })).max(20),
  languages: z.object({ ko: localizedSchema, en: localizedSchema }),
  profileImage: z.string().max(7_000_000).nullable(),
});
export type Content = z.infer<typeof contentSchema>;
export type Profile = Content['languages']['en']['profile'];
export type Project = Content['languages']['en']['projects'][number];
export type CompanyContent = Content['languages']['en']['companies'][Company];
export type FileRecord = { sha: string; content: string };
export type Snapshot = { commitSha: string; treeSha: string; files: Record<string, FileRecord>; profileSha: string | null; loadedAt: string };
export type Draft = { version: 1; base: Snapshot; content: Content; savedAt: string };
export type User = { login: string; name: string; avatar: string };
export type Deployment = { status: string; conclusion: string | null; url: string; sha: string };
export type State = { user: User | null; snapshot: Snapshot | null; draft: Draft | null; lastPublished: string | null };
export type Change = { path: string; content: string; encoding: 'utf-8' | 'base64'; label: string };
export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: string };
export type StudioApi = {
  state: () => Promise<ApiResult<State>>;
  login: () => Promise<ApiResult<State>>;
  logout: () => Promise<ApiResult<void>>;
  refresh: () => Promise<ApiResult<State>>;
  saveDraft: (draft: Draft) => Promise<ApiResult<string>>;
  discardDraft: () => Promise<ApiResult<void>>;
  publish: (draft: Draft, message: string) => Promise<ApiResult<{ sha: string; url: string; snapshot: Snapshot }>>;
  deployment: (sha: string) => Promise<ApiResult<Deployment | null>>;
  chooseImage: () => Promise<ApiResult<string | null>>;
  profileImage: () => Promise<ApiResult<string | null>>;
  openSite: () => Promise<ApiResult<void>>;
  openDeployment: (sha: string) => Promise<ApiResult<void>>;
  onCloseRequested: (callback: () => void) => () => void;
  close: () => Promise<ApiResult<void>>;
  documentSettings: (locale: Locale) => Promise<ApiResult<DocumentOptions | null>>;
  saveDocumentSettings: (options: DocumentOptions) => Promise<ApiResult<void>>;
  exportDocument: (content: Content, options: DocumentOptions) => Promise<ApiResult<string | null>>;
  revealDocument: () => Promise<ApiResult<void>>;
};

export const documentPath = (locale: Locale, file: string) => `public/parkachieveone/${locale === 'ko' ? 'translations/ko/' : ''}portfolio/${file}.md`;
export const editableTextPaths = LOCALES.flatMap(locale => ['about', 'experience', 'projects', 'links', 'skills', ...COMPANIES.map(company => `experience/${company}`)].map(file => documentPath(locale, file))).concat('src/content/site.json');
export const editablePaths = new Set([...editableTextPaths, 'images/profile.png']);
const normalize = (value: string) => value.replace(/\r\n?|\n/g, '\n');
const heading = (source: string, fallback: string) => /^#\s+(.+)$/m.exec(normalize(source))?.[1]?.trim() || fallback;
const get = (snapshot: Snapshot, locale: Locale, file: string) => normalize(snapshot.files[documentPath(locale, file)]?.content ?? '');
const field = (source: string, labels: string[]) => new RegExp(`^-\\s+(?:${labels.join('|')}):\\s*(.*)$`, 'm').exec(source)?.[1]?.trim() ?? '';
const dropFields = (source: string, labels: string[]) => source.replace(new RegExp(`^-\\s+(?:${labels.join('|')}):[^\\n]*\\n?`, 'gm'), '').trim();
const bodyAfterHeading = (source: string) => source.replace(/^#\s+[^\n]*\n?/, '').trim();

export function parseContent(snapshot: Snapshot): Content {
  let site = { branding: { name: 'Park Achieveone', role: 'Unity Game Developer' }, techStack: [
    { key: 'engine', values: ['Unity'] }, { key: 'language', values: ['C#', '.NET'] },
    { key: 'platforms', values: ['Steam', 'WebGL', 'Android', 'iOS'] }, { key: 'services', values: ['Firebase'] },
  ] };
  if (snapshot.files['src/content/site.json']) site = JSON.parse(snapshot.files['src/content/site.json'].content);
  const languages = Object.fromEntries(LOCALES.map(locale => {
    const about = get(snapshot, locale, 'about');
    const profileBody = bodyAfterHeading(about).replace(/^##\s+[^\n]*\n?/, '').trim();
    const companyEntries = COMPANIES.map(company => {
      const source = get(snapshot, locale, `experience/${company}`);
      return [company, { title: heading(source, company), period: field(source, ['Period', '기간']), website: field(source, ['Website', '링크']), technologies: field(source, ['Technologies', '기술']), body: dropFields(bodyAfterHeading(source), ['Period', '기간', 'Website', '링크', 'Technologies', '기술']) }];
    });
    const projects = get(snapshot, locale, 'projects');
    const projectEntries = projects.split(/^##\s+/m).slice(1).map((block, index) => {
      const [projectTitle, ...lines] = block.split('\n');
      const body = lines.join('\n');
      return { id: `project-${index}`, title: projectTitle.trim(), period: field(body, ['Period', '기간']), technologies: field(body, ['Technologies', '기술']), video: field(body, ['Video', '영상']), body: dropFields(body, ['Period', '기간', 'Technologies', '기술', 'Video', '영상']) };
    });
    const links = get(snapshot, locale, 'links');
    return [locale, {
      profile: { title: heading(about, 'About Me'), subtitle: /^##\s+(.+)$/m.exec(about)?.[1]?.trim() || 'Profile', name: field(about, ['Name', '이름']), career: field(about, ['Experience', '경력']), body: dropFields(profileBody, ['Name', '이름', 'Experience', '경력']) },
      experienceTitle: heading(get(snapshot, locale, 'experience'), 'Professional Experience'),
      companies: Object.fromEntries(companyEntries),
      projectsTitle: heading(projects, 'Projects'), projects: projectEntries,
      links: { title: heading(links, 'Links'), items: links.split('\n').flatMap(line => { const match = /^-\s+([^:]+):\s*(.+)$/.exec(line); return match ? [{ label: match[1].trim(), value: match[2].trim() }] : []; }) },
      skillsTitle: heading(get(snapshot, locale, 'skills'), 'Tech Stack'),
    }];
  }));
  return contentSchema.parse({ ...site, languages, profileImage: null });
}

const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const finish = (value: string) => `${value.trim()}\n`;
export function makeChanges(snapshot: Snapshot, rawContent: Content): Change[] {
  const content = contentSchema.parse(rawContent);
  const original = parseContent(snapshot);
  const changes: Change[] = [];
  const add = (path: string, source: string, label: string) => {
    if (normalize(snapshot.files[path]?.content ?? '') !== source) changes.push({ path, content: source, encoding: 'utf-8', label });
  };
  if (!same(content.branding, original.branding) || !same(content.techStack, original.techStack)) {
    add('src/content/site.json', `${JSON.stringify({ branding: content.branding, techStack: content.techStack }, null, 2)}\n`, '공통 · 이름 / 기술 스택');
  }
  for (const locale of LOCALES) {
    const current = content.languages[locale];
    const before = original.languages[locale];
    const ko = locale === 'ko';
    const prefix = ko ? '한글' : '영문';
    if (!same(current.profile, before.profile)) {
      const p = current.profile;
      add(documentPath(locale, 'about'), finish(`# ${p.title}\n\n## ${p.subtitle}\n\n- ${ko ? '이름' : 'Name'}: ${p.name}\n- ${ko ? '경력' : 'Experience'}: ${p.career}\n\n${p.body}`), `${prefix} · 소개`);
    }
    if (current.experienceTitle !== before.experienceTitle) {
      add(documentPath(locale, 'experience'), get(snapshot, locale, 'experience').replace(/^#\s+[^\n]*/m, `# ${current.experienceTitle}`), `${prefix} · 경력 제목`);
    }
    for (const company of COMPANIES) {
      const c = current.companies[company];
      if (same(c, before.companies[company])) continue;
      add(documentPath(locale, `experience/${company}`), finish(`# ${c.title}\n\n${c.period ? `- ${ko ? '기간' : 'Period'}: ${c.period}\n` : ''}${c.website ? `- ${ko ? '링크' : 'Website'}: ${c.website}\n` : ''}${c.technologies ? `- ${ko ? '기술' : 'Technologies'}: ${c.technologies}\n` : ''}\n${c.body}`), `${prefix} · ${c.title}`);
    }
    if (current.projectsTitle !== before.projectsTitle || !same(current.projects, before.projects)) {
      const sections = current.projects.map(p => {
        if (!p.title.trim()) throw new Error('프로젝트 이름을 입력해 주세요.');
        let video: URL;
        try { video = new URL(p.video); } catch { throw new Error(`${p.title}: YouTube 영상 주소를 입력해 주세요.`); }
        if (!['www.youtube.com', 'youtube.com', 'youtu.be'].includes(video.hostname)) throw new Error(`${p.title}: YouTube 주소만 사용할 수 있어요.`);
        return `## ${p.title}\n\n${p.period ? `- ${ko ? '기간' : 'Period'}: ${p.period}\n` : ''}${p.technologies ? `- ${ko ? '기술' : 'Technologies'}: ${p.technologies}\n` : ''}- ${ko ? '영상' : 'Video'}: ${p.video}\n${p.body ? `\n${p.body}\n` : ''}`;
      });
      add(documentPath(locale, 'projects'), finish(`# ${current.projectsTitle}\n\n${sections.join('\n')}`), `${prefix} · 프로젝트`);
    }
    if (!same(current.links, before.links)) {
      const labels = new Set<string>();
      for (const item of current.links.items) {
        if (!item.label.trim() || labels.has(item.label) || /:/.test(item.label)) throw new Error('링크 이름은 비어 있거나 중복될 수 없어요.');
        labels.add(item.label);
        if (item.label === 'Email' ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.value) : !/^https:\/\//.test(item.value)) throw new Error(`${item.label}: 올바른 이메일 또는 https 주소를 입력해 주세요.`);
      }
      add(documentPath(locale, 'links'), finish(`# ${current.links.title}\n\n${current.links.items.map(item => `- ${item.label}: ${item.value}`).join('\n')}`), `${prefix} · 링크`);
    }
    if (current.skillsTitle !== before.skillsTitle || !same(content.techStack, original.techStack)) {
      add(documentPath(locale, 'skills'), finish(`# ${current.skillsTitle}\n\n${content.techStack.flatMap(group => group.values).map(value => `- ${value}`).join('\n')}`), `${prefix} · 기술 스택`);
    }
  }
  if (content.profileImage) changes.push({ path: 'images/profile.png', content: content.profileImage, encoding: 'base64', label: '프로필 사진' });
  return changes;
}

export function validateDraft(value: unknown): Draft {
  const fileSchema = z.object({ sha: z.string().regex(/^[a-f0-9]{40}$/), content: text });
  const snapshotSchema = z.object({ commitSha: z.string().regex(/^[a-f0-9]{40}$/), treeSha: z.string().regex(/^[a-f0-9]{40}$/), files: z.record(z.string(), fileSchema), profileSha: z.string().regex(/^[a-f0-9]{40}$/).nullable(), loadedAt: z.string() });
  const draft = z.object({ version: z.literal(1), base: snapshotSchema, content: contentSchema, savedAt: z.string() }).parse(value);
  for (const path of Object.keys(draft.base.files)) if (!editableTextPaths.includes(path)) throw new Error('편집할 수 없는 파일이 포함되어 있어요.');
  return draft;
}

export function mergeContent(base: Content, local: Content, remote: Content, prefer: 'local' | 'remote' = 'local') {
  const conflicts: string[] = [];
  const merge = (before: unknown, ours: unknown, theirs: unknown, key: string): unknown => {
    if (same(ours, before)) return theirs;
    if (same(theirs, before) || same(ours, theirs)) return ours;
    if (before && ours && theirs && typeof before === 'object' && typeof ours === 'object' && typeof theirs === 'object' && !Array.isArray(before) && !Array.isArray(ours) && !Array.isArray(theirs)) {
      return Object.fromEntries(Object.keys(ours).map(field => [field, merge((before as Record<string, unknown>)[field], (ours as Record<string, unknown>)[field], (theirs as Record<string, unknown>)[field], `${key}.${field}`)]));
    }
    conflicts.push(key);
    return prefer === 'local' ? ours : theirs;
  };
  return { content: contentSchema.parse(merge(base, local, remote, 'content')), conflicts };
}
