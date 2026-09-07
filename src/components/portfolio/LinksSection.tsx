import React from 'react';
import { ArrowUpRight, BookOpen, Code, Github, Globe, Mail } from 'lucide-react';
import { ScrollDock } from './ScrollDock';

export const LINKS_TRANSITION_SECTION_ID = 'links-card-transition';
const ICONS = { GitHub: Github, Blog: BookOpen, Docs: Code, Email: Mail };

export const LinksSection: React.FC<{ title: string; markdown: string }> = ({ title, markdown }) => {
    const links = markdown.split('\n').flatMap(line => {
        const match = line.match(/^\s*-\s+([^:]+):\s*(.+)\s*$/);
        if (!match) return [];
        const [, label, value] = match;
        const href = label === 'Email' ? `mailto:${value.trim()}` : value.trim();
        if (!/^(https?:\/\/|mailto:)/i.test(href)) return [];
        return [{ label, href, display: value.trim().replace(/^https?:\/\//, '') }];
    });

    return (
        <ScrollDock stageId={LINKS_TRANSITION_SECTION_ID} heading={
            <div className="mb-10 md:mb-14">
                <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.05]">{title}</h2>
                <p className="mt-5 text-sm text-white/50">코드와 기록, 그리고 새로운 대화.</p>
            </div>
        }>
            <div className="relative overflow-hidden rounded-[28px] border border-cyan-200/20 bg-[#101923] shadow-[0_32px_100px_rgba(0,0,0,0.4)]">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.12),transparent_65%)]" />
                <div className="relative flex items-center justify-between gap-4 border-b border-white/10 px-6 py-5 md:px-9">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-cyan-100/60">Stay connected</span>
                    <Globe size={20} className="text-cyan-200/60" aria-hidden="true" />
                </div>
                <div className="relative p-6 md:p-9">
                    <p className="text-2xl font-bold tracking-tight text-white md:text-4xl">Park Achieveone<span className="text-cyan-300">.</span></p>
                    <p className="mt-2 text-sm text-white/45">Unity Game Developer</p>
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                        {links.map(link => {
                            const Icon = ICONS[link.label as keyof typeof ICONS] ?? Globe;
                            const external = !link.href.startsWith('mailto:');
                            return (
                                <a key={link.label} href={link.href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
                                    className="group flex min-h-20 min-w-0 items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-cyan-200/40 hover:bg-cyan-200/[0.06]">
                                    <Icon size={22} className="shrink-0 text-cyan-200/80" aria-hidden="true" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-white">{link.label}</span>
                                        <span className="mt-1 block text-xs text-white/45">{link.display}</span>
                                    </span>
                                    <ArrowUpRight size={16} className="shrink-0 text-white/30 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                                </a>
                            );
                        })}
                    </div>
                </div>
            </div>
        </ScrollDock>
    );
};
