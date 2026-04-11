import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { ArrowUpRight, Monitor, Github, Mail, BookOpen, Code, Menu, X } from 'lucide-react';
import { PARK_FILES_MANIFEST_PATH, PARK_ROOT_PUBLIC_PATH } from '../constants';
import profileImage from '../../images/profile.png';

// ============================================================================
// Types
// ============================================================================

type ManifestFile = { path: string; thumbnail?: string };
type ManifestResponse = { files: ManifestFile[] };

interface LoadedSection {
    path: string;      // portfolio/experience.md
    rel: string;       // experience.md (relative to portfolio/)
    slug: string;      // anchor id
    title: string;     // from first H1 or filename
    markdown: string;
}

interface PortfolioSiteProps {
    onEnterOS: () => void;
}

// ============================================================================
// Priority / ordering
// ============================================================================

const SECTION_PRIORITY: string[] = [
    'about.md',
    'experience.md',
    'experience/111percent.md',
    'experience/snowpipe.md',
    'experience/gridinc.md',
    'experience/snowballs.md',
    'experience/dalcomsoft.md',
    'projects.md',
    'skills.md',
    'links.md',
    'portfolio_full.md', // shown collapsed at the bottom
];

const EXCLUDED_SECTIONS: string[] = ['career_resume.md'];

const DEFAULT_COLLAPSED: string[] = ['portfolio_full.md'];
const DESKTOP_TOC_TOP_OFFSET = 96;
const SECTION_SPY_OFFSET_DESKTOP = 136;
const SECTION_SPY_OFFSET_MOBILE = 108;

// ============================================================================
// Utilities
// ============================================================================

