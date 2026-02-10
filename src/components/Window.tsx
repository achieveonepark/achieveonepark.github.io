import React, { useContext, useEffect, useRef } from 'react';
import { X, Minus, Maximize2, Square } from 'lucide-react';
import { OSContext } from '../context';
import type { WindowState } from '../types';
import { motion, useDragControls, type Variants } from 'framer-motion';

interface WindowProps {
  window: WindowState;
  children: React.ReactNode;
  constraintsRef?: React.RefObject<HTMLDivElement>;
  topOffset?: number;
  dockOffset?: number;
}

export const Window: React.FC<WindowProps> = ({ window: winState, children, constraintsRef, topOffset = 20, dockOffset = 150 }) => {
  const { focusWindow, moveWindow, resizeWindow, closeWindow, minimizeWindow, maximizeWindow } = useContext(OSContext);
  const dragControls = useDragControls();
  const windowRef = useRef<HTMLDivElement>(null);
  const resizeSessionRef = useRef<{
    edge: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  const MIN_WIDTH = 320;
  const MIN_HEIGHT = 220;

  const [viewportSize, setViewportSize] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  });

  useEffect(() => {
    const onResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const maximizedHeight = Math.max(MIN_HEIGHT, viewportSize.height - topOffset - dockOffset);

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
      transition: { type: "tween", duration: 0.08, ease: 'linear' }
    },
    maximized: {
      scale: 1,
      opacity: 1,
      x: 0,
      y: topOffset,
      width: viewportSize.width,
      height: maximizedHeight,
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

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number; y: number } }) => {
    if (winState.isMaximized) return;

    moveWindow(winState.id, winState.x + info.offset.x, winState.y + info.offset.y);
  };

  const startDrag = (e: React.PointerEvent) => {
    if (!winState.isMaximized) {
      dragControls.start(e);
      focusWindow(winState.id);
    }
  };

  const handleResizeMove = (e: MouseEvent) => {
    const session = resizeSessionRef.current;
    if (!session || winState.isMaximized) return;

    const dx = e.clientX - session.startX;
    const dy = e.clientY - session.startY;
    const edge = session.edge;

    let nextX = session.startLeft;
    let nextY = session.startTop;
    let nextWidth = session.startWidth;
    let nextHeight = session.startHeight;

    if (edge.includes('e')) {
      nextWidth = Math.max(MIN_WIDTH, session.startWidth + dx);
    }

    if (edge.includes('s')) {
      nextHeight = Math.max(MIN_HEIGHT, session.startHeight + dy);
    }

    if (edge.includes('w')) {
      const candidateWidth = session.startWidth - dx;
      nextWidth = Math.max(MIN_WIDTH, candidateWidth);
      nextX = session.startLeft + (session.startWidth - nextWidth);
    }

    if (edge.includes('n')) {
      const candidateHeight = session.startHeight - dy;
      nextHeight = Math.max(MIN_HEIGHT, candidateHeight);
      nextY = session.startTop + (session.startHeight - nextHeight);
    }

    if (constraintsRef?.current) {
      const bounds = constraintsRef.current.getBoundingClientRect();

      if (nextX < bounds.left) {
        const overflow = bounds.left - nextX;
        nextX = bounds.left;
        nextWidth = Math.max(MIN_WIDTH, nextWidth - overflow);
      }

      if (nextY < bounds.top) {
        const overflow = bounds.top - nextY;
        nextY = bounds.top;
        nextHeight = Math.max(MIN_HEIGHT, nextHeight - overflow);
      }

      if (nextX + nextWidth > bounds.right) {
        nextWidth = Math.max(MIN_WIDTH, bounds.right - nextX);
      }

      if (nextY + nextHeight > bounds.bottom) {
        nextHeight = Math.max(MIN_HEIGHT, bounds.bottom - nextY);
      }
    }

    moveWindow(winState.id, nextX, nextY);
    resizeWindow(winState.id, nextWidth, nextHeight);
  };

  const stopResize = () => {
    resizeSessionRef.current = null;
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', stopResize);
  };

  const startResize = (edge: string, e: React.MouseEvent) => {
    if (winState.isMaximized) return;

    e.preventDefault();
    e.stopPropagation();
    focusWindow(winState.id);

    resizeSessionRef.current = {
      edge,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: winState.width,
      startHeight: winState.height,
      startLeft: winState.x,
      startTop: winState.y,
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', stopResize);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', stopResize);
    };
  }, []);

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
            top: 0,
            left: 0,
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
            onDoubleClick={() => maximizeWindow(winState.id)}
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

        {!winState.isMaximized && (
          <>
            <div className="absolute top-0 left-2 right-2 h-1 cursor-n-resize" onMouseDown={(e) => startResize('n', e)} />
            <div className="absolute bottom-0 left-2 right-2 h-1 cursor-s-resize" onMouseDown={(e) => startResize('s', e)} />
            <div className="absolute top-2 bottom-2 left-0 w-1 cursor-w-resize" onMouseDown={(e) => startResize('w', e)} />
            <div className="absolute top-2 bottom-2 right-0 w-1 cursor-e-resize" onMouseDown={(e) => startResize('e', e)} />
            <div className="absolute top-0 left-0 w-2 h-2 cursor-nw-resize" onMouseDown={(e) => startResize('nw', e)} />
            <div className="absolute top-0 right-0 w-2 h-2 cursor-ne-resize" onMouseDown={(e) => startResize('ne', e)} />
            <div className="absolute bottom-0 left-0 w-2 h-2 cursor-sw-resize" onMouseDown={(e) => startResize('sw', e)} />
            <div className="absolute bottom-0 right-0 w-2 h-2 cursor-se-resize" onMouseDown={(e) => startResize('se', e)} />
          </>
        )}
      </motion.div>
  );
};
