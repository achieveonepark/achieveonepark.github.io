import React, { useContext } from 'react';
import { OSContext } from '../context';

export const Dock: React.FC = () => {
  const { apps, launchApp, windows, activeWindowId, focusWindow, minimizeWindow } = useContext(OSContext);

  // Filter apps: Show if pinned (default true if undefined) OR if the app has an open window
  const visibleApps = apps.filter(app => (app.pinned !== false) || windows.some(w => w.appId === app.id));

  const handleAppClick = (app: any) => {
    const openWindow = windows.find(w => w.appId === app.id);
    if (openWindow) {
      if (openWindow.isMinimized) {
        launchApp(app);
      } else if (activeWindowId === openWindow.id) {
         minimizeWindow(openWindow.id);
      } else {
        focusWindow(openWindow.id);
      }
    } else {
      launchApp(app);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] w-auto">
      {/* Outer glow container */}
      <div className="relative">
          {/* Background Bar */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-end space-x-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            {visibleApps.map((app) => {
              const isOpen = windows.some((w) => w.appId === app.id);
              const isActive = windows.find(w => w.appId === app.id)?.id === activeWindowId;
              const Icon = app.icon;
              
              return (
                <div
                  key={app.id}
                  className="group relative flex flex-col items-center justify-end transition-all duration-300 hover:-translate-y-3 cursor-pointer"
                  onClick={() => handleAppClick(app)}
                >
                  {/* Tooltip HUD */}
                  <div className="absolute -top-14 bg-black/80 text-cyan-400 text-[10px] uppercase tracking-widest px-3 py-1 border border-cyan-500/30 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap backdrop-blur-md">
                    {app.title}
                    <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2 h-2 bg-black/80 border-r border-b border-cyan-500/30 rotate-45"></div>
                  </div>

                  {/* Icon Container */}
                  <div className={`
                    w-12 h-12 rounded-lg flex items-center justify-center text-white transition-all duration-300
                    ${app.color} bg-opacity-80 group-hover:bg-opacity-100 group-hover:shadow-[0_0_15px_currentColor]
                    relative overflow-hidden
                  `}>
                    {/* Glitch shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    <Icon size={24} strokeWidth={1.5} className="z-10" />
                  </div>

                  {/* Active Indicator - Glowing Bar */}
                  <div className={`
                    w-8 h-0.5 bg-cyan-400 mt-2 rounded-full shadow-[0_0_8px_#22d3ee] transition-all duration-300
                    ${isOpen ? 'opacity-100 width-8' : 'opacity-0 w-0'}
                    ${isActive ? 'bg-cyan-200 shadow-[0_0_12px_#a5f3fc]' : ''}
                  `} />
                </div>
              );
            })}
          </div>
      </div>
    </div>
  );
};