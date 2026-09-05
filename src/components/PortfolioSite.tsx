import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Monitor, Github, Mail, BookOpen, Code, Braces } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import { ProjectsTVSection, PROJECTS_TRANSITION_SECTION_ID } from './ProjectsTVSection';
import { PARK_ROOT_PUBLIC_PATH } from '../constants';
import bundledPortfolioDocuments from 'virtual:portfolio-content';
import { AboutProfileSection, PROFILE_TRANSITION_SECTION_ID } from './AboutProfileSection';
import logo111percent from '../../images/111percent.png';
import logoSnowpipe from '../../images/snowpipe.png';
import logoGridinc from '../../images/gridinc.png';
import logoSnowballs from '../../images/snowballs.png';
import logoDalcomsoft from '../../images/dalcomsoft.png';

// Company logos, bundled as JS imports (not manifest `thumbnail` paths — those point at
// `/images/...`, which lives outside Vite's publicDir and 404s in production builds).
const COMPANY_LOGOS: Record<string, string> = {
    'experience/111percent.md': logo111percent,
    'experience/snowpipe.md': logoSnowpipe,
    'experience/gridinc.md': logoGridinc,
    'experience/snowballs.md': logoSnowballs,
    'experience/dalcomsoft.md': logoDalcomsoft,
};

// Cinematic chapter reveal: each chapter zooms + un-blurs into place as it
// scrolls into view, spring-based for a snappy overshoot (whoosh-in effect).
const SECTION_REVEAL_VARIANTS: Variants = {
    hidden: { opacity: 0, scale: 0.82, y: 72, filter: 'blur(6px)' },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { type: 'spring', stiffness: 220, damping: 22, mass: 0.9 },
    },
};

// Transform-free reveal (opacity only) for the "Professional Experience" chapter.
// A spring's `scale`/`filter` transition never lands on an *exact* identity
// transform, and any non-identity transform on an ancestor — even a fraction of
// a pixel off — becomes the containing block for descendant `position: fixed`
// or `position: sticky` elements, breaking the pinned iPhone sequence inside.
// Untransformed opacity avoids that entirely.
const SECTION_REVEAL_VARIANTS_NO_TRANSFORM: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

// ============================================================================
// Types
// ============================================================================

interface LoadedSection {
    path: string;      // portfolio/experience.md
    rel: string;       // experience.md (relative to portfolio/)
    slug: string;      // anchor id
    title: string;     // from first H1 or filename
    markdown: string;
    thumbnail?: string; // company logo, when provided by the manifest
}

interface PortfolioSiteProps {
    onEnterOS: () => void;
}

// ============================================================================
// Priority / ordering
// ============================================================================

const SECTION_PRIORITY: string[] = [
    'about.md',
    'skills.md',
    'experience.md',
    'experience/111percent.md',
    'experience/snowpipe.md',
    'experience/gridinc.md',
    'experience/snowballs.md',
    'experience/dalcomsoft.md',
    'projects.md',
    'links.md',
    'portfolio_full.md', // shown collapsed at the bottom
];

const EXCLUDED_SECTIONS: string[] = ['career_resume.md'];

const DEFAULT_COLLAPSED: string[] = ['portfolio_full.md'];
// Per-company case studies aren't rendered as their own chapters — they show up as
// "apps" inside the iPhone-style career launcher on the Professional Experience chapter.
const PHONE_APP_SECTIONS: string[] = [
    'experience/111percent.md',
    'experience/snowpipe.md',
    'experience/gridinc.md',
    'experience/snowballs.md',
    'experience/dalcomsoft.md',
];
// Sticky header (h-16 = 64px) + chapter pill nav (~52px) stacked on top of each other.
const CHAPTER_SCROLL_OFFSET = 116;
const SECTION_SPY_OFFSET_DESKTOP = 152;
const SECTION_SPY_OFFSET_MOBILE = 124;
const SECTION_SPY_RATIO_DESKTOP = 0.3;
const SECTION_SPY_RATIO_MOBILE = 0.22;

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
                        lastIndex = match.index + token.length;
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

const renderYoutubeEmbed = (embed: string, key: string, className?: string) => (
    <div
        key={key}
        className={
            className ??
            'my-4 aspect-video w-full rounded-xl overflow-hidden border border-white/10 bg-black'
        }
    >
        <iframe
            src={embed}
            title="YouTube video"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
        />
    </div>
);

