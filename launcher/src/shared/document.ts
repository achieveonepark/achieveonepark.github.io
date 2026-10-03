import { z } from 'zod';
import { marked, Renderer } from 'marked';
import { COMPANIES, contentSchema, type Content, type Locale } from './model';

export const documentOptionsSchema = z.object({
  kind: z.enum(['resume', 'career']), locale: z.enum(['ko', 'en']),
  name: z.string().max(100), role: z.string().max(200), title: z.string().max(200),
  email: z.string().max(200), phone: z.string().max(100), location: z.string().max(200),
  summary: z.string().max(4000), education: z.string().max(4000),
  companies: z.array(z.enum(COMPANIES)).max(5), projects: z.array(z.string().max(300)).max(60),
  includePhoto: z.boolean(), accent: z.enum(['navy', 'forest', 'charcoal']),
});
export type DocumentOptions = z.infer<typeof documentOptionsSchema>;
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
export const plainText = (source: string) => source.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<[^>]*>/g, '').replace(/[*_`]/g, '').replace(/^#{1,6}\s+/gm, '').trim();

export function defaultDocumentOptions(content: Content, locale: Locale): DocumentOptions {
  const selected = content.languages[locale];
  return { kind: 'resume', locale, name: selected.profile.name, role: selected.profile.career, title: locale === 'ko' ? '이력서' : 'Resume', email: selected.links.items.find(item => item.label === 'Email')?.value || '', phone: '', location: '', summary: plainText(selected.profile.body.split(/\n\s*\n/)[0] || ''), education: '', companies: [...COMPANIES], projects: selected.projects.map(project => project.id), includePhoto: false, accent: 'navy' };
}

function compactHighlights(source: string, maximum = 3): string[] {
  const lines = source.split(/\r?\n/);
  let section = '';
  const bullets: { section: string; text: string }[] = [];
  for (const line of lines) {
    if (/^#{1,6}\s/.test(line)) section = plainText(line);
    if (!/^-\s+/.test(line) || /technology stack|기술 스택/i.test(section)) continue;
    const text = plainText(line.replace(/^-\s+/, ''));
    if (!text || /^(https?:\/\/|\||(?:Video|영상|Period|기간|분야|Field):)/i.test(text)) continue;
    bullets.push({ section, text });
  }
  const chosen: typeof bullets = [];
  for (const bullet of bullets) if (!chosen.some(item => item.section === bullet.section)) chosen.push(bullet);
  for (const bullet of bullets) if (!chosen.includes(bullet)) chosen.push(bullet);
  if (chosen.length) return chosen.slice(0, maximum).map(item => item.text);
  return source.split(/\n\s*\n/).filter(block => !/^#/.test(block.trim())).map(plainText).filter(Boolean).slice(0, 1);
}

// Render only text, headings, lists and tables. Raw HTML and embedded media from
// content never become executable HTML in the document window.
export function bodyHtml(source: string) {
  // The existing portfolio includes a GFM table wrapped in a list item.
  // Normalize only those rows so the table keeps its columns in print.
  const normalized = source.replace(/\r\n?/g, '\n').replace(/^\s*-\s+(\|.+)$/gm, '\n$1').replace(/^ +(?=\|)/gm, '');
  const renderer = new Renderer();
  renderer.html = ({ text }) => escape(text);
  renderer.image = () => '';
  renderer.link = function ({ tokens }) { return this.parser.parseInline(tokens); };
  renderer.heading = function ({ tokens, depth }) {
    const level = Math.min(depth + 2, 6);
    return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>`;
  };
  return marked.parse(normalized, { renderer, async: false, gfm: true });
}