const slugify = (value: string): string =>
    value
        .toLowerCase()
        .replace(/\.md$/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const titleCaseFromRel = (rel: string): string => {
    const name = rel.replace(/^.*\//, '').replace(/\.md$/, '');
    return name
        .split(/[-_]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const extractFirstHeading = (md: string): string | null => {
    const lines = md.split('\n');
    for (const line of lines) {
        const m = line.match(/^\s*#\s+(.+?)\s*$/);
        if (m) return m[1].trim();
    }
    return null;
};

// Resolve a relative path referenced from a markdown file.
// e.g. entry rel="experience.md", link="./experience/111percent.md" -> "experience/111percent.md"
const resolveRelative = (fromRel: string, href: string): string => {
    if (/^https?:\/\//i.test(href) || href.startsWith('mailto:')) return href;
    const fromDir = fromRel.includes('/') ? fromRel.replace(/\/[^/]*$/, '') : '';
    const cleaned = href.replace(/^\.\//, '');
    if (cleaned.startsWith('/')) return cleaned.replace(/^\/+/, '');
    return fromDir ? `${fromDir}/${cleaned}` : cleaned;
};

// ============================================================================
// Markdown renderer (lightweight, purpose-built for portfolio MDs)
// ============================================================================

// Inline parsing: bold, inline code, links — returns a React fragment.
const renderInline = (
    text: string,
    ctx: { sectionRel: string; pathToSlug: Map<string, string>; keyPrefix: string },
): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    // Tokenize: we walk the string and handle one pattern at a time.
    const regex = /(\*\*[^*]+\*\*)|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(https?:\/\/[^\s)]+)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let k = 0;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }
        const token = match[0];
        const key = `${ctx.keyPrefix}-i${k++}`;

        if (token.startsWith('**')) {
            nodes.push(
                <strong key={key} className="text-white font-semibold">
                    {token.slice(2, -2)}
                </strong>,
            );
        } else if (token.startsWith('`')) {
            nodes.push(
                <code
                    key={key}
                    className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-300 text-[0.9em] font-mono"
                >
                    {token.slice(1, -1)}
                </code>,
            );
        } else if (token.startsWith('[')) {
            const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
                const [, label, rawHref] = linkMatch;
                const href = rawHref.trim();
                // Internal md link -> anchor within page
                if (/\.md(#.*)?$/i.test(href) && !/^https?:\/\//i.test(href)) {
                    const resolved = resolveRelative(ctx.sectionRel, href.replace(/#.*$/, ''));
                    const fullPath = `portfolio/${resolved}`;
                    const slug = ctx.pathToSlug.get(fullPath);
                    if (slug) {
                        nodes.push(
                            <a
                                key={key}
                                href={`#${slug}`}
                                className="text-cyan-300 underline decoration-cyan-400/40 underline-offset-4 hover:decoration-cyan-300 transition"
                            >
                                {label}
                            </a>,
                        );
                        continue;
                    }
                }
                nodes.push(
                    <a
                        key={key}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-300 underline decoration-cyan-400/40 underline-offset-4 hover:decoration-cyan-300 transition inline-flex items-center gap-0.5"
                    >
                        {label}
                        <ArrowUpRight size={12} className="opacity-70" />
                    </a>,
                );
            } else {
                nodes.push(token);
            }
        } else if (token.startsWith('http')) {
            // Bare URL
            nodes.push(
                <a
                    key={key}
                    href={token}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-300 underline decoration-cyan-400/40 underline-offset-4 hover:decoration-cyan-300 transition"
                >
                    {token}
                </a>,
            );
        }

        lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
    }

    return nodes;
};

// Detect a YouTube URL and return an embeddable src.
const toYoutubeEmbed = (url: string): string | null => {
    // Already embed form
    const embedMatch = url.match(/youtube\.com\/embed\/([\w-]+)/);
    if (embedMatch) return `https://www.youtube.com/embed/${embedMatch[1]}`;
    const watchMatch = url.match(/youtube\.com\/watch\?v=([\w-]+)/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
    const shortMatch = url.match(/youtu\.be\/([\w-]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
    return null;
};

const isVideoPath = (href: string): boolean => /\.(mp4|webm|ogg)$/i.test(href);
const isImagePath = (href: string): boolean => /\.(png|jpe?g|gif|webp|svg)$/i.test(href);

const resolveMediaUrl = (sectionRel: string, href: string): string => {
    if (/^https?:\/\//i.test(href)) return href;
    const resolved = resolveRelative(sectionRel, href);
    return `${PARK_ROOT_PUBLIC_PATH}/portfolio/${resolved}`;
};

interface RenderContext {
    sectionRel: string;
    pathToSlug: Map<string, string>;
}

interface AboutSectionContent {
    title: string;
    subtitle: string | null;
    details: Array<{ label: string; value: string }>;
    greeting: string | null;
    paragraphs: string[];
}

const parseAboutDetail = (line: string): { label: string; value: string } => {
    const cleaned = line.replace(/^\s*-\s+/, '').trim();
    const separatorIndex = cleaned.indexOf(':');
    if (separatorIndex === -1) {
        return { label: '', value: cleaned };
    }

    return {
        label: cleaned.slice(0, separatorIndex).trim(),
        value: cleaned.slice(separatorIndex + 1).trim(),
    };
};

const parseAboutSection = (md: string): AboutSectionContent | null => {
    const lines = md.split('\n').map(line => line.trim());
    const title = lines.find(line => /^#\s+/.test(line))?.replace(/^#\s+/, '').trim() ?? '';
    const subtitle = lines.find(line => /^##\s+/.test(line))?.replace(/^##\s+/, '').trim() ?? null;
    const details = lines
        .filter(line => /^\s*-\s+/.test(line))
        .map(parseAboutDetail)
        .filter(detail => detail.value.length > 0);
    const contentLines = lines.filter(line => line.length > 0 && !/^#{1,4}\s+/.test(line) && !/^\s*-\s+/.test(line));

    if (title.length === 0 && details.length === 0 && contentLines.length === 0) {
        return null;
    }

    const [greeting, ...paragraphs] = contentLines;

    return {
        title: title || 'About',
        subtitle,
        details,
        greeting: greeting ?? null,
        paragraphs,
    };
};

const renderAboutSection = (md: string, ctx: RenderContext): React.ReactNode => {
    const about = parseAboutSection(md);
    if (!about) return renderMarkdown(md, ctx);

    const [nameDetail, careerDetail, ...extraDetails] = about.details;
    const name = nameDetail?.value || about.title;
    const career = careerDetail?.value || '';
    const details = [nameDetail, careerDetail, ...extraDetails].filter(
        (detail): detail is { label: string; value: string } => Boolean(detail?.value),
    );
    const paragraphs = about.paragraphs.filter(Boolean);

    return (
        <>
            <h2 className="text-2xl md:text-3xl font-bold text-white mt-0 mb-6 tracking-tight">
                {renderInline(about.title, { ...ctx, keyPrefix: 'about-title' })}
            </h2>

            <div className="relative mb-8 overflow-hidden rounded-[28px] border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(8,145,178,0.16),rgba(15,23,42,0.92)_48%,rgba(8,145,178,0.08))] p-6 md:p-8">
                <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.22),transparent_62%)]" />
                <div className="pointer-events-none absolute -left-12 top-12 h-32 w-32 rounded-full bg-cyan-400/18 blur-3xl" />

                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
                    <div className="relative mx-auto w-full max-w-[220px] shrink-0">
                        <div className="absolute inset-0 rounded-[30px] bg-cyan-300/15 blur-2xl" />
                        <div className="relative overflow-hidden rounded-[26px] border border-cyan-200/20 bg-black/55 shadow-[0_24px_60px_rgba(6,182,212,0.18)]">
                            <img
                                src={profileImage}
                                alt={`${name} profile`}
                                className="aspect-[4/5] w-full object-cover"
                                loading="eager"
                            />
                        </div>
                    </div>

                    <div className="relative flex-1">
                        <div className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">
                            {about.subtitle ?? 'Profile'}
                        </div>

                        <h3 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-white">{name}</h3>

                        {career && (
                            <p className="mt-2 text-lg font-semibold text-cyan-200/95">
                                {renderInline(career, { ...ctx, keyPrefix: 'about-career' })}
                            </p>
                        )}

                        {details.length > 0 && (
                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                {details.map((detail, index) => (
                                    <div
                                        key={`${detail.label}-${detail.value}-${index}`}
                                        className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 backdrop-blur-sm"
                                    >
                                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                                            {detail.label || 'Info'}
                                        </div>
                                        <div className="mt-2 text-base font-semibold text-white/90">
                                            {renderInline(detail.value, { ...ctx, keyPrefix: `about-detail-${index}` })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {about.greeting && (
                            <p className="mt-6 max-w-2xl text-base md:text-lg leading-relaxed text-white/78">
                                {renderInline(about.greeting, { ...ctx, keyPrefix: 'about-greeting' })}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {paragraphs.map((paragraph, index) => {
                    const isLastParagraph = index === paragraphs.length - 1;
                    return (
                        <div
                            key={`about-paragraph-${index}`}
                            className={`rounded-2xl border p-5 md:p-6 ${
                                isLastParagraph
                                    ? 'border-cyan-400/20 bg-cyan-400/[0.06]'
                                    : 'border-white/[0.08] bg-white/[0.025]'
                            }`}
                        >
                            <div className="mb-3 text-[10px] uppercase tracking-[0.18em] text-white/35">
                                {String(index + 1).padStart(2, '0')}
                            </div>
                            <p className={`text-base leading-8 ${isLastParagraph ? 'text-white/90' : 'text-white/72'}`}>
                                {renderInline(paragraph, { ...ctx, keyPrefix: `about-paragraph-${index}` })}
                            </p>
                        </div>
                    );
                })}
            </div>
        </>
    );
};

const renderMarkdown = (md: string, ctx: RenderContext): React.ReactNode => {
    const lines = md.split('\n');
    const out: React.ReactNode[] = [];
    let i = 0;
    let key = 0;
    const nextKey = () => `m${key++}`;

    while (i < lines.length) {
        const line = lines[i];

        // Blank
        if (line.trim() === '') {
            i++;
            continue;
        }

        // Headings
        const h1 = line.match(/^#\s+(.*)$/);
        const h2 = line.match(/^##\s+(.*)$/);
        const h3 = line.match(/^###\s+(.*)$/);
        const h4 = line.match(/^####\s+(.*)$/);
        if (h1) {
            out.push(
                <h2
                    key={nextKey()}
                    className="text-2xl md:text-3xl font-bold text-white mt-10 first:mt-0 mb-4 tracking-tight"
                >
                    {renderInline(h1[1], { ...ctx, keyPrefix: `h1-${i}` })}
                </h2>,
            );
            i++;
            continue;
        }
        if (h2) {
            out.push(
                <h3
                    key={nextKey()}
                    className="text-xl md:text-2xl font-semibold text-cyan-200 mt-8 mb-3 tracking-tight"
                >
                    {renderInline(h2[1], { ...ctx, keyPrefix: `h2-${i}` })}
                </h3>,
            );
            i++;
            continue;
        }
        if (h3) {
            out.push(
                <h4
                    key={nextKey()}
                    className="text-lg font-semibold text-white/90 mt-6 mb-2"
                >
                    {renderInline(h3[1], { ...ctx, keyPrefix: `h3-${i}` })}
                </h4>,
            );
            i++;
            continue;
        }
        if (h4) {
            out.push(
                <h5
                    key={nextKey()}
                    className="text-base font-semibold text-white/80 mt-4 mb-2"
                >
                    {renderInline(h4[1], { ...ctx, keyPrefix: `h4-${i}` })}
                </h5>,
            );
            i++;
            continue;
        }

        // Image / video: ![alt](url)
        const mediaMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
        if (mediaMatch) {
            const [, alt, rawHref] = mediaMatch;
            const src = resolveMediaUrl(ctx.sectionRel, rawHref.trim());
            if (isVideoPath(rawHref)) {
                out.push(
                    <video
                        key={nextKey()}
                        src={src}
                        controls
                        className="my-4 w-full rounded-xl border border-white/10 bg-black"
                    />,
                );
            } else if (isImagePath(rawHref)) {
                out.push(
                    <img
                        key={nextKey()}
                        src={src}
                        alt={alt}
                        className="my-4 w-full rounded-xl border border-white/10"
                        loading="lazy"
                    />,
                );
            }
            i++;
            continue;
        }

        // Bare YouTube URL on its own line
        const trimmedLine = line.trim();
        if (/^https?:\/\//.test(trimmedLine) && !trimmedLine.includes(' ')) {
            const embed = toYoutubeEmbed(trimmedLine);
            if (embed) {
                out.push(
                    <div
                        key={nextKey()}
                        className="my-4 aspect-video w-full rounded-xl overflow-hidden border border-white/10 bg-black"
                    >
                        <iframe
                            src={embed}
                            title="YouTube video"
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>,
                );
                i++;
                continue;
            }
        }

        // Table: header line with | (also handles "- | ..." list-wrapped tables)
        const tableHeaderLine = /^\s*-\s+(\|.*)$/.exec(line)?.[1] ?? line;
        if (tableHeaderLine.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]+/.test(lines[i + 1])) {
            const headerCells = tableHeaderLine.split('|').map(c => c.trim()).filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''));
            i += 2; // skip header + separator
            const rows: string[][] = [];
            while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
                const row = lines[i].split('|').map(c => c.trim());
                // trim leading/trailing empties from surrounding |
                if (row.length && row[0] === '') row.shift();
                if (row.length && row[row.length - 1] === '') row.pop();
                rows.push(row);
                i++;
            }
            out.push(
                <div key={nextKey()} className="my-4 overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-sm text-left text-white/80">
                        <thead className="bg-white/[0.04] text-cyan-200 uppercase text-xs tracking-wider">
                            <tr>
                                {headerCells.map((h, idx) => (
                                    <th key={idx} className="px-3 py-2 font-semibold">
                                        {renderInline(h, { ...ctx, keyPrefix: `th-${idx}` })}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, ridx) => (
                                <tr key={ridx} className="border-t border-white/5">
                                    {row.map((cell, cidx) => (
                                        <td key={cidx} className="px-3 py-2 align-top">
                                            {renderInline(cell, { ...ctx, keyPrefix: `td-${ridx}-${cidx}` })}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>,
            );
            continue;
        }

        // Bullet list (supports simple nested via "  - ")
        if (/^\s*-\s+/.test(line)) {
            const items: { depth: number; text: string }[] = [];
            while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
                const m = lines[i].match(/^(\s*)-\s+(.*)$/);
                if (!m) break;
                // If this list item is actually a table header, stop and let the table handler take over
                if (m[2].startsWith('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]+/.test(lines[i + 1])) break;
                const depth = Math.floor(m[1].length / 2);
                items.push({ depth, text: m[2] });
                i++;
            }
            out.push(
                <ul
                    key={nextKey()}
                    className="my-3 space-y-1.5 text-white/80"
                >
                    {items.map((item, idx) => (
                        <li
                            key={idx}
                            className="relative pl-5 leading-relaxed"
                            style={{ marginLeft: item.depth * 16 }}
                        >
                            <span className="absolute left-0 top-[0.6em] w-1.5 h-1.5 rounded-full bg-cyan-400/70" />
                            {renderInline(item.text, { ...ctx, keyPrefix: `li-${idx}` })}
                        </li>
                    ))}
                </ul>,
            );
            continue;
        }

        // Paragraph: gather consecutive non-empty, non-special lines
        const paragraphLines: string[] = [line];
        i++;
        while (
            i < lines.length &&
            lines[i].trim() !== '' &&
            !/^#{1,4}\s+/.test(lines[i]) &&
            !/^\s*-\s+/.test(lines[i]) &&
            !/^!\[/.test(lines[i]) &&
            !(lines[i].includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]+/.test(lines[i + 1]))
        ) {
            paragraphLines.push(lines[i]);
            i++;
        }
        const paragraph = paragraphLines.join(' ').replace(/\s+/g, ' ').trim();
        if (paragraph) {
            out.push(
                <p key={nextKey()} className="my-3 text-white/75 leading-relaxed">
                    {renderInline(paragraph, { ...ctx, keyPrefix: `p-${i}` })}
                </p>,
            );
        }
    }

    return <>{out}</>;
};

// ============================================================================
// Component
// ============================================================================

export const PortfolioSite: React.FC<PortfolioSiteProps> = ({ onEnterOS }) => {
    const [sections, setSections] = useState<LoadedSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSlug, setActiveSlug] = useState<string | null>(null);
    const [tocOpen, setTocOpen] = useState(false);
    const [collapsedOpen, setCollapsedOpen] = useState<Record<string, boolean>>({});
    const tocRef = useRef<HTMLElement | null>(null);
    const tocItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    // Fetch manifest -> fetch all portfolio md files
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const manifestRes = await fetch(PARK_FILES_MANIFEST_PATH);
                if (!manifestRes.ok) throw new Error('manifest fetch failed');
                const manifest: ManifestResponse = await manifestRes.json();

                // Filter portfolio/*.md entries
                const mdFiles = manifest.files
                    .filter(f => f.path.startsWith('portfolio/') && f.path.endsWith('.md'))
                    .map(f => ({ path: f.path, rel: f.path.replace(/^portfolio\//, '') }))
                    .filter(f => !EXCLUDED_SECTIONS.includes(f.rel));

                // Sort by SECTION_PRIORITY, then alphabetically for the rest
                mdFiles.sort((a, b) => {
                    const ai = SECTION_PRIORITY.indexOf(a.rel);
                    const bi = SECTION_PRIORITY.indexOf(b.rel);
                    if (ai === -1 && bi === -1) return a.rel.localeCompare(b.rel);
                    if (ai === -1) return 1;
                    if (bi === -1) return -1;
                    return ai - bi;
                });

                // Fetch content in parallel
                const results = await Promise.all(
                    mdFiles.map(async file => {
                        const url = `${PARK_ROOT_PUBLIC_PATH}/${file.path}`;
                        const res = await fetch(url);
                        const markdown = res.ok ? await res.text() : '';
                        const title = extractFirstHeading(markdown) || titleCaseFromRel(file.rel);
                        return {
                            path: file.path,
                            rel: file.rel,
                            slug: `section-${slugify(file.path)}`,
                            title,
                            markdown,
                        } as LoadedSection;
                    }),
                );

                if (!cancelled) setSections(results);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : 'failed to load portfolio');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    // Build path -> slug map for internal md link resolution
    const pathToSlug = useMemo(() => {
        const map = new Map<string, string>();
        for (const s of sections) map.set(s.path, s.slug);
        return map;
    }, [sections]);

    // Keep the TOC synced with the section closest to the top reading line.
    useEffect(() => {
        if (sections.length === 0) return;

        const getRenderedSections = () =>
            sections
                .map(section => {
                    const element = document.getElementById(section.slug);
                    return element ? { section, element } : null;
                })
                .filter((entry): entry is { section: LoadedSection; element: HTMLElement } => entry !== null);

        const updateActiveSection = () => {
            const renderedSections = getRenderedSections();
            if (renderedSections.length === 0) return;

            const sectionSpyOffset =
                window.innerWidth >= 1024 ? SECTION_SPY_OFFSET_DESKTOP : SECTION_SPY_OFFSET_MOBILE;

            const viewportBottom = window.scrollY + window.innerHeight;
            const documentBottom = document.documentElement.scrollHeight - 4;
            if (viewportBottom >= documentBottom) {
                const lastVisibleSlug = renderedSections[renderedSections.length - 1].section.slug;
                setActiveSlug(prev => (prev === lastVisibleSlug ? prev : lastVisibleSlug));
                return;
            }

            let nextActiveSlug = renderedSections[0].section.slug;

            for (const { section, element } of renderedSections) {
                if (element.getBoundingClientRect().top <= sectionSpyOffset) {
                    nextActiveSlug = section.slug;
                    continue;
                }
                break;
            }

            setActiveSlug(prev => (prev === nextActiveSlug ? prev : nextActiveSlug));
        };

        let frameId = 0;
        const requestUpdate = () => {
            if (frameId !== 0) return;
            frameId = window.requestAnimationFrame(() => {
                frameId = 0;
                updateActiveSection();
            });
        };

        requestUpdate();
        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', requestUpdate);

        return () => {
            if (frameId !== 0) {
                window.cancelAnimationFrame(frameId);
            }
            window.removeEventListener('scroll', requestUpdate);
            window.removeEventListener('resize', requestUpdate);
        };
    }, [sections]);

    useEffect(() => {
        if (!activeSlug) return;

        const toc = tocRef.current;
        const activeItem = tocItemRefs.current[activeSlug];
        if (!toc || !activeItem) return;

        const tocRect = toc.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();
        const isOutOfView = itemRect.top < tocRect.top || itemRect.bottom > tocRect.bottom;

        if (isOutOfView) {
            activeItem.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        }
    }, [activeSlug]);

    const scrollToSection = useCallback((slug: string) => {
        const el = document.getElementById(slug);
        if (el) {
            setActiveSlug(slug);
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTocOpen(false);
        }
    }, []);

    const toggleCollapsed = (slug: string) =>
        setCollapsedOpen(prev => ({ ...prev, [slug]: !prev[slug] }));

    const visibleSections = sections.filter(s => !DEFAULT_COLLAPSED.includes(s.rel));
    const collapsedSections = sections.filter(s => DEFAULT_COLLAPSED.includes(s.rel));

    return (
        <div className="relative min-h-screen w-full bg-neutral-950 text-white/90 font-sans overflow-x-hidden">
            {/* Top-left cyan ambient glow */}
            <div
                className="pointer-events-none fixed z-0"
                style={{
                    top: '-10%',
                    left: '-10%',
                    width: '55vw',
                    height: '55vw',
                    background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)',
                }}
            />
            {/* Bottom-right purple ambient glow */}
            <div
                className="pointer-events-none fixed z-0"
                style={{
                    bottom: '-15%',
                    right: '-10%',
                    width: '60vw',
                    height: '60vw',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
                }}
            />
            {/* Subtle static grid */}
            <div
                className="pointer-events-none fixed inset-0 z-0 opacity-[0.035]"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                }}
            />

            {/* Top bar */}
            <header className="sticky top-0 z-40 backdrop-blur-xl bg-neutral-950/70 border-b border-white/5">
                <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className="lg:hidden p-2 -ml-2 text-white/70 hover:text-white"
                            onClick={() => setTocOpen(v => !v)}
                            aria-label="Toggle sections menu"
                        >
                            {tocOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <div className="flex flex-col leading-none">
                            <span className="text-sm font-semibold tracking-wide text-white">Park Achieveone</span>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-1">
                                Unity Game Developer
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <a
                            href="https://github.com/achieveonepark"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.03] text-white/70 hover:text-white hover:border-white/20 transition"
                            title="GitHub"
                        >
                            <Github size={16} />
                        </a>
                        <a
                            href="https://blog.somiri.dev"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.03] text-white/70 hover:text-white hover:border-white/20 transition"
                            title="Blog"
                        >
                            <BookOpen size={16} />
                        </a>
                        <a
                            href="https://lib.somiri.dev"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.03] text-white/70 hover:text-white hover:border-white/20 transition"
                            title="Library"
                        >
                            <Code size={16} />
                        </a>
                        <a
                            href="mailto:park_achieveone@naver.com"
                            className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.03] text-white/70 hover:text-white hover:border-white/20 transition"
                            title="Email"
                        >
                            <Mail size={16} />
                        </a>
                        <button
                            type="button"
                            onClick={onEnterOS}
                            className="group inline-flex items-center gap-2 h-9 px-3 md:px-4 rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/15 hover:border-cyan-300/50 transition text-xs md:text-sm font-semibold tracking-wide"
                        >
                            <Monitor size={14} />
                            <span>OS 구경하기</span>
                            <ArrowUpRight
                                size={14}
                                className="opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                            />
                        </button>
                    </div>
                </div>
            </header>

            <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 pt-10 md:pt-16 pb-24 flex gap-10 items-start">
                {/* Desktop TOC */}
                <nav
                    ref={tocRef}
                    className="hidden lg:block w-56 shrink-0 sticky self-start max-h-[calc(100vh-8rem)] overflow-y-auto pr-2"
                    style={{ top: `${DESKTOP_TOC_TOP_OFFSET}px` }}
                >
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-3 px-2">Sections</div>
                    <ul className="space-y-1">
                        {sections.map(s => (
                            <li key={s.slug}>
                                <button
                                    ref={node => {
                                        tocItemRefs.current[s.slug] = node;
                                    }}
                                    type="button"
                                    onClick={() => scrollToSection(s.slug)}
                                    aria-current={activeSlug === s.slug ? 'location' : undefined}
                                    className={`w-full text-left px-2 py-1.5 rounded-md text-[13px] transition ${
                                        activeSlug === s.slug
                                            ? 'bg-cyan-400/10 text-cyan-200 border-l-2 border-cyan-400'
                                            : 'text-white/55 hover:text-white/90 hover:bg-white/[0.03] border-l-2 border-transparent'
                                    }`}
                                >
                                    {s.title}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Mobile TOC drawer */}
                {tocOpen && (
                    <div
                        className="lg:hidden fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-xl pt-20 px-6 overflow-y-auto"
                        onClick={() => setTocOpen(false)}
                    >
                        <ul className="space-y-1" onClick={e => e.stopPropagation()}>
                            {sections.map(s => (
                                <li key={s.slug}>
                                    <button
                                        type="button"
                                        onClick={() => scrollToSection(s.slug)}
                                        className={`w-full text-left px-3 py-3 rounded-lg text-sm ${
                                            activeSlug === s.slug
                                                ? 'bg-cyan-400/10 text-cyan-200'
                                                : 'text-white/70 hover:bg-white/5'
                                        }`}
                                    >
                                        {s.title}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Main content column */}
                <main className="flex-1 min-w-0">
                    {/* Hero band */}
                    <section className="mb-12 md:mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-white/50 text-[11px] uppercase tracking-[0.22em] mb-5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                            Portfolio · 2026
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight text-white mb-5">
                            Let's keep up and
                            <br />
                            stay ahead of the game.
                        </h1>
                        <p className="text-white/60 text-base md:text-lg max-w-2xl leading-relaxed">
                            8년 차 Unity 개발자. 게임 공용 시스템과 멀티플랫폼 대응, 그리고 팀 생산성을
                            높이는 툴·파이프라인을 만듭니다.
                        </p>
                    </section>

                    {loading && (
                        <div className="text-white/50 text-sm py-20 text-center">
                            Loading portfolio content…
                        </div>
                    )}
                    {error && (
                        <div className="text-red-300 text-sm py-20 text-center">
                            Failed to load: {error}
                        </div>
                    )}

                    {/* Sections */}
                    <div className="space-y-6 md:space-y-8">
                        {visibleSections.map(section => (
                            <section
                                key={section.slug}
                                id={section.slug}
                                className="scroll-mt-24 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 md:p-10"
                            >
                                 <div className="mb-1 text-[10px] uppercase tracking-[0.22em] text-white/35">
                                     {section.rel}
                                 </div>
                                 <div>
                                    {section.rel === 'about.md'
                                        ? renderAboutSection(section.markdown, {
                                            sectionRel: section.rel,
                                            pathToSlug,
                                        })
                                        : renderMarkdown(section.markdown, {
                                            sectionRel: section.rel,
                                            pathToSlug,
                                        })}
                                 </div>
                             </section>
                         ))}
                    </div>


                    {/* Footer */}
                    <footer className="mt-16 pt-8 border-t border-white/5 text-center">
                        <button
                            type="button"
                            onClick={onEnterOS}
                            className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/15 hover:border-cyan-300/50 transition text-sm font-semibold tracking-wide"
                        >
                            <Monitor size={16} />
                            OS 모드로 구경하기
                            <ArrowUpRight size={14} />
                        </button>
                        <div className="mt-6 text-[11px] text-white/30 tracking-wider">
                            © {new Date().getFullYear()} Park Achieveone · built with React + Vite
                        </div>
                    </footer>
                </main>
            </div>
        </div>
    );
};