const extractYoutubeListItem = (text: string): { label: string | null; embed: string } | null => {
    const trimmed = text.trim();
    const labeledMatch = trimmed.match(/^(.+?):\s*(https?:\/\/\S+)\s*$/);
    if (labeledMatch) {
        const [, label, url] = labeledMatch;
        const embed = toYoutubeEmbed(url);
        if (embed) {
            return { label: label.trim(), embed };
        }
    }

    const embed = toYoutubeEmbed(trimmed);
    if (embed) {
        return { label: null, embed };
    }

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
        <AboutProfileSection
            title={renderInline(about.title, { ...ctx, keyPrefix: 'about-title' })}
            name={name}
            career={career}
            badge={about.subtitle ?? 'Profile'}
            profileContent={
                <>
                    {details.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            {details.map((detail, index) => (
                                <div
                                    key={`${detail.label}-${detail.value}-${index}`}
                                    className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 backdrop-blur-sm"
                                >
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                                        {detail.label || 'Info'}
                                    </div>
                                    <div className="mt-2 break-keep text-base font-semibold text-white/90">
                                        {renderInline(detail.value, { ...ctx, keyPrefix: `about-detail-${index}` })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {about.greeting && (
                        <p className="mt-6 max-w-2xl break-keep text-lg md:text-xl leading-relaxed text-white/78">
                            {renderInline(about.greeting, { ...ctx, keyPrefix: 'about-greeting' })}
                        </p>
                    )}
                    <p className="mt-5 border-l-2 border-cyan-300/35 pl-4 text-sm italic leading-relaxed text-cyan-100/60 md:text-base">
                        Let's keep up and stay ahead of the game.
                    </p>
                </>
            }
        >
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
        </AboutProfileSection>
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
                    className="text-4xl md:text-6xl lg:text-7xl font-black text-white mt-10 first:mt-0 mb-6 md:mb-8 tracking-tight leading-[1.05]"
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
                    className="text-2xl md:text-3xl font-bold text-cyan-200 mt-12 mb-4 tracking-tight"
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
                    className="text-xl md:text-2xl font-semibold text-white/90 mt-8 mb-3"
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
                    className="text-lg font-semibold text-white/80 mt-5 mb-2"
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
                out.push(renderYoutubeEmbed(embed, nextKey()));
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
                    className="my-4 space-y-2.5 text-lg md:text-xl text-white/75"
                >
                    {items.map((item, idx) => {
                        const youtubeItem = extractYoutubeListItem(item.text);

                        return (
                            <li
                                key={idx}
                                className={`relative pl-6 ${youtubeItem ? 'pt-0.5' : 'leading-relaxed'}`}
                                style={{ marginLeft: item.depth * 16 }}
                            >
                                <span className="absolute left-0 top-3.5 h-1.5 w-1.5 rounded-full bg-cyan-400/70" />
                                {youtubeItem ? (
                                    <div className="space-y-3">
                                        {youtubeItem.label && (
                                            <div className="text-white/80 leading-relaxed">
                                                {renderInline(`${youtubeItem.label}:`, {
                                                    ...ctx,
                                                    keyPrefix: `li-${idx}-label`,
                                                })}
                                            </div>
                                        )}
                                        {renderYoutubeEmbed(
                                            youtubeItem.embed,
                                            `li-${idx}-video`,
                                            'aspect-video w-full rounded-xl overflow-hidden border border-white/10 bg-black',
                                        )}
                                    </div>
                                ) : (
                                    renderInline(item.text, { ...ctx, keyPrefix: `li-${idx}` })
                                )}
                            </li>
                        );
                    })}
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
                <p key={nextKey()} className="my-4 text-lg md:text-xl text-white/70 leading-relaxed max-w-3xl">
                    {renderInline(paragraph, { ...ctx, keyPrefix: `p-${i}` })}
                </p>,
            );
        }
    }

    return <>{out}</>;
};

// Realistic iPhone chrome: bezel, side buttons, dynamic island, status bar,
// screen sheen, home indicator. Pure presentation — apps/selection are props.
const PhoneFrame: React.FC<{
    apps: LoadedSection[];
    activeIndex: number;
    onSelect?: (index: number) => void;
}> = ({ apps, activeIndex, onSelect }) => (
    <div className="relative w-[260px] h-[544px]">
        {/* Side buttons — mute switch + volume rocker (left), power button (right) */}
        <div className="absolute -left-[3px] top-[108px] w-[3px] h-7 rounded-l bg-neutral-700" />
        <div className="absolute -left-[3px] top-[152px] w-[3px] h-12 rounded-l bg-neutral-700" />
        <div className="absolute -left-[3px] top-[212px] w-[3px] h-12 rounded-l bg-neutral-700" />
        <div className="absolute -right-[3px] top-[168px] w-[3px] h-16 rounded-r bg-neutral-700" />

        {/* Bezel */}
        <div className="relative w-full h-full rounded-[44px] bg-gradient-to-br from-[#63666b] via-[#252729] to-[#45484c] p-[6px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16),0_40px_90px_rgba(0,0,0,0.55)]">
            <div className="relative w-full h-full rounded-[38px] overflow-hidden bg-gradient-to-b from-neutral-900 via-neutral-950 to-black shadow-[0_0_0_3px_#08090a]">
                {/* iOS-style status bar, scaled to the 260px device frame. */}
                <div
                    data-phone-status-bar
                    aria-hidden="true"
                    className="relative z-20 h-[42px] select-none text-white"
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
                >
                    <span className="absolute left-[25px] top-[14px] w-[34px] text-center text-[11px] font-semibold leading-[14px] tracking-[-0.035em] tabular-nums">
                        9:41
                    </span>
                    <div className="absolute right-[21px] top-[15px] flex h-3 items-center gap-[3.5px]">
                        <svg width="14" height="11" viewBox="0 0 18 14" fill="currentColor">
                            <rect x="0" y="9" width="3" height="5" rx="0.75" />
                            <rect x="5" y="6" width="3" height="8" rx="0.75" />
                            <rect x="10" y="3" width="3" height="11" rx="0.75" />
                            <rect x="15" y="0" width="3" height="14" rx="0.75" />
                        </svg>
                        <svg width="12" height="10" viewBox="0 0 16 12" fill="currentColor">
                            <path d="M8 0C4.97 0 2.16 1.14 0 3.12l1.62 1.64a9.48 9.48 0 0 1 12.76 0L16 3.12A11.82 11.82 0 0 0 8 0Z" />
                            <path d="M8 4a7.91 7.91 0 0 0-5.42 2.14L4.2 7.78a5.54 5.54 0 0 1 7.6 0l1.62-1.64A7.91 7.91 0 0 0 8 4Z" />
                            <path d="M8 8a3.8 3.8 0 0 0-2.54.96L8 11.5l2.54-2.54A3.8 3.8 0 0 0 8 8Z" />
                        </svg>
                        <svg width="19" height="10" viewBox="0 0 27 13" fill="none">
                            <rect x="0.65" y="0.65" width="22.7" height="11.7" rx="3" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.3" />
                            <rect x="2.5" y="2.5" width="19" height="8" rx="1.4" fill="currentColor" />
                            <path d="M25 4.1a2.6 2.6 0 0 1 0 4.8Z" fill="currentColor" fillOpacity="0.5" />
                        </svg>
                    </div>
                    {/* Camera glass stays almost black inside the Dynamic Island. */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[78px] h-[26px] rounded-full bg-black shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.035)]">
                        <div className="absolute right-[7px] top-1/2 -translate-y-1/2 h-[8px] w-[8px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#172331_0%,#080d14_42%,#030405_75%)] shadow-[inset_0_0_0_1px_rgba(30,41,59,0.25)]" />
                    </div>
                </div>

                {/* App grid */}
                <div className="relative z-10 grid grid-cols-3 gap-x-4 gap-y-6 px-5 pt-[30px]">
                    {apps.map((app, idx) => {
                        const isActive = idx === activeIndex;
                        const logo = COMPANY_LOGOS[app.rel];
                        return (
                            <button
                                key={app.slug}
                                type="button"
                                disabled={!onSelect}
                                onClick={() => onSelect?.(idx)}
                                className="flex flex-col items-center gap-1.5"
                            >
                                <span
                                    className={`flex items-center justify-center w-14 h-14 rounded-[15px] bg-neutral-800 border border-white/10 shadow-[0_6px_14px_rgba(0,0,0,0.35)] overflow-hidden transition-transform duration-150 ${
                                        isActive
                                            ? 'ring-2 ring-offset-2 ring-offset-neutral-950 ring-cyan-300 scale-105'
                                            : 'active:scale-90'
                                    }`}
                                >
                                    {logo ? (
                                        <img src={logo} alt={`${app.title} logo`} className="w-full h-full object-contain p-2.5" />
                                    ) : (
                                        <span className="text-white font-bold text-lg">{app.title.charAt(0)}</span>
                                    )}
                                </span>
                                <span className="text-[10.5px] leading-tight text-white/85 text-center line-clamp-1 max-w-[60px]">
                                    {app.title}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Home indicator */}
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full bg-white/60" />

                {/* Screen sheen */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent" />
            </div>
        </div>
    </div>
);

const TECH_STACK_GROUPS = [
    { key: 'engine', values: ['Unity'] },
    { key: 'language', values: ['C#', '.NET'] },
    { key: 'platforms', values: ['Steam', 'WebGL', 'Android', 'iOS'] },
    { key: 'services', values: ['Firebase'] },
];

const TechStackSection: React.FC<{ title: string }> = ({ title }) => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const [typingStarted, setTypingStarted] = useState(false);
    const [typingRun, setTypingRun] = useState(0);

    useEffect(() => {
        const section = sectionRef.current;
        if (!section) return;

        const observer = new IntersectionObserver(
            entries => {
                if (!entries.some(entry => entry.isIntersecting)) return;
                setTypingStarted(true);
                observer.disconnect();
            },
            { threshold: 0.28 },
        );
        observer.observe(section);
        return () => observer.disconnect();
    }, []);

    const makeTypingStyle = (characters: number, lineIndex: number) => ({
        '--line-width': `${characters}ch`,
        '--type-duration': `${Math.max(340, characters * 34)}ms`,
        '--type-delay': `${260 + lineIndex * 430}ms`,
        animationTimingFunction: `steps(${characters}, end)`,
    }) as React.CSSProperties;

    const replayTyping = () => {
        setTypingStarted(true);
        setTypingRun(run => run + 1);
    };

    return (
        <div ref={sectionRef}>
            <div className="mb-10 flex items-end justify-between gap-6 md:mb-14">
                <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.05]">
                    {title}
                </h2>
                <div className="hidden items-center gap-4 pb-2 sm:flex">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-cyan-200/55">
                        <Braces size={15} />
                        tools I build with
                    </div>
                    <button
                        type="button"
                        onClick={replayTyping}
                        className="rounded-full border border-cyan-300/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-cyan-100/60 transition hover:border-cyan-300/45 hover:text-cyan-100"
                    >
                        replay
                    </button>
                </div>
            </div>

            <motion.div
                className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#101826]/95 shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
                initial={{ opacity: 0, y: 28, scale: 0.98 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className="flex h-11 items-center gap-2 border-b border-white/[0.07] bg-white/[0.025] px-5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                    <span className="ml-3 text-[10px] uppercase tracking-[0.2em] text-white/30">stack.ts</span>
                </div>

                <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
                <div className="relative min-h-[440px] overflow-x-auto px-5 py-8 font-mono text-[14px] leading-8 sm:px-9 sm:py-10 md:text-[17px] md:leading-9">
                    <div key={`typing-${typingRun}`} aria-label="Technology stack source code">
                        <div className="h-8 whitespace-nowrap md:h-9">
                            <span className={typingStarted ? 'tech-code-line' : 'tech-code-line-pending'} style={makeTypingStyle(15, 0)}>
                                <span className="text-violet-300">const</span>{' '}
                                <span className="text-cyan-300">stack</span>{' '}
                                <span className="text-white/45">= {'{'}</span>
                            </span>
                        </div>

                        {TECH_STACK_GROUPS.map((group, groupIndex) => {
                            const lineText = `${group.key}: [${group.values.map(value => `\"${value}\"`).join(', ')}]${groupIndex < TECH_STACK_GROUPS.length - 1 ? ',' : ''}`;
                            return (
                                <div key={group.key} className="ml-5 h-8 whitespace-nowrap sm:ml-8 md:h-9">
                                    <span
                                        className={typingStarted ? 'tech-code-line' : 'tech-code-line-pending'}
                                        style={makeTypingStyle(lineText.length, groupIndex + 1)}
                                    >
                                        <span className="text-emerald-300">{group.key}</span>
                                        <span className="text-white/45">: [</span>
                                        {group.values.map((value, valueIndex) => (
                                            <React.Fragment key={value}>
                                                <span className="text-sky-200">&quot;{value}&quot;</span>
                                                {valueIndex < group.values.length - 1 && <span className="text-white/45">, </span>}
                                            </React.Fragment>
                                        ))}
                                        <span className="text-white/45">]{groupIndex < TECH_STACK_GROUPS.length - 1 ? ',' : ''}</span>
                                    </span>
                                </div>
                            );
                        })}

                        <div className="h-8 whitespace-nowrap text-white/45 md:h-9">
                            <span className={typingStarted ? 'tech-code-line tech-code-line-last' : 'tech-code-line-pending'} style={makeTypingStyle(2, TECH_STACK_GROUPS.length + 1)}>
                                {'}'};
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// The layout shared by the phone column and the text column.
const PHONE_GRID_CLASS = 'grid gap-10 lg:gap-16 lg:grid-cols-[272px_1fr]';

// Must match PhoneFrame's `w-[260px] h-[544px]`.
const PHONE_FRAME_W = 260;
const PHONE_FRAME_H = 544;

const PHONE_TRANSITION_SECTION_ID = 'phone-transition-stage';

// The phone stays hidden through Tech Stack, fades in at the center, then moves
// into the Experience column as the chapter is revealed.
const CareerPhoneSection: React.FC<{
    title: string;
    apps: LoadedSection[];
    pathToSlug: Map<string, string>;
}> = ({ title, apps, pathToSlug }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const active = apps[activeIndex];
    const sectionContentRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const detailsRef = useRef<HTMLDivElement>(null);
    const dockSlotRef = useRef<HTMLDivElement>(null);
    const dockRef = useRef<HTMLDivElement>(null);
    const bgPhoneRef = useRef<HTMLDivElement>(null);
    const [isDesktop, setIsDesktop] = useState(false);
    const prefersReducedMotion = useReducedMotion();
    const showBgPhone = isDesktop && !prefersReducedMotion;

    const selectCompany = useCallback((index: number) => {
        setActiveIndex(index);
        const section = sectionContentRef.current?.closest('section');
        if (!section) return;

        const sectionTop = section.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
            top: Math.max(0, sectionTop - CHAPTER_SCROLL_OFFSET),
            behavior: 'smooth',
        });
    }, []);

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)');
        const update = () => setIsDesktop(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        if (!showBgPhone) return;
        const transitionEl = document.getElementById(PHONE_TRANSITION_SECTION_ID);
        const contentEl = sectionContentRef.current;
        const sectionEl = contentEl?.closest('section');
        const dockSlotEl = dockSlotRef.current;
        const dockEl = dockRef.current;
        const bgEl = bgPhoneRef.current;
        if (!transitionEl || !contentEl || !sectionEl || !dockSlotEl || !dockEl || !bgEl) return;

        const dockStuckTop = CHAPTER_SCROLL_OFFSET + 36; // matches dockRef's own `style.top`

        // Measure the non-sticky slot so resize, restored scroll positions and
        // company changes cannot feed a stuck position back into the timeline.
        let target = {
            fadeStartY: 0,
            fadeEndY: 1,
            moveStartY: 1,
            dockStartY: 2,
            dockArrivalY: 2,
            dockTopY: 0,
            dockBottomY: 0,
            bigScale: 1,
            top0: 0,
            left0: 0,
            dockLeft: 0,
        };
        const measure = () => {
            const dockRect = dockEl.getBoundingClientRect();
            const slotRect = dockSlotEl.getBoundingClientRect();
            const transitionRect = transitionEl.getBoundingClientRect();
            const transitionTopDocY = transitionRect.top + window.scrollY;
            const sectionTopDocY = sectionEl.getBoundingClientRect().top + window.scrollY;
            const fadeStartY = transitionTopDocY - CHAPTER_SCROLL_OFFSET;
            const fadeEndY = fadeStartY + window.innerHeight * 0.6;
            const moveStartY = Math.max(fadeEndY, sectionTopDocY - window.innerHeight * 1.05);
            // Slide left over a longer distance, then align below the title
            // only when Experience approaches its original handoff position.
            const dockStartY = Math.max(moveStartY, sectionTopDocY - window.innerHeight * 0.55);
            const bigScale = Math.min(
                1.65,
                (window.innerHeight - CHAPTER_SCROLL_OFFSET - 72) / PHONE_FRAME_H,
                (window.innerWidth * 0.7) / PHONE_FRAME_W,
            );
            target = {
                fadeStartY,
                fadeEndY,
                moveStartY,
                dockStartY,
                dockArrivalY: Math.max(dockStartY + 1, sectionTopDocY - CHAPTER_SCROLL_OFFSET),
                dockTopY: slotRect.top + window.scrollY,
                dockBottomY: slotRect.bottom + window.scrollY,
                bigScale,
                top0: CHAPTER_SCROLL_OFFSET + (window.innerHeight - CHAPTER_SCROLL_OFFSET - PHONE_FRAME_H * bigScale) / 2,
                left0: (window.innerWidth - PHONE_FRAME_W * bigScale) / 2,
                dockLeft: dockRect.left,
            };
        };

        let raf = 0;
        const applyStyle = () => {
            raf = 0;
            const clamp = (value: number) => Math.min(1, Math.max(0, value));
            const ease = (value: number) => 1 - Math.pow(1 - value, 3);
            const fadeProgress = clamp((window.scrollY - target.fadeStartY) / (target.fadeEndY - target.fadeStartY));
            const moveSpan = Math.max(1, target.dockArrivalY - target.moveStartY);
            const moveProgress = clamp((window.scrollY - target.moveStartY) / moveSpan);
            const dockSpan = Math.max(1, target.dockArrivalY - target.dockStartY);
            const dockProgress = clamp((window.scrollY - target.dockStartY) / dockSpan);
            const progress = ease(moveProgress);
            // Clear the title's row before revealing it, including mid-scroll.
            const topProgress = ease(clamp(dockProgress / 0.65));
            const reveal = ease(clamp((dockProgress - 0.45) / 0.5));
            const scale = target.bigScale + (1 - target.bigScale) * progress;
            // Follow the slot below the title before becoming sticky. Jumping
            // back to Experience must not pin the phone over the chapter heading.
            const dockTop = Math.max(dockStuckTop, target.dockTopY - window.scrollY);
            const top = Math.min(
                target.top0 + (dockTop - target.top0) * topProgress,
                target.dockBottomY - window.scrollY - PHONE_FRAME_H * scale,
            );
            const left = target.left0 + (target.dockLeft - target.left0) * progress;

            const visible = fadeProgress > 0 && top + PHONE_FRAME_H * scale > CHAPTER_SCROLL_OFFSET;
            bgEl.style.opacity = visible ? String(fadeProgress * fadeProgress * (3 - 2 * fadeProgress)) : '0';
            bgEl.style.visibility = visible ? 'visible' : 'hidden';
            bgEl.inert = !visible || moveProgress < 1;
            bgEl.style.pointerEvents = visible && moveProgress === 1 ? 'auto' : 'none';
            bgEl.style.transform = `translate3d(${left}px, ${top}px, 0) scale(${scale})`;
            contentEl.style.opacity = String(reveal);
            if (titleRef.current) titleRef.current.style.transform = `translate3d(0, ${(1 - reveal) * 40}px, 0)`;
            if (detailsRef.current) detailsRef.current.style.transform = `translate3d(${(1 - reveal) * 56}px, 0, 0)`;
        };
        const onScroll = () => {
            if (!raf) raf = requestAnimationFrame(applyStyle);
        };
        const onResize = () => {
            measure();
            applyStyle();
        };

        measure();
        applyStyle();
        const observer = new ResizeObserver(onResize);
        observer.observe(transitionEl);
        observer.observe(sectionEl);
        observer.observe(dockSlotEl);
        if (transitionEl.parentElement) observer.observe(transitionEl.parentElement);
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
            observer.disconnect();
            if (raf) cancelAnimationFrame(raf);
            contentEl.style.opacity = '';
            if (titleRef.current) titleRef.current.style.transform = '';
            if (detailsRef.current) detailsRef.current.style.transform = '';
        };
    }, [showBgPhone]);

    return (
        <div ref={sectionContentRef} data-career-content style={{ opacity: showBgPhone ? 0 : 1 }}>
            <h2 ref={titleRef} className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-10 md:mb-14 tracking-tight leading-[1.05]">
                {title}
            </h2>

            {showBgPhone &&
                createPortal(
                    <div
                        ref={bgPhoneRef}
                        data-scroll-phone
                        className="fixed top-0 left-0"
                        style={{ width: PHONE_FRAME_W, height: PHONE_FRAME_H, transformOrigin: 'top left', zIndex: 20, opacity: 0, visibility: 'hidden', pointerEvents: 'none', willChange: 'transform, opacity' }}
                    >
                        <PhoneFrame apps={apps} activeIndex={activeIndex} onSelect={selectCompany} />
                    </div>,
                    document.body,
                )}

            <div className={`items-start ${PHONE_GRID_CLASS}`}>
                <div ref={dockSlotRef} className="self-stretch">
                    <div ref={dockRef} className="mx-auto w-fit lg:mx-0 lg:sticky shrink-0" style={{ top: CHAPTER_SCROLL_OFFSET + 36 }}>
                        {showBgPhone ? (
                            <div className="h-[544px] w-[260px]" aria-hidden="true" />
                        ) : (
                            <PhoneFrame apps={apps} activeIndex={activeIndex} onSelect={selectCompany} />
                        )}
                        <p className="mt-5 text-center text-[11px] uppercase tracking-[0.2em] text-white/35">
                            탭해서 회사별 이야기 보기
                        </p>
                    </div>
                </div>

                <div ref={detailsRef} className="min-w-0">
                    <AnimatePresence mode="wait">
                        {active && (
                            <motion.div
                                key={active.slug}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            >
                                {renderMarkdown(active.markdown, { sectionRel: active.rel, pathToSlug })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Component
// ============================================================================

export const PortfolioSite: React.FC<PortfolioSiteProps> = ({ onEnterOS }) => {
    const [activeSlug, setActiveSlug] = useState<string | null>(null);
    const [collapsedOpen, setCollapsedOpen] = useState<Record<string, boolean>>({});
    const chapterNavRef = useRef<HTMLDivElement | null>(null);
    const chapterNavItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    // Portfolio Markdown is bundled by Vite so the initial page never depends on
    // a second round of runtime network requests before it can render.
    const sections = useMemo<LoadedSection[]>(() => {
        const loaded = bundledPortfolioDocuments
            .filter(file => file.path.startsWith('portfolio/') && file.path.endsWith('.md'))
            .map(file => {
                const rel = file.path.replace(/^portfolio\//, '');
                return {
                    path: file.path,
                    rel,
                    slug: `section-${slugify(file.path)}`,
                    title: extractFirstHeading(file.markdown) || titleCaseFromRel(rel),
                    markdown: file.markdown,
                };
            })
            .filter(file => !EXCLUDED_SECTIONS.includes(file.rel));

        loaded.sort((a, b) => {
            const ai = SECTION_PRIORITY.indexOf(a.rel);
            const bi = SECTION_PRIORITY.indexOf(b.rel);
            if (ai === -1 && bi === -1) return a.rel.localeCompare(b.rel);
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        });

        return loaded;
    }, []);

    // Build path -> slug map for internal md link resolution
    const pathToSlug = useMemo(() => {
        const map = new Map<string, string>();
        for (const s of sections) map.set(s.path, s.slug);
        return map;
    }, [sections]);

    const projectVideos = useMemo(() => {
        const projects = sections.find(section => section.rel === 'projects.md');
        if (!projects) return [];
        return projects.markdown.split(/^##\s+/m).slice(1).flatMap(block => {
            const [title, ...lines] = block.split('\n');
            const videoIndex = lines.findIndex(line => extractYoutubeListItem(line.replace(/^\s*-\s+/, '')));
            if (videoIndex < 0) return [];
            const video = extractYoutubeListItem(lines[videoIndex].replace(/^\s*-\s+/, ''));
            if (!video) return [];
            const details = lines.filter((_, index) => index !== videoIndex);
            const period = details.find(line => /^\s*-\s*기간:/.test(line));
            const summary = period?.replace(/^\s*-\s*기간:\s*/, '')
                ?? details.find(line => line.trim())?.replace(/^\s*-\s+/, '')
                ?? '';
            return [{
                id: slugify(title),
                title: title.trim(),
                embed: video.embed,
                summary,
                description: renderMarkdown(details.join('\n'), { sectionRel: projects.rel, pathToSlug }),
            }];
        });
    }, [sections, pathToSlug]);

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

            const isDesktop = window.innerWidth >= 1024;
            const sectionSpyOffset = isDesktop ? SECTION_SPY_OFFSET_DESKTOP : SECTION_SPY_OFFSET_MOBILE;
            const sectionSpyLine = Math.max(
                sectionSpyOffset,
                Math.round(window.innerHeight * (isDesktop ? SECTION_SPY_RATIO_DESKTOP : SECTION_SPY_RATIO_MOBILE)),
            );

            const viewportBottom = window.scrollY + window.innerHeight;
            const documentBottom = document.documentElement.scrollHeight - 4;
            if (viewportBottom >= documentBottom) {
                const lastVisibleSlug = renderedSections[renderedSections.length - 1].section.slug;
                setActiveSlug(prev => (prev === lastVisibleSlug ? prev : lastVisibleSlug));
                return;
            }

            let nextActiveSlug = renderedSections[0].section.slug;

            for (const { section, element } of renderedSections) {
                const rect = element.getBoundingClientRect();
                if (rect.top <= sectionSpyLine && rect.bottom > sectionSpyLine) {
                    nextActiveSlug = section.slug;
                    break;
                }
            }

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

    // Keep the active pill scrolled into view within the horizontally-scrolling chapter nav.
    useEffect(() => {
        if (!activeSlug) return;

        const nav = chapterNavRef.current;
        const activeItem = chapterNavItemRefs.current[activeSlug];
        if (!nav || !activeItem) return;

        const navRect = nav.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();
        const isOutOfView = itemRect.left < navRect.left || itemRect.right > navRect.right;

        if (isOutOfView) {
            activeItem.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        }
    }, [activeSlug]);

    const scrollToSection = useCallback((slug: string) => {
        const el = document.getElementById(slug);
        if (el) {
            setActiveSlug(slug);
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, []);

    const toggleCollapsed = (slug: string) =>
        setCollapsedOpen(prev => ({ ...prev, [slug]: !prev[slug] }));

    const visibleSections = sections.filter(
        s => !DEFAULT_COLLAPSED.includes(s.rel) && !PHONE_APP_SECTIONS.includes(s.rel),
    );
    const collapsedSections = sections.filter(s => DEFAULT_COLLAPSED.includes(s.rel));
    const phoneApps = sections.filter(s => PHONE_APP_SECTIONS.includes(s.rel));
    const prefersReducedMotion = useReducedMotion();

    return (
        <div className="relative min-h-screen w-full bg-neutral-950 text-white/90 font-sans">
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
                <div className="max-w-5xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex flex-col leading-none">
                        <span className="text-sm font-semibold tracking-wide text-white">Park Achieveone</span>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-1">
                            Unity Game Developer
                        </span>
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
                            href="https://docs.somiri.dev"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.03] text-white/70 hover:text-white hover:border-white/20 transition"
                            title="Docs"
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

            {/* Chapter nav — Apple-style horizontal jump bar, sticky just below the header */}
            {visibleSections.length > 0 && (
                <div className="sticky top-16 z-30 border-b border-white/5 bg-neutral-950/80 backdrop-blur-xl">
                    <style>{'.chapter-nav-scroll::-webkit-scrollbar{display:none}'}</style>
                    <div
                        ref={chapterNavRef}
                        className="chapter-nav-scroll max-w-5xl mx-auto px-4 md:px-8 overflow-x-auto"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        <div className="flex items-center gap-1.5 py-2.5 whitespace-nowrap">
                            {visibleSections.map(s => (
                                <button
                                    key={s.slug}
                                    ref={node => {
                                        chapterNavItemRefs.current[s.slug] = node;
                                    }}
                                    type="button"
                                    onClick={() => scrollToSection(s.slug)}
                                    aria-current={activeSlug === s.slug ? 'location' : undefined}
                                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition ${
                                        activeSlug === s.slug
                                            ? 'bg-white text-neutral-950'
                                            : 'text-white/55 hover:text-white hover:bg-white/[0.06]'
                                    }`}
                                >
                                    {s.title}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Main content column — single, full-bleed, chapter by chapter */}
            <main className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 pb-24">
                <h1 className="sr-only">Park Achieveone — Unity Game Developer</h1>
                {visibleSections.some(section => section.rel === 'about.md') && (
                    <div
                        id={PROFILE_TRANSITION_SECTION_ID}
                        className={prefersReducedMotion ? 'hidden' : 'h-[140vh] md:h-[170vh]'}
                        aria-hidden="true"
                    />
                )}

                {/* Chapters */}
                {visibleSections.map(section => (
                    <React.Fragment key={section.slug}>
                    {section.rel === 'projects.md' && projectVideos.length > 0 && (
                        <div
                            id={PROJECTS_TRANSITION_SECTION_ID}
                            className={`relative hidden ${prefersReducedMotion ? '' : 'h-[220vh] lg:block'}`}
                            aria-hidden="true"
                        />
                    )}
                    <motion.section
                        id={section.slug}
                        className="border-t border-white/[0.06] py-20 md:py-32"
                        style={{ scrollMarginTop: CHAPTER_SCROLL_OFFSET }}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 'some', margin: '0px 0px 100px 0px' }}
                        variants={
                            // Reduced motion keeps the reveal, minus the movement:
                            // the transform-free variant is an opacity cross-fade,
                            // which is the gentler equivalent rather than nothing.
                            prefersReducedMotion
                                ? SECTION_REVEAL_VARIANTS_NO_TRANSFORM
                                : section.rel === 'about.md' || section.rel === 'experience.md' || section.rel === 'projects.md'
                                    ? SECTION_REVEAL_VARIANTS_NO_TRANSFORM
                                    : SECTION_REVEAL_VARIANTS
                        }
                    >
                        <div className="mb-4 text-xs uppercase tracking-[0.28em] text-white/35 font-semibold">
                            {section.rel}
                        </div>
                        <div>
                            {section.rel === 'about.md' ? (
                                renderAboutSection(section.markdown, {
                                    sectionRel: section.rel,
                                    pathToSlug,
                                })
                            ) : section.rel === 'skills.md' ? (
                                <TechStackSection title={section.title} />
                            ) : section.rel === 'experience.md' && phoneApps.length > 0 ? (
                                <CareerPhoneSection
                                    title={section.title}
                                    apps={phoneApps}
                                    pathToSlug={pathToSlug}
                                />
                            ) : section.rel === 'projects.md' && projectVideos.length > 0 ? (
                                <ProjectsTVSection title={section.title} projects={projectVideos} />
                            ) : (
                                renderMarkdown(section.markdown, {
                                    sectionRel: section.rel,
                                    pathToSlug,
                                })
                            )}
                        </div>
                    </motion.section>
                    {section.rel === 'skills.md' && (
                        <div
                            id={PHONE_TRANSITION_SECTION_ID}
                            className={`relative hidden ${prefersReducedMotion ? '' : 'h-[280vh] lg:block'}`}
                            aria-hidden="true"
                        >
                            <div className="sticky top-[116px] h-[calc(100vh-116px)]" />
                        </div>
                    )}
                    </React.Fragment>
                ))}

                {/* Footer */}
                <footer className="pt-16 pb-8 border-t border-white/5 text-center">
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
    );
};
