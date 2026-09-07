import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { ArrowUpRight, Monitor, Github, Mail, BookOpen, Code } from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ProjectsTVSection, PROJECTS_TRANSITION_SECTION_ID } from './ProjectsTVSection';
import bundledPortfolioDocuments from 'virtual:portfolio-content';
import { PROFILE_TRANSITION_SECTION_ID } from './AboutProfileSection';
import { renderMarkdown, renderAboutSection, extractYoutubeListItem } from './portfolio/markdown';
import type { LoadedSection } from './portfolio/types';
import { CareerPhoneSection, PHONE_TRANSITION_SECTION_ID } from './portfolio/CareerPhoneSection';
import { TechStackSection, TECH_TRANSITION_SECTION_ID } from './portfolio/TechStackSection';
import { LinksSection, LINKS_TRANSITION_SECTION_ID } from './portfolio/LinksSection';
import { CHAPTER_SCROLL_OFFSET, useDesktopLayout } from './portfolio/layout';

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
    'portfolio_full.md', // omitted from chapter navigation and content
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

// ============================================================================
// Component
// ============================================================================

export const PortfolioSite: React.FC<PortfolioSiteProps> = ({ onEnterOS }) => {
    const [activeSlug, setActiveSlug] = useState<string | null>(null);
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
            nav.scrollTo({ left: nav.scrollLeft + itemRect.left - navRect.left - (nav.clientWidth - itemRect.width) / 2, behavior: 'auto' });
        }
    }, [activeSlug]);

    const scrollToSection = useCallback((slug: string) => {
        const el = document.getElementById(slug);
        if (el) {
            setActiveSlug(slug);
            el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        }
    }, []);

    const visibleSections = sections.filter(
        s => !DEFAULT_COLLAPSED.includes(s.rel) && !PHONE_APP_SECTIONS.includes(s.rel),
    );
    const phoneApps = sections.filter(s => PHONE_APP_SECTIONS.includes(s.rel));
    const prefersReducedMotion = useReducedMotion();
    const isDesktop = useDesktopLayout();

    return (
        <div className="portfolio-site relative min-h-screen w-full bg-neutral-950 text-white/90 font-sans">
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
                            className="group inline-flex shrink-0 whitespace-nowrap items-center gap-2 h-11 px-3 md:px-4 rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/15 hover:border-cyan-300/50 transition text-xs md:text-sm font-semibold tracking-wide"
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
                        <div className="flex items-center gap-1.5 py-1 whitespace-nowrap">
                            {visibleSections.map(s => (
                                <button
                                    key={s.slug}
                                    ref={node => {
                                        chapterNavItemRefs.current[s.slug] = node;
                                    }}
                                    type="button"
                                    onClick={() => scrollToSection(s.slug)}
                                    aria-current={activeSlug === s.slug ? 'location' : undefined}
                                    className={`shrink-0 min-h-11 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition ${
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
                        className={prefersReducedMotion ? 'hidden' : 'hidden lg:block lg:h-[170vh]'}
                        aria-hidden="true"
                    />
                )}

                {/* Chapters */}
                {visibleSections.map(section => (
                    <React.Fragment key={section.slug}>
                    {(section.rel === 'skills.md' || section.rel === 'links.md') && (
                        <div
                            id={section.rel === 'skills.md' ? TECH_TRANSITION_SECTION_ID : LINKS_TRANSITION_SECTION_ID}
                            className={prefersReducedMotion ? 'hidden' : 'hidden lg:block lg:h-[170vh]'}
                            aria-hidden="true"
                        />
                    )}
                    {section.rel === 'projects.md' && projectVideos.length > 0 && (
                        <div
                            id={PROJECTS_TRANSITION_SECTION_ID}
                            className={`relative hidden ${prefersReducedMotion ? '' : 'h-[220vh] lg:block'}`}
                            aria-hidden="true"
                        />
                    )}
                    <motion.section
                        id={section.slug}
                        className="border-t border-white/[0.06] py-12 md:py-32"
                        style={{ scrollMarginTop: CHAPTER_SCROLL_OFFSET }}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 'some', margin: '0px 0px 100px 0px' }}
                        variants={
                            // Reduced motion keeps the reveal, minus the movement:
                            // the transform-free variant is an opacity cross-fade,
                            // which is the gentler equivalent rather than nothing.
                            prefersReducedMotion || !isDesktop
                                ? SECTION_REVEAL_VARIANTS_NO_TRANSFORM
                                : ['about.md', 'skills.md', 'experience.md', 'projects.md', 'links.md'].includes(section.rel)
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
                            ) : section.rel === 'links.md' ? (
                                <LinksSection title={section.title} markdown={section.markdown} />
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
