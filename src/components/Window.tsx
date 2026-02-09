import React, { useContext, useRef } from 'react';
import { X, Minus, Maximize2, Square } from 'lucide-react';
import { OSContext } from '../context';
import type { WindowState } from '../types';
import { motion, useDragControls, type Variants } from 'framer-motion';

interface WindowProps {
  window: WindowState;
  children: React.ReactNode;
  constraintsRef?: React.RefObject<HTMLDivElement>;
}

export const Window: React.FC<WindowProps> = ({ window: winState, children, constraintsRef }) => {
  const { focusWindow, moveWindow, closeWindow, minimizeWindow, maximizeWindow } = useContext(OSContext);
  const dragControls = useDragControls();
  const windowRef = useRef<HTMLDivElement>(null);

  // Animation Variants
  const variants: Variants = {
    initial: {
      scale: 0.8,
      opacity: 0,
      y: typeof window !== 'undefined' ? window.innerHeight : 500,
      x: winState.x,
    },
    normal: {
      scale: 1,
      opacity: 1,
      x: winState.x,
      y: winState.y,
      width: winState.width,
      height: winState.height,
      transition: { type: "spring", stiffness: 300, damping: 25 }
    },
    maximized: {
      scale: 1,
      opacity: 1,
      x: 0,
      // Increased offset to 80px to safely clear the floating menu bar (top-4 + h-10 + extra padding)
      y: 80,
      width: "100%",
      height: "calc(100% - 80px)",
      borderRadius: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    },
    minimized: {
      scale: 0.1,
      opacity: 0,
      y: typeof window !== 'undefined' ? window.innerHeight + 100 : 500,
      x: winState.x,
      transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
    },
    exit: {
      scale: 0.9,
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  let currentState = "normal";
  if (winState.isMinimized) currentState = "minimized";
  else if (winState.isMaximized) currentState = "maximized";

  const handleDragEnd = () => {
    if (winState.isMaximized) return;

    // Calculate position based on the actual DOM rect after drag constraints
    // This ensures we save the constrained position (at the wall), not where the mouse went
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      moveWindow(winState.id, rect.x, rect.y);
    }
  };

  const startDrag = (e: React.PointerEvent) => {
    if (!winState.isMaximized) {
      dragControls.start(e);
      focusWindow(winState.id);
    }
  };

  return (
      <motion.div
          ref={windowRef}
          initial="initial"
          animate={currentState}
          exit="exit"
          variants={variants}
          // Cyberpunk Style: Dark glass, cyan border, glow
          className={`absolute flex flex-col overflow-hidden backdrop-blur-xl bg-black/70 
                 ${winState.isMaximized ? 'rounded-none border-none' : 'rounded-lg border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]'}`}
          style={{
            zIndex: winState.zIndex,
            pointerEvents: winState.isMinimized ? 'none' : 'auto',
          }}
          onMouseDown={() => focusWindow(winState.id)}
          drag={!winState.isMaximized}
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragConstraints={constraintsRef} // Confine to parent ref
          dragElastic={0} // Hard stop at edges (no bounce)
          onDragEnd={handleDragEnd}
      >
        {/* HUD Header */}
        <div
            className="h-9 bg-cyan-950/30 border-b border-cyan-500/20 flex items-center justify-between px-3 cursor-default select-none flex-shrink-0"
            onPointerDown={startDrag}
        >
          <div className="text-cyan-400 text-xs tracking-widest font-bold uppercase flex items-center">
            <span className="w-2 h-2 bg-cyan-500 rounded-full mr-2 animate-pulse"></span>
            {winState.title}
          </div>

          <div className="flex items-center space-x-1 window-controls" onPointerDown={(e) => e.stopPropagation()}>
            <button
                onClick={(e) => { e.stopPropagation(); minimizeWindow(winState.id); }}
                className="p-1 hover:text-yellow-400 text-cyan-700 transition-colors"
            >
              <Minus size={14} />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); maximizeWindow(winState.id); }}
                className="p-1 hover:text-green-400 text-cyan-700 transition-colors"
            >
              {winState.isMaximized ? <Square size={12} /> : <Maximize2 size={12} />}
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); closeWindow(winState.id); }}
                className="p-1 hover:text-red-500 text-cyan-700 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content Area - Transparent to show blur */}
        <div className="flex-1 overflow-hidden relative" onPointerDown={(e) => e.stopPropagation()}>
          {children}
        </div>
      </motion.div>
  );
};