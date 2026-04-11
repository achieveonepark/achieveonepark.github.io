import React, { useContext, useEffect, useState } from 'react';
import { OSContext } from '../context';
import type { LucideIcon } from 'lucide-react';
import {
  Bomb,
  Blocks,
  Castle,
  Crosshair,
  Gamepad2,
  Goal,
  Scissors,
  Shield,
  Sword,
  Swords,
  ToyBrick,
  Trees,
} from 'lucide-react';
import { withBasePath } from '../constants';

interface GameEntry {
  name: string;
  path: string;
  icon: LucideIcon;
  iconColor: string;
  tileClassName: string;
}

interface GameManifestEntry {
  name: string;
  path: string;
}

interface DockProps {
  isHidden?: boolean;
}

type GameVisual = Pick<GameEntry, 'icon' | 'iconColor' | 'tileClassName'>;

const DEFAULT_GAMES: GameManifestEntry[] = [
  {
    name: 'Escape Dungeon',
    path: withBasePath('applications/game/Escape%20Dungeon/dist/index.html'),
  },
  {
    name: 'Slot Defense',
    path: withBasePath('applications/game/Slot%20Defense/dist/index.html'),
  },
  {
    name: 'Battle Monster',
    path: withBasePath('applications/game/Battle%20Monster/index.html'),
  },
  {
    name: 'Brick Breaker Deluxe',
    path: withBasePath('applications/game/Brick%20Breaker%20Deluxe/index.html'),
  },
  {
    name: 'Cut Rope Candy Lab',
    path: withBasePath('applications/game/Cut%20Rope%20Candy%20Lab/index.html'),
  },
  {
    name: 'Force Soccer',
    path: withBasePath('applications/game/Force%20Soccer/index.html'),
  },
  {
    name: 'Maple Adventure',
    path: withBasePath('applications/game/Maple%20Adventure/index.html'),
  },
  {
    name: 'MineSweeper Pro',
    path: withBasePath('applications/game/MineSweeper%20Pro/index.html'),
  },
  {
    name: 'Move Defense',
    path: withBasePath('applications/game/Move%20Defense/index.html'),
  },
  {
    name: 'Tetris Make',
    path: withBasePath('applications/game/Tetris%20Make/index.html'),
  },
  {
    name: 'War Make RTS',
    path: withBasePath('applications/game/War%20Make%20RTS/index.html'),
  },
];

const FALLBACK_GAME_VISUAL: GameVisual = {
  icon: Gamepad2,
  iconColor: 'text-cyan-100',
  tileClassName: 'border-cyan-400/30 bg-cyan-500/10 shadow-[0_0_18px_rgba(34,211,238,0.16)]',
};

const GAME_VISUALS: Record<string, GameVisual> = {
  'Escape Dungeon': {
    icon: Sword,
    iconColor: 'text-amber-100',
    tileClassName: 'border-amber-400/30 bg-amber-500/10 shadow-[0_0_18px_rgba(251,191,36,0.16)]',
  },
  'Slot Defense': {
    icon: Shield,
    iconColor: 'text-cyan-100',
    tileClassName: 'border-cyan-400/30 bg-cyan-500/10 shadow-[0_0_18px_rgba(34,211,238,0.18)]',
  },
  'Battle Monster': {
    icon: Swords,
    iconColor: 'text-rose-100',
    tileClassName: 'border-rose-400/30 bg-rose-500/10 shadow-[0_0_18px_rgba(251,113,133,0.18)]',
  },
  'Brick Breaker Deluxe': {
    icon: ToyBrick,
    iconColor: 'text-orange-100',
    tileClassName: 'border-orange-400/30 bg-orange-500/10 shadow-[0_0_18px_rgba(251,146,60,0.18)]',
  },
  'Cut Rope Candy Lab': {
    icon: Scissors,
    iconColor: 'text-emerald-100',
    tileClassName: 'border-emerald-400/30 bg-emerald-500/10 shadow-[0_0_18px_rgba(52,211,153,0.18)]',
  },
  'Force Soccer': {
    icon: Goal,
    iconColor: 'text-sky-100',
    tileClassName: 'border-sky-400/30 bg-sky-500/10 shadow-[0_0_18px_rgba(56,189,248,0.18)]',
  },
  'Maple Adventure': {
    icon: Trees,
    iconColor: 'text-lime-100',
    tileClassName: 'border-lime-400/30 bg-lime-500/10 shadow-[0_0_18px_rgba(163,230,53,0.16)]',
  },
  'MineSweeper Pro': {
    icon: Bomb,
    iconColor: 'text-red-100',
    tileClassName: 'border-red-400/30 bg-red-500/10 shadow-[0_0_18px_rgba(248,113,113,0.18)]',
  },
  'Move Defense': {
    icon: Crosshair,
    iconColor: 'text-violet-100',
    tileClassName: 'border-violet-400/30 bg-violet-500/10 shadow-[0_0_18px_rgba(167,139,250,0.18)]',
  },
  'Tetris Make': {
    icon: Blocks,
    iconColor: 'text-fuchsia-100',
    tileClassName: 'border-fuchsia-400/30 bg-fuchsia-500/10 shadow-[0_0_18px_rgba(232,121,249,0.18)]',
  },
  'War Make RTS': {
    icon: Castle,
    iconColor: 'text-yellow-100',
    tileClassName: 'border-yellow-400/30 bg-yellow-500/10 shadow-[0_0_18px_rgba(250,204,21,0.18)]',
  },
};

