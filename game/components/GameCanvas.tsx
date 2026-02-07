import React, { useRef, useEffect, useState } from 'react';
import { useGameLoop } from '../hooks/useGameLoop';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { Heart, Wind, Zap, Skull, Footprints } from 'lucide-react';
import { Boon } from '../types';
import { Joystick } from './Joystick';

interface GameCanvasProps {
  active: boolean;
  initialHp: number;
  depth: number;
  boons: Boon[];
  onGameOver: () => void;
  onRoomClear: (remainingHp: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ active, initialHp, depth, boons, onGameOver, onRoomClear }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for dynamic canvas sizing
  const [dimensions, setDimensions] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

  // Handle Resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        // Update state to trigger re-render with new canvas size
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };

    // Initial resize
    updateSize();

    // Use ResizeObserver for robust detection
    const observer = new ResizeObserver(() => updateSize());
    if (containerRef.current) observer.observe(containerRef.current);
    
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const { hudState, metrics, resetGame, setJoystickInput, triggerDash } = useGameLoop(
      canvasRef, 
      active, 
      initialHp, 
      depth, 
      boons, 
      onGameOver, 
      onRoomClear
  );

  useEffect(() => {
     if (active && hudState.hp <= 0) {
         resetGame();
     }
  }, [active]);

  return (
    <div ref={containerRef} className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl border-4 border-slate-800 bg-black flex items-center justify-center">
      {/* Canvas now uses dynamic dimensions and fills the container without forcing aspect ratio */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block bg-black touch-none"
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 right-4 flex flex-col gap-2 pointer-events-none">
        <div className="flex justify-between w-full">
            {/* Left Side: Stats */}
            <div className="flex flex-col gap-2">
                {/* HP Bar */}
                <div className="flex items-center gap-2">
                    <div className="bg-slate-900/80 p-1 rounded-full border border-red-900">
                        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                    </div>
                    <div className="w-32 md:w-48 h-6 bg-slate-900/80 rounded-sm border border-slate-700 relative overflow-hidden">
                        <div 
                            className="h-full bg-red-600 transition-all duration-200"
                            style={{ width: `${Math.max(0, hudState.hp)}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white shadow-black drop-shadow-md">
                            {Math.ceil(hudState.hp)} / 100
                        </span>
                    </div>
                </div>

                {/* Dash Indicator */}
                <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-full border transition-colors duration-200 ${hudState.dashReady ? 'bg-amber-900/80 border-amber-500' : 'bg-slate-900/80 border-slate-700'}`}>
                        <Wind className={`w-4 h-4 ${hudState.dashReady ? 'text-amber-400' : 'text-slate-500'}`} />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:inline">
                        {hudState.dashReady ? '돌진 준비' : '충전 중'}
                    </span>
                </div>
            </div>

            {/* Right Side: Objective */}
            <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-700 px-4 py-2 rounded-lg">
                <Skull className="w-5 h-5 text-slate-400" />
                <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-widest hidden md:inline">남은 적</span>
                    <span className="text-xl font-display font-bold text-red-100">
                        {hudState.enemiesLeft}
                    </span>
                </div>
            </div>
        </div>
      </div>

      {/* Mobile Controls Overlay */}
      <div className="absolute bottom-8 left-8 pointer-events-auto md:hidden">
          <Joystick onMove={setJoystickInput} />
      </div>

      <div className="absolute bottom-8 right-8 pointer-events-auto md:hidden">
          <button 
             className={`w-20 h-20 rounded-full border-4 flex items-center justify-center active:scale-95 transition-transform ${hudState.dashReady ? 'bg-amber-600/50 border-amber-400 text-amber-100' : 'bg-slate-700/50 border-slate-600 text-slate-500'}`}
             onClick={triggerDash}
             onTouchStart={(e) => { e.preventDefault(); triggerDash(); }}
          >
              <Wind className="w-8 h-8" />
          </button>
      </div>

      {/* Debug Metrics (Desktop) */}
      <div className="absolute bottom-4 right-4 text-xs font-mono text-slate-600 pointer-events-none opacity-50 hidden md:block">
        FPS: {metrics.fps} | Depth: {depth}
      </div>

      {/* Controls Hint (Desktop) */}
      <div className="absolute bottom-4 left-4 text-xs text-slate-500 pointer-events-none font-display opacity-50 hidden md:block">
        [WASD] 이동 • [자동 공격] • [스페이스] 돌진
      </div>
    </div>
  );
};