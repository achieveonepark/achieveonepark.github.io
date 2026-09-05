import React, { useContext, useEffect, useRef } from 'react';
import { X, Minus, Maximize2, Square } from 'lucide-react';
import { OSContext } from '../context';
import type { WindowState } from '../types';
import { motion, useDragControls, useReducedMotion, type Variants } from 'framer-motion';

interface WindowProps {
  window: WindowState;
  children: React.ReactNode;
  constraintsRef?: React.RefObject<HTMLDivElement>;
  topOffset?: number;
  dockOffset?: number;
  showHeader?: boolean;
}

/**
 * Apple's "move / reposition" spring: damping ratio 1.0 (critically damped, no
 * overshoot), response 0.4s. In Motion's API that is bounce 0 + duration 0.4.
 * A window is a heavy object being repositioned — it should not bounce.
 */
const MOVE_SPRING = { type: 'spring', duration: 0.4, bounce: 0 } as const;

/** Strong ease-out for enter/exit. The browser built-in is too weak. */
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Direct manipulation must be 1:1 with the pointer — never a tween. */
const INSTANT = { duration: 0 } as const;

/**
 * Reduced motion: no movement, but still a fade. Reduced motion asks for a
 * gentler equivalent, not for the interface to snap between states.
 */
const REDUCED = { default: { duration: 0 }, opacity: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } } as const;

interface ResizeSession {
  edge: string;
  pointerId: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startLeft: number;
  startTop: number;
}