const enhanceGameEntry = (game: GameManifestEntry): GameEntry => ({
  ...game,
  ...(GAME_VISUALS[game.name] || FALLBACK_GAME_VISUAL),
});

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
              return enhanceGameEntry({ name: item.name, path: withBasePath(item.path) });
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

      setGames(DEFAULT_GAMES.map(enhanceGameEntry));
    };

    loadGames();
  }, []);

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
      <div className="relative">
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
                <div className="absolute -top-14 bg-black/80 text-cyan-400 text-[10px] uppercase tracking-widest px-3 py-1 border border-cyan-500/30 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap backdrop-blur-md">
                  {app.title}
                  <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2 h-2 bg-black/80 border-r border-b border-cyan-500/30 rotate-45"></div>
                </div>

                <div
                  className={`
                    w-12 h-12 rounded-lg flex items-center justify-center text-white transition-all duration-300
                    ${app.color} bg-opacity-80 group-hover:bg-opacity-100 group-hover:shadow-[0_0_15px_currentColor]
                    relative overflow-hidden
                  `}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <Icon size={24} strokeWidth={1.5} className="z-10" />
                </div>

                <div
                  className={`
                    w-8 h-0.5 bg-cyan-400 mt-2 rounded-full shadow-[0_0_8px_#22d3ee] transition-all duration-300
                    ${isOpen ? 'opacity-100 width-8' : 'opacity-0 w-0'}
                    ${isActive ? 'bg-cyan-200 shadow-[0_0_12px_#a5f3fc]' : ''}
                  `}
                />
              </div>
            );
          })}

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
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[min(82vw,34rem)] max-h-[60vh] overflow-y-auto rounded-2xl border border-cyan-500/30 bg-black/90 backdrop-blur-md p-3 z-[1100] shadow-[0_0_24px_rgba(34,211,238,0.16)]">
                <div className="px-1 pb-3 text-[10px] uppercase tracking-[0.24em] text-cyan-300">Game Folder</div>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {games.map((game) => {
                    const Icon = game.icon;

                    return (
                      <button
                        key={game.name}
                        type="button"
                        className="group flex flex-col items-center rounded-xl p-2 text-center transition-all duration-200 hover:bg-cyan-500/10"
                        onClick={() => {
                          openFile({
                            name: game.name,
                            icon: game.icon,
                            color: game.iconColor,
                            type: 'pdf',
                            content: game.path,
                          });
                          setIsGameFolderOpen(false);
                        }}
                      >
                        <div className={`relative mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border transition-transform duration-200 group-hover:-translate-y-1 ${game.tileClassName}`}>
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/12 via-transparent to-black/10 opacity-80"></div>
                          <Icon size={26} strokeWidth={1.6} className={`relative z-10 ${game.iconColor}`} />
                        </div>
                        <span className="w-full text-[11px] font-medium leading-tight text-cyan-100/95">
                          {game.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
