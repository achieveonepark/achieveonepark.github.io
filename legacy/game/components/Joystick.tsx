import React, { useRef, useState, useEffect } from 'react';

interface JoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
}

export const Joystick: React.FC<JoystickProps> = ({ onMove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Use a ref for origin to access it inside the useEffect closure without dependencies issues
  const originRef = useRef({ x: 0, y: 0 });

  // Joystick configuration
  const maxRadius = 40; 

  const updatePosition = (clientX: number, clientY: number) => {
    const dx = clientX - originRef.current.x;
    const dy = clientY - originRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Clamp distance to maxRadius
    const cappedDistance = Math.min(distance, maxRadius);

    const x = Math.cos(angle) * cappedDistance;
    const y = Math.sin(angle) * cappedDistance;

    setPosition({ x, y });

    // Normalize output (-1 to 1)
    onMove({ 
      x: x / maxRadius, 
      y: y / maxRadius 
    });
  };

  const handleStart = (clientX: number, clientY: number) => {
    if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Set origin to the center of the joystick element
        originRef.current = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        setActive(true);
        // Immediately update position to snap or move towards finger
        updatePosition(clientX, clientY);
    }
  };

  const handleEnd = () => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  };

  // Add global window listeners when active to handle dragging outside the element
  useEffect(() => {
    if (!active) return;

    const onWindowMove = (e: MouseEvent | TouchEvent) => {
        let clientX, clientY;
        if ('touches' in e) {
             // Prevent scrolling while dragging joystick
            // e.preventDefault(); 
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        }
        updatePosition(clientX, clientY);
    };

    const onWindowEnd = () => {
        handleEnd();
    };

    // Attach to window so we don't lose focus if cursor/finger leaves the div
    window.addEventListener('mousemove', onWindowMove);
    window.addEventListener('mouseup', onWindowEnd);
    
    // Passive: false is needed if we wanted to preventDefault (optional here as we have touch-action: none)
    window.addEventListener('touchmove', onWindowMove, { passive: false });
    window.addEventListener('touchend', onWindowEnd);
    window.addEventListener('touchcancel', onWindowEnd);

    return () => {
        window.removeEventListener('mousemove', onWindowMove);
        window.removeEventListener('mouseup', onWindowEnd);
        window.removeEventListener('touchmove', onWindowMove);
        window.removeEventListener('touchend', onWindowEnd);
        window.removeEventListener('touchcancel', onWindowEnd);
    };
  }, [active]);

  return (
    <div 
      ref={containerRef}
      className="relative w-32 h-32 rounded-full bg-slate-800/50 backdrop-blur-sm border border-slate-600 touch-none flex items-center justify-center select-none"
      onMouseDown={(e) => {
          e.preventDefault(); // Prevent text selection
          handleStart(e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
          // e.preventDefault(); // Handled by CSS touch-action: none
          handleStart(e.touches[0].clientX, e.touches[0].clientY);
      }}
    >
        {/* Base Indicator */}
        <div className="absolute inset-0 rounded-full border-2 border-slate-700 opacity-50 pointer-events-none" />
        
        {/* Knob */}
        <div 
            className="w-12 h-12 rounded-full bg-slate-300 shadow-lg absolute pointer-events-none transition-transform duration-75 ease-out border-4 border-slate-500"
            style={{ 
                transform: `translate(${position.x}px, ${position.y}px)` 
            }}
        />
    </div>
  );
};