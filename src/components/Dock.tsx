import React, { useContext, useEffect, useState } from 'react';
import { OSContext } from '../context';
import { FolderOpen, Gamepad2, Play, FileText } from 'lucide-react';
import { withBasePath } from '../constants';

interface GameEntry {
  name: string;
  path: string;
}

interface DockProps {
  isHidden?: boolean;
}

export const Dock: React.FC<DockProps> = ({ isHidden = false }) => {
  const { apps, launchApp, windows, activeWindowId, focusWindow, minimizeWindow, openFile } = useContext(OSContext);
  const [isGameFolderOpen, setIsGameFolderOpen] = useState(false);
  const [games, setGames] = useState<GameEntry[]>([]);

  useEffect(() => {
    const loadGames = async () => {
      try {
        const manifestUrl = `${import.meta.env.BASE_URL}applications/game/manifest.json`;
        const response = await fetch(manifestUrl);

        if (response.ok) {
          const manifest = await response.json();
          const entries: unknown[] = Array.isArray(manifest?.games) ? manifest.games : [];
          const parsed = entries
            .map((entry: unknown) => {
              if (!entry || typeof entry !== 'object') return null;
              const item = entry as { name?: unknown; path?: unknown };
              if (typeof item.name !== 'string' || typeof item.path !== 'string') return null;
              return { name: item.name, path: withBasePath(item.path) };
            })
            .filter((entry: GameEntry | null): entry is GameEntry => entry !== null);

          if (parsed.length > 0) {
            setGames(parsed);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to load game manifest:', error);
      }

      setGames([
        {
          name: 'Escape Dungeon',
          path: withBasePath('applications/game/Escape%20Dungeon/dist/index.html'),
        },
        {
          name: 'Slot Defense',
          path: withBasePath('applications/game/Slot%20Defense/dist/index.html'),
        },
      ]);
    };

    loadGames();
  }, []);

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
    <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] w-auto transition-all duration-300 ${isHidden ? 'translate-y-28 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
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

            {/* Game folder launcher */}
            <div className="group relative flex flex-col items-center justify-end transition-all duration-300 hover:-translate-y-3 cursor-pointer">
              <div className="absolute -top-14 bg-black/80 text-cyan-400 text-[10px] uppercase tracking-widest px-3 py-1 border border-cyan-500/30 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap backdrop-blur-md">
                GAME
                <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2 h-2 bg-black/80 border-r border-b border-cyan-500/30 rotate-45"></div>
              </div>

              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white transition-all duration-300 bg-indigo-600/80 group-hover:bg-indigo-600 group-hover:shadow-[0_0_15px_rgba(129,140,248,0.8)] relative overflow-hidden"
                onClick={() => setIsGameFolderOpen(prev => !prev)}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <Gamepad2 size={24} strokeWidth={1.5} className="z-10" />
              </div>

              <div className={`w-8 h-0.5 mt-2 rounded-full transition-all duration-300 ${isGameFolderOpen ? 'opacity-100 bg-indigo-200 shadow-[0_0_12px_#c7d2fe]' : 'opacity-0 w-0 bg-indigo-400'}`} />

              {isGameFolderOpen && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-56 rounded-xl border border-cyan-500/30 bg-black/85 backdrop-blur-md p-2 space-y-1 z-[1100]">
                  <div className="px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">Game Folder</div>
                  {games.map((game) => (
                    <button
                      key={game.name}
                      type="button"
                      className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-cyan-500/15 transition-colors"
                      onClick={() => {
                        openFile({
                          name: game.name,
                          icon: FileText,
                          color: 'text-red-400',
                          type: 'pdf',
                          content: game.path,
                        });
                        setIsGameFolderOpen(false);
                      }}
                    >
                      <FolderOpen size={14} className="text-cyan-300" />
                      <span className="text-xs text-cyan-100 flex-1 truncate">{game.name}</span>
                      <Play size={12} className="text-emerald-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};
