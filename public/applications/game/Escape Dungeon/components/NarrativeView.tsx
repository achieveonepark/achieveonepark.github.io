import React, { useState, useEffect } from 'react';
import { NarrativeBlock } from '../types';
import { ChevronRight } from 'lucide-react';

interface NarrativeViewProps {
  data: NarrativeBlock;
  onComplete: () => void;
}

export const NarrativeView: React.FC<NarrativeViewProps> = ({ data, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  // Typewriter effect
  useEffect(() => {
    // Safety check for empty text
    const fullText = data.text || "...";
    
    setDisplayedText('');
    setIsTyping(true);
    let index = 0;
    
    // Fast typing speed
    const speed = fullText.length > 100 ? 5 : 10;

    const interval = setInterval(() => {
      if (index < fullText.length) {
        setDisplayedText((prev) => prev + fullText.charAt(index));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [data]);

  const handleSkip = () => {
    if (isTyping) {
      setDisplayedText(data.text || "...");
      setIsTyping(false);
    } else {
      onComplete();
    }
  };

  return (
    <div 
        className="flex-1 flex flex-col items-center justify-center p-8 bg-black/40 cursor-pointer"
        onClick={handleSkip}
    >
      <div className="max-w-3xl w-full space-y-6">
        {/* Speaker Name */}
        <div className="flex items-center gap-4">
            <div className={`
                h-1 w-12 rounded-full 
                ${data.speaker === '해설자' ? 'bg-slate-500' : 'bg-amber-500'}
            `} />
            <h3 className={`
                text-2xl font-display font-bold uppercase tracking-widest
                ${data.speaker === '해설자' ? 'text-slate-400' : 'text-amber-400'}
            `}>
                {data.speaker}
            </h3>
            <div className={`
                h-1 w-full rounded-r-full bg-gradient-to-r to-transparent
                ${data.speaker === '해설자' ? 'from-slate-800' : 'from-amber-900'}
            `} />
        </div>

        {/* Text Content */}
        <div className="min-h-[150px] relative">
            <p className="text-xl md:text-2xl font-serif leading-relaxed text-slate-200 drop-shadow-md break-keep">
                {displayedText}
                <span className={`inline-block w-2 h-6 ml-1 align-middle bg-slate-400 ${isTyping ? 'animate-pulse' : 'hidden'}`} />
            </p>
        </div>

        {/* Continue Prompt */}
        <div className={`
            flex justify-end transition-opacity duration-500
            ${!isTyping ? 'opacity-100' : 'opacity-0'}
        `}>
            <button className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors uppercase tracking-widest text-sm font-bold animate-bounce">
                계속하기 <ChevronRight className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  );
};