export const documentCss = `
@page { size: A4; margin: 17mm 17mm 19mm; }
.doc-root { --doc-accent:#173c5c; font-family:'Malgun Gothic','맑은 고딕','Segoe UI',sans-serif; font-size:10pt; line-height:1.65; color:#253442; background:#fff; overflow-wrap:anywhere; }
.doc-root.accent-forest { --doc-accent:#245146; }.doc-root.accent-charcoal { --doc-accent:#2d3038; }
.doc-root * { box-sizing:border-box; }.doc-root p { margin:0 0 8pt; orphans:3; widows:3; }
.doc-masthead { border-top:5pt solid var(--doc-accent); padding-top:22pt; padding-bottom:17pt; border-bottom:1px solid #d7dee3; display:flex; align-items:flex-start; gap:22pt; margin-bottom:21pt; }
.doc-identity { flex:1; min-width:0; }.doc-kicker { color:var(--doc-accent); font-size:8pt; letter-spacing:2pt; text-transform:uppercase; font-weight:700; margin-bottom:10pt; }
.doc-root h1 { color:#132a3c; font-size:30pt; line-height:1.2; letter-spacing:-1pt; margin:0 0 10pt; }.doc-role { font-size:12pt; color:var(--doc-accent); font-weight:600; margin-bottom:12pt; }
.doc-contact { display:flex; flex-wrap:wrap; gap:3pt 13pt; color:#63707b; font-size:8.5pt; line-height:1.65; }.doc-photo { width:70pt; height:88pt; object-fit:cover; object-position:top; border-radius:4pt; }
.doc-section { margin-bottom:23pt; }.doc-root h2 { color:var(--doc-accent); font-size:10pt; margin:0 0 12pt; padding-bottom:6pt; border-bottom:1px solid #dde4e9; letter-spacing:1pt; break-after:avoid; }
.doc-root h3 { color:#20384b; font-size:11pt; line-height:1.4; margin:15pt 0 7pt; break-after:avoid; }.doc-root h4 { font-size:11pt; margin:0 0 3pt; color:#20384b; }
.doc-summary { font-size:10.5pt; line-height:1.85; white-space:pre-line; }.doc-skills { display:grid; grid-template-columns:1fr 1fr; gap:7pt 22pt; }.doc-skill-label { font-size:8pt; color:#687985; text-transform:uppercase; margin-bottom:2pt; }.doc-skill-values { font-weight:600; color:#20384b; font-size:9pt; }
.doc-timeline-item { padding:0 0 15pt; break-inside:avoid; }.doc-item-heading { display:flex; justify-content:space-between; align-items:baseline; gap:15pt; margin-bottom:4pt; }.doc-period { font-size:8pt; color:#63707b; white-space:nowrap; }.doc-tech { font-size:8.5pt; color:#687985; margin:5pt 0 7pt; }.doc-root ul,.doc-root ol { padding-left:15pt; margin:6pt 0 9pt; }.doc-root li { margin-bottom:4pt; orphans:3; widows:3; }.doc-root li::marker { color:var(--doc-accent); }
.doc-company-page { break-before:page; }.doc-company-section { margin-top:24pt; }.doc-company-compact { break-inside:avoid; }.doc-company-header { border-top:4pt solid var(--doc-accent); padding-top:15pt; margin-bottom:18pt; break-inside:avoid; break-after:avoid; }.doc-company-header h2 { font-size:21pt; letter-spacing:-.5pt; border:0; margin:0 0 8pt; padding:0; }.doc-company-body { font-size:10pt; }.doc-company-body h4,.doc-company-body h5,.doc-company-body h6 { margin:12pt 0 6pt; break-after:avoid; }.doc-company-body h5,.doc-company-body h6 { font-size:10pt; color:#3a5263; }.doc-root table { width:100%; border-collapse:collapse; font-size:8.5pt; margin:10pt 0 14pt; }.doc-root th,.doc-root td { text-align:left; padding:7pt; border-bottom:1px solid #dce2e7; vertical-align:top; }.doc-root th { background:#f0f4f7; color:var(--doc-accent); }.doc-root tr { break-inside:avoid; }.doc-root thead { display:table-header-group; }.doc-root pre { white-space:pre-wrap; font-family:Consolas,monospace; font-size:9pt; background:#f4f6f8; padding:7pt; }.doc-root blockquote { margin:8pt 0; padding-left:12pt; border-left:2pt solid #dce2e7; }.doc-overview { display:grid; grid-template-columns:1fr auto; gap:7pt 14pt; }.doc-overview-name { font-weight:600; }.doc-overview-period { color:#63707b; font-size:9pt; }.doc-education { white-space:pre-line; }.doc-project-item { margin-bottom:14pt; break-inside:avoid; }.doc-project-note { color:#5d6d78; font-size:9pt; }.doc-links { color:#63707b; font-size:8pt; line-height:1.8; overflow-wrap:anywhere; }
`;

