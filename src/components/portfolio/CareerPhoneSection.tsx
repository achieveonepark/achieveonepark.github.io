import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { LoadedSection } from './types';
import { renderMarkdown } from './markdown';
import { CHAPTER_SCROLL_OFFSET, useDesktopLayout } from './layout';

import logo111percent from '../../../images/111percent.png';
import logoSnowpipe from '../../../images/snowpipe.png';
import logoGridinc from '../../../images/gridinc.png';
import logoSnowballs from '../../../images/snowballs.png';
import logoDalcomsoft from '../../../images/dalcomsoft.png';

// Company logos, bundled as JS imports (not manifest `thumbnail` paths — those point at
// `/images/...`, which lives outside Vite's publicDir and 404s in production builds).
const COMPANY_LOGOS: Record<string, string> = {
    'experience/111percent.md': logo111percent,
    'experience/snowpipe.md': logoSnowpipe,
    'experience/gridinc.md': logoGridinc,
    'experience/snowballs.md': logoSnowballs,
    'experience/dalcomsoft.md': logoDalcomsoft,
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

// The layout shared by the phone column and the text column.
const PHONE_GRID_CLASS = 'grid gap-10 lg:gap-16 lg:grid-cols-[272px_1fr]';

// Must match PhoneFrame's `w-[260px] h-[544px]`.
const PHONE_FRAME_W = 260;
const PHONE_FRAME_H = 544;

export const PHONE_TRANSITION_SECTION_ID = 'phone-transition-stage';

// The phone stays hidden through Tech Stack, fades in at the center, then moves
// into the Experience column as the chapter is revealed.
export const CareerPhoneSection: React.FC<{
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
    const isDesktop = useDesktopLayout();
    const prefersReducedMotion = useReducedMotion();
    const showBgPhone = isDesktop && !prefersReducedMotion;

    const selectCompany = useCallback((index: number) => {
        setActiveIndex(index);
        const section = sectionContentRef.current?.closest('section');
        if (!section) return;

        const sectionTop = section.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
            top: Math.max(0, sectionTop - CHAPTER_SCROLL_OFFSET),
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
    }, [prefersReducedMotion]);

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
                <div className="flex flex-wrap gap-2 lg:hidden" aria-label="회사 선택">
                    {apps.map((app, index) => (
                        <button key={app.slug} type="button" aria-pressed={index === activeIndex}
                            onClick={() => selectCompany(index)}
                            className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition ${index === activeIndex ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-100' : 'border-white/15 text-white/70'}`}>
                            {app.title}
                        </button>
                    ))}
                </div>
                <div ref={dockSlotRef} className="hidden self-stretch lg:block">
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

                <div ref={detailsRef} className="career-details min-w-0">
                    <AnimatePresence mode="wait">
                        {active && (
                            <motion.div
                                key={active.slug}
                                initial={{ opacity: 0, x: isDesktop && !prefersReducedMotion ? 20 : 0 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: isDesktop && !prefersReducedMotion ? -20 : 0 }}
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

