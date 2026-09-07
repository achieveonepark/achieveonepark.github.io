import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'framer-motion';
import { CHAPTER_SCROLL_OFFSET, useDesktopLayout } from './layout';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => value * value * (3 - 2 * value);

/** A fixed-size surface enters at center, then follows its in-flow destination. */
export const ScrollDock: React.FC<{
    stageId: string;
    heading: React.ReactNode;
    children: React.ReactNode;
    onReveal?: () => void;
}> = ({ stageId, heading, children, onReveal }) => {
    const desktop = useDesktopLayout();
    const reduced = useReducedMotion();
    const cinematic = desktop && !reduced;
    const dockRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const headingRef = useRef<HTMLDivElement>(null);
    const revealRef = useRef(onReveal);
    revealRef.current = onReveal;

    useEffect(() => {
        if (!cinematic) {
            revealRef.current?.();
            return;
        }
        const dock = dockRef.current;
        const card = cardRef.current;
        const headingEl = headingRef.current;
        const stage = document.getElementById(stageId);
        const section = dock?.closest('section');
        if (!dock || !card || !headingEl || !stage || !section) return;

        let target = { start: 0, arrival: 1, left: 0, top: 0, width: 1, height: 1, scale: 1, centerX: 0, centerY: 0 };
        let frame = 0;
        let lastTime = 0;
        let progress = 0;
        let revealed = false;
        const readProgress = () => clamp((window.scrollY - target.start) / (target.arrival - target.start));
        const render = (time: number) => {
            frame = 0;
            const desired = readProgress();
            const delta = lastTime ? Math.min(64, time - lastTime) : 16;
            lastTime = time;
            progress += (desired - progress) * (1 - Math.exp(-delta / 90));
            if (Math.abs(desired - progress) < 0.0001) progress = desired;
            const fade = ease(clamp(progress / 0.22));
            const move = ease(clamp((progress - 0.3) / 0.7));
            const scale = target.scale + (1 - target.scale) * move;
            const x = target.centerX + (target.left - target.centerX) * move;
            const vertical = ease(clamp((progress - 0.72) / 0.28));
            const y = target.centerY + (target.top - window.scrollY - target.centerY) * vertical;
            const visible = fade > 0 && y + target.height * scale > CHAPTER_SCROLL_OFFSET && y < window.innerHeight;
            const ready = progress === 1 && visible;
            card.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
            card.style.opacity = visible ? String(fade) : '0';
            card.style.visibility = visible ? 'visible' : 'hidden';
            card.style.pointerEvents = ready ? 'auto' : 'none';
            card.inert = !ready;
            headingEl.inert = progress < 1;
            headingEl.style.opacity = String(ease(clamp((progress - 0.7) / 0.3)));
            if (visible && !revealed) {
                revealed = true;
                revealRef.current?.();
            }
            if (progress !== desired) frame = requestAnimationFrame(render);
            else lastTime = 0;
        };
        const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
        const measure = () => {
            const rect = dock.getBoundingClientRect();
            const start = stage.getBoundingClientRect().top + window.scrollY - CHAPTER_SCROLL_OFFSET;
            const scale = Math.min(1.2, (window.innerWidth - 96) / rect.width, (window.innerHeight - CHAPTER_SCROLL_OFFSET - 80) / rect.height);
            target = {
                start, arrival: Math.max(start + 1, section.getBoundingClientRect().top + window.scrollY - CHAPTER_SCROLL_OFFSET),
                left: rect.left, top: rect.top + window.scrollY, width: rect.width, height: rect.height, scale,
                centerX: (window.innerWidth - rect.width * scale) / 2,
                centerY: CHAPTER_SCROLL_OFFSET + (window.innerHeight - CHAPTER_SCROLL_OFFSET - rect.height * scale) / 2,
            };
            card.style.width = `${rect.width}px`;
            progress = readProgress();
            schedule();
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(dock);
        observer.observe(stage);
        if (section.parentElement) observer.observe(section.parentElement);
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', measure);
        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', measure);
            if (frame) cancelAnimationFrame(frame);
            headingEl.style.opacity = '';
            headingEl.inert = false;
        };
    }, [cinematic, stageId]);

    return (
        <div>
            <div ref={headingRef} style={{ opacity: cinematic ? 0 : 1 }}>{heading}</div>
            <div ref={dockRef} data-scroll-dock={stageId} className={cinematic ? 'invisible' : ''} aria-hidden={cinematic || undefined}>
                {cinematic ? <div inert="">{children}</div> : children}
            </div>
            {cinematic && createPortal(
                <div ref={cardRef} data-scroll-surface={stageId} className="portfolio-site fixed left-0 top-0 z-20 text-white/90 font-sans"
                    style={{ opacity: 0, visibility: 'hidden', transformOrigin: 'top left', willChange: 'transform, opacity', pointerEvents: 'none' }}>
                    {children}
                </div>, document.body,
            )}
        </div>
    );
};