export function documentBody(rawContent: Content, rawOptions: DocumentOptions, imageData?: string) {
  const content = contentSchema.parse(rawContent);
  const options = documentOptionsSchema.parse(rawOptions);
  const selected = content.languages[options.locale];
  const ko = options.locale === 'ko';
  const label = { summary: ko ? '소개 / 핵심 역량' : 'PROFILE', skills: ko ? '기술 역량' : 'TECHNICAL SKILLS', experience: ko ? '경력' : 'EXPERIENCE', projects: ko ? '주요 프로젝트' : 'SELECTED PROJECTS', education: ko ? '학력 / 자격' : 'EDUCATION / QUALIFICATIONS', contact: ko ? '포트폴리오 / 링크' : 'PORTFOLIO / LINKS' };
  const companies = [...new Set(options.companies)].map(id => selected.companies[id]);
  const projects = selected.projects.filter(project => options.projects.includes(project.id));
  const contacts = [options.email, options.phone, options.location].filter(Boolean);
  const safePhoto = imageData && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(imageData);
  const skills = `<section class="doc-section"><h2>${label.skills}</h2><div class="doc-skills">${content.techStack.map(group => `<div><div class="doc-skill-label">${escape(group.key)}</div><div class="doc-skill-values">${escape(group.values.filter(Boolean).join(' / '))}</div></div>`).join('')}</div></section>`;
  const resumeExperience = `<section class="doc-section"><h2>${label.experience}</h2>${companies.map(company => `<article class="doc-timeline-item"><div class="doc-item-heading"><h4>${escape(company.title)}</h4><span class="doc-period">${escape(company.period)}</span></div><div class="doc-tech">${escape(company.technologies)}</div><ul>${compactHighlights(company.body, 2).map(item => `<li>${escape(item)}</li>`).join('')}</ul></article>`).join('')}</section>`;
  const overview = `<section class="doc-section"><h2>${label.experience}</h2><div class="doc-overview">${companies.map(company => `<div class="doc-overview-name">${escape(company.title)}</div><div class="doc-overview-period">${escape(company.period)}</div>`).join('')}</div></section>`;
  const projectSection = projects.length ? `<section class="doc-section"><h2>${label.projects}</h2>${projects.map(project => `<article class="doc-project-item"><div class="doc-item-heading"><h4>${escape(project.title)}</h4><span class="doc-period">${escape(project.period)}</span></div>${project.technologies ? `<p class="doc-tech">${escape(project.technologies)}</p>` : ''}${compactHighlights(project.body, 2).map(item => `<p class="doc-project-note">${escape(item)}</p>`).join('')}${project.video ? `<p class="doc-links">${escape(project.video)}</p>` : ''}</article>`).join('')}</section>` : '';
  const links = selected.links.items.filter(item => item.label !== 'Email').map(item => `${escape(item.label)}: ${escape(item.value)}`).join('<br>');
  return `<article class="doc-root accent-${options.accent}"><header class="doc-masthead"><div class="doc-identity"><div class="doc-kicker">${escape(options.title)}</div><h1>${escape(options.name)}</h1><div class="doc-role">${escape(options.role)}</div><div class="doc-contact">${contacts.map(contact => `<span>${escape(contact)}</span>`).join('')}</div></div>${options.includePhoto && safePhoto ? `<img class="doc-photo" src="${imageData}" alt="" />` : ''}</header>${options.summary ? `<section class="doc-section"><h2>${label.summary}</h2><p class="doc-summary">${escape(options.summary)}</p></section>` : ''}${skills}${companies.length ? (options.kind === 'resume' ? resumeExperience : overview) : ''}${options.education ? `<section class="doc-section"><h2>${label.education}</h2><p class="doc-education">${escape(options.education)}</p></section>` : ''}${options.kind === 'resume' ? projectSection : ''}${links ? `<section class="doc-section"><h2>${label.contact}</h2><div class="doc-links">${links}</div></section>` : ''}${options.kind === 'career' ? companies.map((company, index) => `<section class="doc-company-section ${index === 0 ? 'doc-company-page' : ''} ${company.body.length < 1400 ? 'doc-company-compact' : ''}"><header class="doc-company-header"><div class="doc-kicker">${ko ? '상세 경력' : 'PROFESSIONAL EXPERIENCE'}</div><h2>${escape(company.title)}</h2><div class="doc-contact"><span>${escape(company.period)}</span>${company.website ? `<span>${escape(company.website)}</span>` : ''}</div><p class="doc-tech">${escape(company.technologies)}</p></header><div class="doc-company-body">${bodyHtml(company.body)}</div></section>`).join('') + projectSection : ''}</article>`;
}

export function documentHtml(content: Content, options: DocumentOptions, imageData?: string) {
  return `<!DOCTYPE html><html lang="${options.locale}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><title>${escape(options.name)} ${escape(options.title)}</title><style>body{margin:0;background:white} ${documentCss}</style></head><body>${documentBody(content, options, imageData)}</body></html>`;
}
