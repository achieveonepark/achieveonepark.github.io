import React, { useState } from 'react';
import { Braces } from 'lucide-react';
import { ScrollDock } from './ScrollDock';

export const TECH_TRANSITION_SECTION_ID = 'tech-stack-transition';

const TECH_STACK_GROUPS = [
    { key: 'engine', values: ['Unity'] },
    { key: 'language', values: ['C#', '.NET'] },
    { key: 'platforms', values: ['Steam', 'WebGL', 'Android', 'iOS'] },
    { key: 'services', values: ['Firebase'] },
];

export const TechStackSection: React.FC<{ title: string }> = ({ title }) => {
    const [typingStarted, setTypingStarted] = useState(false);
    const [typingRun, setTypingRun] = useState(0);

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
        <ScrollDock stageId={TECH_TRANSITION_SECTION_ID} onReveal={() => setTypingStarted(true)} heading={
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
                        className="rounded-full border border-cyan-300/20 min-h-11 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-cyan-100/60 transition hover:border-cyan-300/45 hover:text-cyan-100"
                    >
                        replay
                    </button>
                </div>
            </div>

            }>
            <div
                className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#101826]/95 shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
            >
                <div className="flex h-11 items-center gap-2 border-b border-white/[0.07] bg-white/[0.025] px-5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                    <span className="ml-3 text-[10px] uppercase tracking-[0.2em] text-white/30">stack.ts</span>
                </div>

                <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
                <div className="tech-stack-code relative min-h-0 md:min-h-[340px] overflow-x-auto px-5 py-8 font-mono text-[14px] leading-8 sm:px-9 sm:py-10 md:text-[17px] md:leading-9">
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
            </div>
        </ScrollDock>
    );
};

