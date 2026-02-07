import React, { useState, useEffect } from 'react';
import { GodName, GODS } from '../constants';
import { generateGodDialogue, generateBoonName } from '../services/geminiService';
import { Loader2, Sparkles } from 'lucide-react';
import { BoonMechanic, Boon } from '../types';

interface BoonSelectorProps {
  onSelect: (mechanic: BoonMechanic, name: string) => void;
}

const AVAILABLE_MECHANICS: BoonMechanic[] = [
    'multishot', 'rapid', 'homing', 'orbital', 'lightning', 'heal'
];

export const BoonSelector: React.FC<BoonSelectorProps> = ({ onSelect }) => {
  const [loading, setLoading] = useState(true);
  const [god, setGod] = useState<GodName>('Zeus');
  const [dialogue, setDialogue] = useState('');
  const [options, setOptions] = useState<Array<{name: string, description: string, mechanic: BoonMechanic}>>([]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      const randomGod = GODS[Math.floor(Math.random() * GODS.length)];
      if(mounted) setGod(randomGod);

      // Pick 3 unique random mechanics
      const shuffled = [...AVAILABLE_MECHANICS].sort(() => 0.5 - Math.random());
      const selectedMechanics = shuffled.slice(0, 3);

      const [dial, ...boonData] = await Promise.all([
        generateGodDialogue(randomGod, 50),
        ...selectedMechanics.map(m => generateBoonName(randomGod, m))
      ]);

      if(mounted) {
        setDialogue(dial);
        setOptions(selectedMechanics.map((m, i) => ({
            ...boonData[i],
            mechanic: m
        })));
        setLoading(false);
      }
    };

    init();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-amber-500 gap-4 animate-pulse">
        <Loader2 className="w-12 h-12 animate-spin" />
        <p className="font-display text-lg tracking-widest">올림포스와 교신 중...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-8 animate-fade-in">
      {/* God Dialogue Header */}
      <div className="mb-10 text-center relative">
        <div className="absolute -inset-4 bg-amber-500/10 blur-xl rounded-full"></div>
        <h2 className="relative text-4xl font-display font-bold text-amber-400 mb-4 uppercase tracking-wider drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">
            {god}
        </h2>
        <p className="relative text-lg text-amber-100 font-serif italic leading-relaxed max-w-lg mx-auto border-l-4 border-amber-600 pl-4 bg-gradient-to-r from-amber-900/30 to-transparent py-2 break-keep">
          "{dialogue}"
        </p>
      </div>

      {/* Boon Options */}
      <div className="grid gap-4">
        {options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(opt.mechanic, opt.name)}
            className="group relative flex flex-col items-start p-6 bg-slate-900 border border-slate-700 hover:border-amber-400 hover:bg-slate-800 transition-all duration-300 rounded-sm text-left overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/0 to-amber-500/0 group-hover:from-amber-500/10 group-hover:via-transparent group-hover:to-transparent transition-all duration-500" />
            
            <div className="flex items-center gap-3 mb-1 z-10">
                <Sparkles className="w-5 h-5 text-amber-400 group-hover:animate-spin-slow" />
                <h3 className="text-xl font-bold text-slate-200 group-hover:text-amber-300 font-display uppercase tracking-wide">
                    {opt.name}
                </h3>
            </div>
            
            <p className="text-slate-400 text-sm group-hover:text-slate-300 z-10 break-keep">
                {opt.description}
            </p>
            
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 font-bold text-sm tracking-widest uppercase border border-amber-500 px-3 py-1 rounded-full">
                선택
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};