export const Window: React.FC<WindowProps> = ({ window: winState, children, constraintsRef, topOffset = 20, dockOffset = 150, showHeader = true }) => {
  const { focusWindow, moveWindow, resizeWindow, closeWindow, minimizeWindow, maximizeWindow } = useContext(OSContext);
  const dragControls = useDragControls();
  const windowRef = useRef<HTMLDivElement>(null);
  const resizeSessionRef = useRef<ResizeSession | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // True while the user is dragging or resizing. Position/size updates during a
  // gesture must land on the frame the pointer moved, with no animation between.
  const [isInteracting, setIsInteracting] = React.useState(false);

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

  /**
   * `winState.x/y` are offsets inside the window's positioned ancestor, but
   * `getBoundingClientRect()` returns viewport coordinates. Everything that
   * compares the two has to go through here first, or the clamp is wrong by the
   * container's own offset (the desktop area starts below the menu bar).
   */
  const getOffsetParentRect = (): { left: number; top: number } => {
    const parent = windowRef.current?.offsetParent as HTMLElement | null;
    if (!parent) return { left: 0, top: 0 };
    const rect = parent.getBoundingClientRect();
    return { left: rect.left, top: rect.top };
  };

  const getConstraintBounds = () => {
    const container = constraintsRef?.current;
    if (!container) return null;

    const origin = getOffsetParentRect();
    const rect = container.getBoundingClientRect();

    return {
      left: rect.left - origin.left,
      top: rect.top - origin.top,
      right: rect.right - origin.left,
      bottom: rect.bottom - origin.top,
    };
  };

  /**
   * Where this window's dock icon sits, in the window's own coordinate space.
   * Windows grow out of the icon that launched them and collapse back into it,
   * so the icon and the window read as the same object in two states.
   *
   * Cached rather than read inline: the variants object is rebuilt on every
   * render, and a resize gesture re-renders on every pointer move — measuring
   * the dock each time would thrash layout through the whole drag.
   */
  const readDockOrigin = React.useCallback((): { x: number; y: number } | null => {
    if (typeof document === 'undefined') return null;

    const icon = document.querySelector(`[data-dock-icon="${winState.appId}"]`);
    if (!icon) return null;

    const iconRect = icon.getBoundingClientRect();
    if (iconRect.width === 0 && iconRect.height === 0) return null;

    const origin = getOffsetParentRect();

    return {
      x: iconRect.left + iconRect.width / 2 - origin.left,
      y: iconRect.top + iconRect.height / 2 - origin.top,
    };
  }, [winState.appId]);

  const [dockOrigin, setDockOrigin] = React.useState<{ x: number; y: number } | null>(readDockOrigin);

  useEffect(() => {
    setDockOrigin(readDockOrigin());
  }, [readDockOrigin, viewportSize.width, viewportSize.height]);

  const dismissDuration = prefersReducedMotion ? 0.12 : 0.18;

  const positionTransition = isInteracting
    ? INSTANT
    : prefersReducedMotion
      ? REDUCED
      : MOVE_SPRING;

  /**
   * Collapsed-at-the-dock pose. `scale` works about the element's centre, so
   * the window is positioned with its centre on the icon's centre. Falls back
   * to a short rise from its resting place when the dock icon is not on screen
   * (the dock hides behind a maximised window, and files opened from Finder
   * have no icon of their own).
   */
  const collapsedPose = prefersReducedMotion
    ? { opacity: 0, scale: 1, x: winState.x, y: winState.y }
    : dockOrigin
      ? {
          opacity: 0,
          scale: 0.16,
          x: dockOrigin.x - winState.width / 2,
          y: dockOrigin.y - winState.height / 2,
        }
      : { opacity: 0, scale: 0.96, x: winState.x, y: winState.y + 24 };

  // NOTE: these use Motion's `x`/`y`/`scale` shorthands rather than a full
  // transform string. `drag` writes to those same motion values, so a transform
  // string here would detach dragging from the animated position.
  const variants: Variants = {
    // width/height are pinned here too, so only transform and opacity animate
    // on the way in — otherwise Motion would animate the box from zero.
    initial: { ...collapsedPose, width: winState.width, height: winState.height },
    normal: {
      opacity: 1,
      scale: 1,
      x: winState.x,
      y: winState.y,
      width: winState.width,
      height: winState.height,
      transition: positionTransition,
    },
    maximized: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: topOffset,
      width: viewportSize.width,
      height: maximizedHeight,
      transition: prefersReducedMotion ? REDUCED : MOVE_SPRING,
    },
    // Minimise retraces the way in, which is the whole point of the genie.
    minimized: {
      ...collapsedPose,
      transition: { duration: dismissDuration, ease: EASE_OUT },
    },
    exit: {
      opacity: 0,
      scale: prefersReducedMotion ? 1 : 0.96,
      transition: { duration: dismissDuration, ease: EASE_OUT },
    },
  };

  let currentState = "normal";
  if (winState.isMinimized) currentState = "minimized";
  else if (winState.isMaximized) currentState = "maximized";

  const handleDragEnd = () => {
    setIsInteracting(false);
    if (winState.isMaximized) return;

    const el = windowRef.current;
    if (!el) return;

    // Read the position actually on screen rather than accumulating pointer
    // offset. `dragConstraints` stops the element at the edge but the pointer
    // keeps travelling, so `info.offset` overshoots and the window used to jump
    // outside the desktop area the moment the drag was released.
    const origin = getOffsetParentRect();
    const rect = el.getBoundingClientRect();

    let nextX = rect.left - origin.left;
    let nextY = rect.top - origin.top;

    // With rubber-banding the element is still outside the constraints at the
    // moment the drag ends — Motion animates it back afterwards. Clamp here so
    // the overshoot never reaches state, or the window would settle wherever
    // the stretch happened to leave it.
    const bounds = getConstraintBounds();

    if (bounds) {
      nextX = Math.min(Math.max(nextX, bounds.left), Math.max(bounds.left, bounds.right - winState.width));
      nextY = Math.min(Math.max(nextY, bounds.top), Math.max(bounds.top, bounds.bottom - winState.height));
    }

    moveWindow(winState.id, Math.round(nextX), Math.round(nextY));
  };

  const startDrag = (e: React.PointerEvent) => {
    if (!winState.isMaximized) {
      setIsInteracting(true);
      dragControls.start(e);
      focusWindow(winState.id);
    }
  };

  const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const session = resizeSessionRef.current;
    if (!session || session.pointerId !== e.pointerId || winState.isMaximized) return;

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

    const bounds = getConstraintBounds();

    if (bounds) {
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

  const startResize = (edge: string, e: React.PointerEvent<HTMLDivElement>) => {
    if (winState.isMaximized) return;

    e.preventDefault();
    e.stopPropagation();
    focusWindow(winState.id);

    // Pointer capture keeps the gesture alive when the pointer leaves the 8px
    // handle, and makes resize work with touch and pen — the old mouse-only
    // listeners meant it did not work at all outside a mouse.
    e.currentTarget.setPointerCapture(e.pointerId);

    resizeSessionRef.current = {
      edge,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: winState.width,
      startHeight: winState.height,
      startLeft: winState.x,
      startTop: winState.y,
    };

    setIsInteracting(true);
  };

  const endResize = (e: React.PointerEvent<HTMLDivElement>) => {
    const session = resizeSessionRef.current;
    if (!session || session.pointerId !== e.pointerId) return;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    resizeSessionRef.current = null;
    setIsInteracting(false);
  };

  const resizeHandleProps = (edge: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => startResize(edge, e),
    onPointerMove: handleResizeMove,
    onPointerUp: endResize,
    onPointerCancel: endResize,
    style: { touchAction: 'none' as const },
  });

  return (
      <motion.div
          ref={windowRef}
          initial="initial"
          animate={currentState}
          exit="exit"
          variants={variants}
          // Cyberpunk Style: Dark glass, cyan border, glow
          className={`absolute flex flex-col overflow-hidden backdrop-blur-xl bg-black/70 transition-[border-radius] duration-200 ease-out motion-reduce:transition-none
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
          // A hard stop at the boundary reads as frozen; a little resistance
          // reads as "responsive, but there is nothing more here". Kept small —
          // this is a window being dragged, not a sheet being flicked. The
          // overshoot is clamped out of state in handleDragEnd.
          dragElastic={prefersReducedMotion ? 0 : 0.06}
          onDragEnd={handleDragEnd}
      >
        {showHeader && (
          <div
              className="h-9 bg-cyan-950/30 border-b border-cyan-500/20 flex items-center justify-between px-3 cursor-default select-none flex-shrink-0"
              onPointerDown={startDrag}
              onDoubleClick={() => maximizeWindow(winState.id)}
          >
            <div className="text-cyan-400 text-xs tracking-widest font-bold uppercase flex items-center">
              <span className="w-2 h-2 bg-cyan-500 rounded-full mr-2"></span>
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
        )}

        {/* Content Area - Transparent to show blur */}
        <div
          className="flex-1 overflow-hidden relative"
          onPointerDownCapture={(e) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;

            if (target.closest('[data-os-window-control="true"]')) {
              return;
            }

            if (target.closest('[data-os-window-drag-handle="true"]')) {
              if (!winState.isMaximized) {
                setIsInteracting(true);
                dragControls.start(e);
              }
              focusWindow(winState.id);
              e.stopPropagation();
            }
          }}
          onDoubleClickCapture={(e) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;

            if (target.closest('[data-os-window-control="true"]')) {
              return;
            }

            if (target.closest('[data-os-window-drag-handle="true"]')) {
              maximizeWindow(winState.id);
              e.stopPropagation();
            }
          }}
          onPointerDown={(e) => {
            focusWindow(winState.id);
            e.stopPropagation();
          }}
        >
          {children}
        </div>

        {!winState.isMaximized && (
          <>
            {/* 8px edges / 16px corners. These were 1–2px, which is below the
                size of a pointer target anyone can reliably hit. */}
            <div className="absolute top-0 left-4 right-4 h-2 cursor-n-resize" {...resizeHandleProps('n')} />
            <div className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize" {...resizeHandleProps('s')} />
            <div className="absolute top-4 bottom-4 left-0 w-2 cursor-w-resize" {...resizeHandleProps('w')} />
            <div className="absolute top-4 bottom-4 right-0 w-2 cursor-e-resize" {...resizeHandleProps('e')} />
            <div className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize" {...resizeHandleProps('nw')} />
            <div className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize" {...resizeHandleProps('ne')} />
            <div className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize" {...resizeHandleProps('sw')} />
            <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" {...resizeHandleProps('se')} />
          </>
        )}
      </motion.div>
  );
};
