import { useLanguage } from '../i18n/LanguageContext';
import { CHAPTER_SCROLL_OFFSET as CHAPTER_OFFSET, useDesktopLayout } from './portfolio/layout';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Play, Radio } from 'lucide-react';

export interface ProjectVideo {
    id: string;
    title: string;
    embed: string;
    summary: string;
    description: React.ReactNode;
}

const thumbnail = (embed: string) => `https://i.ytimg.com/vi/${embed.split('/').pop()}/hqdefault.jpg`;
const easeOut = (value: number) => 1 - Math.pow(1 - value, 3);
const clamp = (value: number) => Math.min(1, Math.max(0, value));
export const PROJECTS_TRANSITION_SECTION_ID = 'projects-tv-transition';

export const ProjectsTVSection: React.FC<{
    title: string;
    projects: ProjectVideo[];
}> = ({ title, projects }) => {
    const { t } = useLanguage();
    const [activeIndex, setActiveIndex] = useState(0);
    const isDesktop = useDesktopLayout();
    const [screenVisible, setScreenVisible] = useState(false);
    const [playerInRange, setPlayerInRange] = useState(false);
    const [settled, setSettled] = useState(false);
    const sceneRef = useRef<HTMLDivElement>(null);
    const dockRef = useRef<HTMLDivElement>(null);
    const televisionRef = useRef<HTMLDivElement>(null);
    const screenRef = useRef<HTMLDivElement>(null);
    const flashRef = useRef<HTMLDivElement>(null);
    const prefersReducedMotion = useReducedMotion();
    const cinematic = isDesktop && !prefersReducedMotion;
    const active = projects[activeIndex] ?? projects[0];

    const sceneOpacity = useMotionValue(0);
    const detailsOpacity = useMotionValue(0);
    const detailsY = useMotionValue(24);
    const titleOpacity = useMotionValue(0);
    const titleY = useMotionValue(32);
    const listOpacity = useMotionValue(0);
    const listX = useMotionValue(-284);
    const listY = useMotionValue(0);

    useEffect(() => {
        if (!cinematic) return;
        const transition = document.getElementById(PROJECTS_TRANSITION_SECTION_ID);
        const scene = sceneRef.current;
        const section = scene?.closest('section');
        const dock = dockRef.current;
        const television = televisionRef.current;
        if (!transition || !scene || !section || !dock || !television) return;

        let target = {
            fadeStart: 0, fadeEnd: 1, moveStart: 1, dockStart: 2, arrival: 3,
            left: 0, top: 0, width: 1, height: 1, sceneBottom: 0,
            centerLeft: 0, centerTop: 0, largeScale: 1,
        };
        const measure = () => {
            // Use the empty, untransformed slot; the floating TV never feeds
            // its animated geometry back into its own scroll timeline.
            const rect = dock.getBoundingClientRect();
            const sectionTop = section.getBoundingClientRect().top + window.scrollY;
            const fadeStart = transition.getBoundingClientRect().top + window.scrollY - CHAPTER_OFFSET;
            const fadeEnd = fadeStart + window.innerHeight * 0.5;
            const moveStart = Math.max(fadeEnd, sectionTop - window.innerHeight * 1.95);
            const largeScale = Math.min(
                1.5,
                (window.innerWidth - 96) / rect.width,
                (window.innerHeight - CHAPTER_OFFSET - 80) / rect.height,
            );
            target = {
                fadeStart, fadeEnd, moveStart,
                dockStart: Math.max(moveStart, sectionTop - window.innerHeight * 0.6),
                arrival: Math.max(moveStart + 1, sectionTop - CHAPTER_OFFSET),
                left: rect.left, top: rect.top + window.scrollY,
                width: rect.width, height: rect.height,
                sceneBottom: scene.getBoundingClientRect().bottom + window.scrollY,
                centerLeft: (window.innerWidth - rect.width * largeScale) / 2,
                centerTop: CHAPTER_OFFSET + (window.innerHeight - CHAPTER_OFFSET - rect.height * largeScale) / 2,
                largeScale,
            };
        };

        let raf = 0;
        let previousScroll = window.scrollY;
        let flashed = false;
        let flashAnimation: Animation | undefined;
        const apply = () => {
            raf = 0;
            const scroll = window.scrollY;
            const fade = easeOut(clamp((scroll - target.fadeStart) / (target.fadeEnd - target.fadeStart)));
            const move = clamp((scroll - target.moveStart) / (target.arrival - target.moveStart));
            const dockProgress = clamp((scroll - target.dockStart) / Math.max(1, target.arrival - target.dockStart));
            // Use the longer return interval without the abrupt ease-out start.
            const slide = move * move * (3 - 2 * move);
            const vertical = easeOut(clamp(dockProgress / 0.9));
            const scale = target.largeScale + (1 - target.largeScale) * slide;
            const left = target.centerLeft + (target.left - target.centerLeft) * slide;
            const top = target.centerTop + (target.top - scroll - target.centerTop) * vertical;
            const exit = clamp((target.sceneBottom - scroll - CHAPTER_OFFSET) / (window.innerHeight * 0.35));
            const visible = fade > 0 && exit > 0 && top + target.height * scale > CHAPTER_OFFSET;
            const ready = move === 1 && exit > 0;

            television.style.width = `${target.width}px`;
            television.style.transform = `translate3d(${left}px, ${top}px, 0) scale(${scale})`;
            television.style.opacity = visible ? String(fade * exit) : '0';
            television.style.visibility = visible ? 'visible' : 'hidden';
            television.style.pointerEvents = ready && visible ? 'auto' : 'none';
            television.inert = !ready || !visible;
            scene.inert = !ready;
            setPlayerInRange(visible);
            setSettled(ready);

            const reveal = easeOut(clamp((dockProgress - 0.45) / 0.5));
            // The channel panel begins a full column behind the opaque TV,
            // then slides right while the screen shrinks into its dock.
            const channels = easeOut(clamp((move - 0.42) / 0.58));
            sceneOpacity.set(exit);
            titleOpacity.set(reveal * exit);
            titleY.set((1 - reveal) * 32);
            detailsOpacity.set(reveal);
            detailsY.set((1 - reveal) * 24);
            listOpacity.set(clamp(channels * 3));
            listX.set((1 - channels) * -284);
            listY.set(top - (target.top - scroll));

            const flashAt = target.moveStart + (target.arrival - target.moveStart) * 0.06;
            if (scroll < target.fadeStart) flashed = false;
            if (!flashed && previousScroll < flashAt && scroll >= flashAt && move < 1 && visible) {
                flashed = true;
                flashAnimation?.cancel();
                // A timed, single pulse finishes even if the wheel stops here.
                flashAnimation = flashRef.current?.animate(
                    [{ opacity: 0 }, { opacity: 0.95, offset: 0.2 }, { opacity: 0 }],
                    { duration: 420, easing: 'ease-out' },
                );
            }
            if (!visible) flashAnimation?.cancel();
            previousScroll = scroll;
        };
        const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
        const onResize = () => { measure(); apply(); };
        measure();
        apply();
        const observer = new ResizeObserver(onResize);
        observer.observe(transition);
        observer.observe(scene);
        observer.observe(dock);
        if (section.parentElement) observer.observe(section.parentElement);
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize);
        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
            if (raf) cancelAnimationFrame(raf);
            flashAnimation?.cancel();
            scene.inert = false;
        };
    }, [cinematic, sceneOpacity, detailsOpacity, detailsY, titleOpacity, titleY, listOpacity, listX, listY]);

    useEffect(() => {
        const screen = screenRef.current;
        if (!screen) return;
        const observer = new IntersectionObserver(
            ([entry]) => setScreenVisible(entry.isIntersecting),
            { rootMargin: `-${CHAPTER_OFFSET}px 0px 0px 0px`, threshold: 0 },
        );
        observer.observe(screen);
        return () => observer.disconnect();
    }, [cinematic]);

    const playerMounted = screenVisible && (!cinematic || playerInRange);
    const interactive = !cinematic || settled;
    const selectProject = (index: number) => {
        setActiveIndex(index);
        if (!isDesktop) sceneRef.current?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    };

    const television = (
        <div
            ref={televisionRef}
            data-projects-tv
            className={cinematic ? 'fixed left-0 top-0 z-20 pb-7' : 'relative z-10 pb-7'}
            style={cinematic ? { opacity: 0, visibility: 'hidden', pointerEvents: 'none', transformOrigin: 'top left', willChange: 'transform, opacity' } : undefined}
        >
            <div className="pointer-events-none absolute inset-x-10 inset-y-4 rounded-full bg-cyan-400/[0.07] blur-3xl" />
            {/* Metal feet and a thin, dark TV bezel. */}
            <div aria-hidden="true" className="absolute bottom-0 left-[17%] h-10 w-2 origin-top rotate-[24deg] rounded-b-sm bg-gradient-to-r from-neutral-800 via-neutral-500 to-neutral-900" />
            <div aria-hidden="true" className="absolute bottom-0 right-[17%] h-10 w-2 origin-top -rotate-[24deg] rounded-b-sm bg-gradient-to-r from-neutral-900 via-neutral-500 to-neutral-800" />
            <div className="relative rounded-[14px] border border-white/20 bg-gradient-to-br from-[#42454b] via-[#141619] to-[#2d3035] p-[5px] shadow-[0_25px_65px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)]">
                <div ref={screenRef} className="relative aspect-video overflow-hidden rounded-[9px] bg-black" data-projects-screen>
                    <img
                        src={thumbnail(active.embed)}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                    />
                    {playerMounted && (
                        <iframe
                            key={active.id}
                            src={`${active.embed}?rel=0`}
                            title={`${active.title} — ${t('video')}`}
                            className="absolute inset-0 h-full w-full"
                            style={{ pointerEvents: interactive ? 'auto' : 'none' }}
                            tabIndex={interactive ? 0 : -1}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                        />
                    )}
                    <div
                        ref={flashRef}
                        data-projects-flash
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 z-10 opacity-0"
                        style={{ background: 'radial-gradient(ellipse at center, #fff 0%, #e0faff 55%, #67e8f9 100%)' }}
                    />
                </div>
                <div aria-hidden="true" className="relative flex h-5 items-center justify-center">
                    <span className="text-[7px] font-semibold tracking-[0.32em] text-white/35">ACHIEVEONE</span>
                    <span className="absolute right-3 h-1 w-1 rounded-full bg-cyan-300 shadow-[0_0_7px_rgba(103,232,249,0.7)]" />
                </div>
            </div>
        </div>
    );

    return (
        <div>
            {cinematic && createPortal(television, document.body)}
            <motion.div
                className="mb-10 flex items-end justify-between gap-6 md:mb-14"
                style={cinematic ? { opacity: titleOpacity, y: titleY } : { opacity: 1, y: 0 }}
            >
                <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.05]">
                    {title}
                </h2>
                <span className="hidden items-center gap-2 pb-2 text-[10px] uppercase tracking-[0.24em] text-white/35 sm:flex">
                    <Radio size={14} className="text-cyan-300/65" />
                    Select a channel
                </span>
            </motion.div>

            <div ref={sceneRef} className="relative scroll-mt-20" data-projects-scene>
                <motion.div
                    className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_252px]"
                    style={{ opacity: cinematic ? sceneOpacity : 1 }}
                >
                    <div className="min-w-0">
                        {cinematic ? (
                            <div ref={dockRef} className="invisible pb-7" aria-hidden="true" data-projects-dock>
                                <div className="border p-[5px]">
                                    <div className="aspect-video" />
                                    <div className="h-5" />
                                </div>
                            </div>
                        ) : television}

                        <motion.div
                            className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-5 py-4 sm:px-6"
                            style={cinematic ? { opacity: detailsOpacity, y: detailsY } : { opacity: 1, y: 0 }}
                            aria-live="polite"
                            aria-atomic="true"
                            data-project-description
                        >
                            <div className="mb-2 flex items-center justify-between gap-4">
                                <span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-cyan-200/65">On screen · {String(activeIndex + 1).padStart(2, '0')}</span>
                                <a href={active.embed.replace('/embed/', '/watch?v=')} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[10px] text-white/40 transition hover:text-cyan-200">
                                    {t('youtube')} <ArrowUpRight size={12} />
                                </a>
                            </div>
                            <h3 className="mb-3 text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">{active.title}</h3>
                            <div className="text-sm text-white/60 [&_ul]:my-0 [&_ul]:space-y-1 [&_ul]:text-sm [&_li]:leading-6 [&_li]:pl-4 [&_li>span]:top-[10px]">
                                {active.description}
                            </div>
                        </motion.div>
                    </div>

                    <motion.aside
                        aria-label={t('project')}
                        className="relative z-0 min-w-0"
                        style={cinematic ? { opacity: listOpacity, x: listX, y: listY, pointerEvents: interactive ? 'auto' : 'none' } : { opacity: 1, x: 0, y: 0 }}
                    >
                        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/60">Project channels</span>
                            <span className="font-mono text-[10px] text-white/30">{String(projects.length).padStart(2, '0')}</span>
                        </div>
                        <div className="space-y-3">
                            {projects.map((project, index) => {
                                const selected = index === activeIndex;
                                return (
                                    <button
                                        key={project.id}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => selectProject(index)}
                                        tabIndex={interactive ? 0 : -1}
                                        className={`group flex w-full items-start gap-3 rounded-xl border p-3 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${selected ? 'border-cyan-300/40 bg-cyan-300/[0.08] shadow-[0_0_25px_rgba(103,232,249,0.04)]' : 'border-white/[0.08] bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.05]'}`}
                                    >
                                        <div className="relative mt-0.5 aspect-video w-[72px] shrink-0 overflow-hidden rounded-md bg-neutral-900">
                                            <img src={thumbnail(project.embed)} alt="" loading="lazy" className={`h-full w-full object-cover transition ${selected ? 'opacity-90' : 'opacity-55 group-hover:opacity-85'}`} />
                                            <span className="absolute inset-0 flex items-center justify-center bg-black/15"><Play size={13} className={selected ? 'fill-white text-white' : 'text-white/70'} /></span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className={`mb-1 font-mono text-[9px] tracking-wider ${selected ? 'text-cyan-200' : 'text-white/30'}`}>CH {String(index + 1).padStart(2, '0')}</div>
                                            <div className={`text-[12px] font-semibold leading-[1.5] ${selected ? 'text-white' : 'text-white/70'}`}>{project.title}</div>
                                            <div className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-white/35">{project.summary}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-5 text-[10px] leading-relaxed text-white/30">{t('projectHint')}</p>
                    </motion.aside>
                </motion.div>
            </div>
        </div>
    );
};
