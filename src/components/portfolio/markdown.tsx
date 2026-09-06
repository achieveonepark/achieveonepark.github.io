import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { PARK_ROOT_PUBLIC_PATH } from '../../constants';
import { AboutProfileSection } from '../AboutProfileSection';

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
            loading="lazy"
            src={embed}
            title="YouTube video"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
        />
    </div>
);

export const extractYoutubeListItem = (text: string): { label: string | null; embed: string } | null => {
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

export const renderAboutSection = (md: string, ctx: RenderContext): React.ReactNode => {
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {details.map((detail, index) => (
                                <div
                                    key={`${detail.label}-${detail.value}-${index}`}
                                    className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3"
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

export const renderMarkdown = (md: string, ctx: RenderContext): React.ReactNode => {
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

