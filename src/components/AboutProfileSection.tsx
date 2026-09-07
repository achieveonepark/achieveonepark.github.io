import { CHAPTER_SCROLL_OFFSET as CHAPTER_OFFSET, useDesktopLayout } from './portfolio/layout';
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import profileImage from '../../images/profile.png';

export const PROFILE_TRANSITION_SECTION_ID = 'profile-card-transition';
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => value * value * (3 - 2 * value);
const CARD_SURFACE = 'border border-cyan-400/20 bg-[linear-gradient(135deg,#10252d,#111827_55%,#10232c)] shadow-[0_24px_70px_rgba(0,0,0,0.3)]';

export const AboutProfileSection: React.FC<{
    title: React.ReactNode;
    name: string;
    career: string;
    badge: string;
    profileContent: React.ReactNode;
    children: React.ReactNode;
}> = ({ title, name, career, badge, profileContent, children }) => {
    const prefersReducedMotion = useReducedMotion();
    const isDesktop = useDesktopLayout();
    const cinematic = isDesktop && !prefersReducedMotion;
    const contentRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const dockRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const surfaceRef = useRef<HTMLDivElement>(null);
    const compactRef = useRef<HTMLDivElement>(null);
    const expandedRef = useRef<HTMLDivElement>(null);
    const hintRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!cinematic) return;
        const transition = document.getElementById(PROFILE_TRANSITION_SECTION_ID);
        const content = contentRef.current;
        const section = content?.closest('section');
        const dock = dockRef.current;
        const card = cardRef.current;
        if (!transition || !content || !section || !dock || !card) return;

        let target = {
            start: 0, arrival: 1, dockStart: 0,
            left: 0, top: 0, width: 1, height: 1,
            compactWidth: 420, compactHeight: 210,
        };
        const measure = () => {
            // Measure the in-flow destination only on layout changes. The floating
            // layers retain fixed dimensions; scrolling never reflows their text.
            const rect = dock.getBoundingClientRect();
            const sectionTop = section.getBoundingClientRect().top + window.scrollY;
            const start = transition.getBoundingClientRect().top + window.scrollY - CHAPTER_OFFSET + window.innerHeight * 0.18;
            target = {
                start,
                arrival: Math.max(start + 1, Math.floor(sectionTop - CHAPTER_OFFSET)),
                dockStart: Math.max(start, sectionTop - window.innerHeight * 0.75),
                left: rect.left, top: rect.top + window.scrollY,
                width: rect.width, height: rect.height,
                compactWidth: Math.min(420, window.innerWidth - 40),
                compactHeight: 210,
            };
            card.style.width = `${target.width}px`;
            card.style.height = `${target.height}px`;
            if (hintRef.current) hintRef.current.style.width = `${target.compactWidth}px`;
            if (compactRef.current) {
                compactRef.current.style.width = `${target.compactWidth}px`;
                compactRef.current.style.height = `${target.compactHeight}px`;
            }
        };

        let raf = 0;
        let previousTime = 0;
        let renderedProgress = 0;
        const readProgress = () => clamp((window.scrollY - target.start) / (target.arrival - target.start));
        const apply = (time: number) => {
            raf = 0;
            const scroll = window.scrollY;
            const desired = readProgress();
            // Time-based damping fills the gaps between wheel events, independent
            // of refresh rate. Stop requesting frames once the target is reached.
            const delta = previousTime ? Math.min(time - previousTime, 64) : 16;
            previousTime = time;
            renderedProgress += (desired - renderedProgress) * (1 - Math.exp(-delta / 90));
            if (Math.abs(desired - renderedProgress) < 0.0001) renderedProgress = desired;
            const progress = renderedProgress;
            const unfold = ease(progress);
            const animatedScroll = target.start + progress * (target.arrival - target.start);
            const dockProgress = clamp((animatedScroll - target.dockStart) / Math.max(1, target.arrival - target.dockStart));
            const vertical = ease(clamp(dockProgress / 0.75));
            const width = target.compactWidth + (target.width - target.compactWidth) * unfold;
            const height = target.compactHeight + (target.height - target.compactHeight) * unfold;
            const centerLeft = (window.innerWidth - target.compactWidth) / 2;
            const centerTop = CHAPTER_OFFSET + (window.innerHeight - CHAPTER_OFFSET - height) / 2;
            const left = centerLeft + (target.left - centerLeft) * unfold;
            const top = centerTop + (target.top - scroll - centerTop) * vertical;
            const visible = top + height > CHAPTER_OFFSET && top < window.innerHeight;
            const reveal = ease(clamp((dockProgress - 0.5) / 0.45));

            if (surfaceRef.current) {
                surfaceRef.current.style.transform = `scale(${width / target.width}, ${height / target.height})`;
            }
            card.style.transform = `translate3d(${left}px, ${top}px, 0)`;
            card.style.visibility = visible ? 'visible' : 'hidden';
            card.style.opacity = visible ? '1' : '0';
            if (compactRef.current) {
                compactRef.current.style.opacity = String(1 - clamp(progress / 0.22));
                compactRef.current.inert = progress > 0.15 || !visible;
                compactRef.current.setAttribute('aria-hidden', String(progress >= 0.3 || !visible));
            }
            if (expandedRef.current) {
                expandedRef.current.style.opacity = String(clamp((progress - 0.22) / 0.28));
                const contentScale = Math.min(width / target.width, height / target.height);
                expandedRef.current.style.transform = `scale(${contentScale})`;
                expandedRef.current.setAttribute('aria-hidden', String(progress < 0.3 || !visible));
                expandedRef.current.inert = progress < 1 || !visible;
            }
            if (hintRef.current) {
                hintRef.current.style.opacity = String(1 - clamp(progress / 0.2));
                hintRef.current.style.transform = `translate3d(${(width - target.compactWidth) / 2}px, ${height - target.height}px, 0)`;
            }
            content.style.opacity = String(reveal);
            content.inert = reveal < 0.95;
            if (titleRef.current) titleRef.current.style.transform = `translate3d(0, ${(1 - reveal) * 24}px, 0)`;
            if (renderedProgress !== desired) raf = requestAnimationFrame(apply);
            else previousTime = 0;
        };
        const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
        const onResize = () => {
            measure();
            renderedProgress = readProgress();
            onScroll();
        };
        onResize();
        const observer = new ResizeObserver(onResize);
        observer.observe(transition);
        observer.observe(dock);
        observer.observe(section);
        if (section.parentElement) observer.observe(section.parentElement);
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize);
        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
            if (raf) cancelAnimationFrame(raf);
            content.style.opacity = '';
            content.inert = false;
            if (titleRef.current) titleRef.current.style.transform = '';
        };
    }, [cinematic]);

    const expandProfile = () => contentRef.current?.closest('section')?.scrollIntoView({
        block: 'start', behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
    const portrait = (className: string) => (
        <img src={profileImage} alt={`${name} profile photo`} className={`shrink-0 rounded-2xl border border-white/10 object-cover object-top ${className}`} loading="eager" />
    );
    const fullProfile = (
        <div className="p-6 md:p-8">
            <div className="mb-6 flex items-center gap-5 md:gap-6">
                {portrait('h-[100px] w-20 md:h-[120px] md:w-24')}
                <div className="min-w-0">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/70">{badge}</div>
                    <h3 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{name}</h3>
                    <p className="mt-2 text-sm font-semibold text-cyan-200/90 md:text-lg">{career}</p>
                </div>
            </div>
            {profileContent}
        </div>
    );

    return (
        <div ref={contentRef} data-about-content style={{ opacity: cinematic ? 0 : 1 }}>
            {cinematic && createPortal(
                <div
                    ref={cardRef}
                    data-profile-card
                    className="fixed left-0 top-0 z-20"
                    style={{ opacity: 0, visibility: 'hidden', willChange: 'transform', pointerEvents: 'none' }}
                >
                    <div ref={surfaceRef} aria-hidden="true" className={`absolute inset-0 origin-top-left rounded-[28px] ${CARD_SURFACE}`} style={{ willChange: 'transform' }}>
                        <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.12),transparent_65%)]" />
                    </div>
                    <div className="relative h-full">
                        <div ref={expandedRef} data-profile-expanded className="relative origin-top-left opacity-0 pointer-events-auto" style={{ willChange: 'transform, opacity' }}>{fullProfile}</div>
                        <div ref={compactRef} data-profile-compact className="absolute left-0 top-0 p-6 pointer-events-auto" style={{ willChange: 'opacity' }}>
                            <div className="mb-5 flex items-center justify-between text-[9px] font-medium uppercase tracking-[0.2em] text-white/40">
                                <span className="text-cyan-200/70">{badge}</span><span>Portfolio · 2026</span>
                            </div>
                            <div className="flex items-center gap-4">
                                {portrait('h-[70px] w-14')}
                                <div>
                                    <p className="text-2xl font-bold tracking-tight text-white">{name}</p>
                                    <p className="mt-1.5 text-[13px] text-cyan-100/75">{career}</p>
                                </div>
                            </div>
                            <div className="mt-5 flex items-center justify-between border-t border-white/[0.08] pt-3">
                                <span className="text-[9px] uppercase tracking-[0.16em] text-white/35">Park Achieveone</span>
                                <button type="button" onClick={expandProfile} className="inline-flex items-center gap-1.5 rounded-sm text-[11px] text-cyan-100/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                                    Explore my profile <ArrowUpRight size={13} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div ref={hintRef} aria-hidden="true" className="absolute inset-x-0 top-full flex items-center justify-center gap-2 pt-6 text-[9px] tracking-[0.12em] text-white/35">
                        Scroll to explore <ArrowDown size={12} />
                    </div>
                </div>,
                document.body,
            )}

            <h2 ref={titleRef} className="text-4xl md:text-6xl lg:text-7xl font-black text-white mt-0 mb-8 tracking-tight leading-[1.05]">{title}</h2>
            <div ref={dockRef} data-profile-dock aria-hidden={cinematic || undefined} className={`mb-8 overflow-hidden rounded-[28px] ${CARD_SURFACE} ${cinematic ? 'invisible' : ''}`}>
                {fullProfile}
            </div>
            {children}
        </div>
    );
};
