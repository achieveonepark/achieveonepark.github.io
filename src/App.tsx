import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MenuBar } from './components/MenuBar';
import { Dock } from './components/Dock';
import { Window } from './components/Window';
import type { AppDefinition, WindowState, FileObject } from './types';
import {
    INITIAL_APPS,
    WALLPAPER_URL,
    FILE_SYSTEM,
    PARK_FILES_MANIFEST_PATH,
    buildParkFileSystem
} from './constants';
import { Browser } from './components/apps/Browser';
import { Finder } from './components/apps/Finder';
import { AppStore } from './components/apps/AppStore';
import { Preview } from './components/apps/Preview';
import { TextEdit } from './components/apps/TextEdit';
import { Terminal } from './components/apps/Terminal';
import { DocReader } from './components/apps/DocReader';
import { Messenger } from './components/apps/Messenger';
import { DesktopSkillsWidget } from './components/DesktopSkillsWidget';
import { Globe, HardDrive, FileText, Folder } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { OSContext } from './context';

// Helper for generating IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
    const [apps, setApps] = useState<AppDefinition[]>(INITIAL_APPS);
    const [fileSystem, setFileSystem] = useState<Record<string, FileObject[]>>(FILE_SYSTEM);
    const [windows, setWindows] = useState<WindowState[]>([]);
    const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
    const [zIndexCounter, setZIndexCounter] = useState(10);
    const [showDesktopWidgets, setShowDesktopWidgets] = useState(true);
    const [showDataGrid, setShowDataGrid] = useState(false);
    const [showMetrics, setShowMetrics] = useState(false);
    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
    });

    // Ref to track the allowed desktop area (excluding menu bar)
    const desktopAreaRef = useRef<HTMLDivElement>(null);

    // Define the Reader app implicitly (not in dock, but launchable)
    const readerApp: AppDefinition = {
        id: 'docreader',
        title: 'DOC_READER',
        icon: FileText,
        type: 'system',
        color: 'bg-emerald-600',
        pinned: false
    };

    const launchApp = useCallback((app: AppDefinition) => {
        const shouldStartMaximized = window.innerWidth < 1024 || app.id === 'gameplayer';

        // Check if app is already open
        const existingWindow = windows.find(w => w.appId === app.id);

        if (existingWindow) {
            // If minimized, restore it
            if (existingWindow.isMinimized) {
                setWindows(prev => prev.map(w => w.id === existingWindow.id ? { ...w, isMinimized: false, zIndex: zIndexCounter + 1 } : w));
                setZIndexCounter(z => z + 1);
                setActiveWindowId(existingWindow.id);
            } else {
                // Just bring to front
                focusWindow(existingWindow.id);
            }
            return;
        }

        // Determine initial size
        const width = Math.min(window.innerWidth * 0.8, 800);
        const height = Math.min(window.innerHeight * 0.8, 600);
        // Initial visual position for animation is handled in Window.tsx variants
        // These coordinates are the FINAL position
        const x = Math.max(0, (window.innerWidth - width) / 2) + (windows.length * 20);
        const y = Math.max(40, (window.innerHeight - height) / 2) + (windows.length * 20);

        const newWindow: WindowState = {
            id: generateId(),
            appId: app.id,
            title: app.title,
            x,
            y,
            width,
            height,
            isMinimized: false,
            isMaximized: shouldStartMaximized,
            zIndex: zIndexCounter + 1
        };

        setZIndexCounter(prev => prev + 1);
        setWindows(prev => [...prev, newWindow]);
        setActiveWindowId(newWindow.id);
    }, [windows, zIndexCounter]);

    const openFile = useCallback((file: FileObject) => {
        // Determine which app to open based on file type
        let targetAppId = '';
        let fileAppDefinition: AppDefinition | undefined = undefined;

        if (file.type === 'app' && file.content) {
            targetAppId = file.content;
        } else if (file.type === 'image') {
            targetAppId = 'preview';
        } else if (file.type === 'text') {
            targetAppId = 'textedit';
        } else if (file.type === 'pdf') {
            targetAppId = file.content?.includes('/applications/game/') || file.content?.includes('applications/game/') ? 'gameplayer' : 'safari';
        } else if (file.type === 'markdown') {
            targetAppId = 'docreader';
            fileAppDefinition = readerApp;
        } else {
            alert('Cannot open this file type.');
            return;
        }

        // Find the app definition (either from installed apps or our special reader)
        const targetApp = fileAppDefinition || apps.find(a => a.id === targetAppId);

        if (!targetApp) return;

        const isMobileViewport = window.innerWidth < 1024;
        const width = Math.min(window.innerWidth * 0.6, 600);
        const height = Math.min(window.innerHeight * 0.7, 500);
        const newWindowId = generateId();

        const newWindowBase: Omit<WindowState, 'x' | 'y' | 'zIndex'> = {
            id: newWindowId,
            appId: targetApp.id,
            title: file.type === 'app' ? targetApp.title : file.name,
            width,
            height,
            isMinimized: false,
            isMaximized: false,
            content: file.content // Pass the file content (url, text, or markdown) to the window
        };

        setZIndexCounter(prev => prev + 1);
        setWindows(prev => {
            const reorderedWindows = [...prev]
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((existing, index) => ({ ...existing, zIndex: index + 10 }));

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const minY = 40;
            const maxX = Math.max(0, viewportWidth - width);
            const maxY = Math.max(minY, viewportHeight - height - 120);
            const centerX = (viewportWidth - width) / 2;
            const centerY = Math.max(minY, (viewportHeight - height) / 2);
            const gap = 16;
            const step = 36;

            const sidePlacement = file.preferredWindowSide || 'center';
            const preferredX =
                sidePlacement === 'left'
                    ? Math.max(0, Math.floor(viewportWidth * 0.16))
                    : sidePlacement === 'right'
                        ? Math.min(maxX, Math.floor(viewportWidth * 0.84 - width))
                        : centerX;
            const preferredY = centerY;

            const overlaps = (x: number, y: number) => {
                return reorderedWindows.some(existing => {
                    if (existing.isMinimized) return false;

                    const separated =
                        x + width + gap <= existing.x ||
                        existing.x + existing.width + gap <= x ||
                        y + height + gap <= existing.y ||
                        existing.y + existing.height + gap <= y;

                    return !separated;
                });
            };

            type Candidate = { x: number; y: number; score: number };
            const candidates: Candidate[] = [];

            for (let y = minY; y <= maxY; y += step) {
                for (let x = 0; x <= maxX; x += step) {
                    const score = Math.abs(x - centerX) + Math.abs(y - centerY);
                    candidates.push({ x, y, score });
                }
            }

            candidates.sort((a, b) => {
                const aPreferred = Math.abs(a.x - preferredX) + Math.abs(a.y - preferredY);
                const bPreferred = Math.abs(b.x - preferredX) + Math.abs(b.y - preferredY);
                if (aPreferred !== bPreferred) return aPreferred - bPreferred;
                if (a.score !== b.score) return a.score - b.score;
                return Math.abs(a.x - centerX) - Math.abs(b.x - centerX);
            });

            const openSpot = candidates.find(candidate => !overlaps(candidate.x, candidate.y));
            const targetX = openSpot ? openSpot.x : Math.max(0, centerX);
            const targetY = openSpot ? openSpot.y : centerY;

            const newWindow: WindowState = {
                ...newWindowBase,
                x: targetX,
                y: targetY,
                isMaximized: isMobileViewport || targetApp.id === 'gameplayer',
                zIndex: reorderedWindows.length + 10,
            };

            return [...reorderedWindows, newWindow];
        });
        setActiveWindowId(newWindowId);

    }, [apps]);

    useEffect(() => {
        let isCancelled = false;

        const syncParkFiles = async () => {
            try {
                const response = await fetch(PARK_FILES_MANIFEST_PATH);
                if (!response.ok) return;

                const manifest = await response.json();
                const rawFiles: unknown[] = Array.isArray(manifest?.files) ? manifest.files : [];
                const entries = rawFiles
                    .map((entry: unknown) => {
                        if (typeof entry === 'string') {
                            return { path: entry };
                        }

                        if (entry && typeof entry === 'object' && 'path' in entry && typeof (entry as { path?: unknown }).path === 'string') {
                            const typedEntry = entry as { path: string; thumbnail?: unknown };
                            return {
                                path: typedEntry.path,
                                thumbnail: typeof typedEntry.thumbnail === 'string' ? typedEntry.thumbnail : undefined,
                            };
                        }

                        return null;
                    })
                    .filter((entry: { path: string; thumbnail?: string } | null): entry is { path: string; thumbnail?: string } => entry !== null && entry.path.length > 0);

                if (entries.length === 0 || isCancelled) return;

                const dynamicParkFileSystem = buildParkFileSystem(entries);

                setFileSystem(prev => ({
                    Applications: prev.Applications,
                    ...dynamicParkFileSystem,
                }));
            } catch (error) {
                console.error('Failed to sync parkachieveone files from manifest:', error);
            }
        };

        syncParkFiles();

        return () => {
            isCancelled = true;
        };
    }, []);

    useEffect(() => {
        const toggleWidgets = () => setShowDesktopWidgets(prev => !prev);
        const toggleGrid = () => setShowDataGrid(prev => !prev);
        const toggleMetrics = () => setShowMetrics(prev => !prev);
        const createDirectory = () => {
            setFileSystem(prev => {
                const rootEntries = [...(prev.parkachieveone || [])];
                const baseName = 'New Folder';
                let candidate = baseName;
                let index = 2;

                while (rootEntries.some(item => item.name === candidate)) {
                    candidate = `${baseName} ${index}`;
                    index += 1;
                }

                const folderKey = `parkachieveone/${candidate.toLowerCase().replace(/\s+/g, '_')}`;

                rootEntries.push({
                    name: candidate,
                    icon: Folder,
                    color: 'text-cyan-400',
                    type: 'folder',
                    content: folderKey,
                });

                return {
                    ...prev,
                    parkachieveone: rootEntries,
                    [folderKey]: prev[folderKey] || [],
                };
            });
        };

        window.addEventListener('os:toggle-widgets', toggleWidgets);
        window.addEventListener('os:toggle-grid', toggleGrid);
        window.addEventListener('os:toggle-metrics', toggleMetrics);
        window.addEventListener('os:new-directory', createDirectory);

        return () => {
            window.removeEventListener('os:toggle-widgets', toggleWidgets);
            window.removeEventListener('os:toggle-grid', toggleGrid);
            window.removeEventListener('os:toggle-metrics', toggleMetrics);
            window.removeEventListener('os:new-directory', createDirectory);
        };
    }, []);

    const closeWindow = useCallback((id: string) => {
        setWindows(prev => prev.filter(w => w.id !== id));
        if (activeWindowId === id) setActiveWindowId(null);
    }, [activeWindowId]);

    const minimizeWindow = useCallback((id: string) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w));
        setActiveWindowId(null);
    }, []);

    const maximizeWindow = useCallback((id: string) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
        focusWindow(id);
    }, []);

    const focusWindow = useCallback((id: string) => {
        setActiveWindowId(id);
        setZIndexCounter(prev => prev + 1);
        setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: zIndexCounter + 1 } : w));
    }, [zIndexCounter]);

    const moveWindow = useCallback((id: string, x: number, y: number) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, x, y } : w));
    }, []);

    const resizeWindow = useCallback((id: string, width: number, height: number) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, width, height } : w));
    }, []);

    const installApp = useCallback((title: string, url: string, _iconStr: string, color: string) => {
        const newApp: AppDefinition = {
            id: `custom-${generateId()}`,
            title,
            icon: Globe, // Default to Globe for custom apps, could be dynamic
            type: 'browser',
            url,
            color,
        };
        setApps(prev => [...prev, newApp]);
    }, []);

    // Helper to render the correct component inside a window
    const renderAppContent = (windowState: WindowState) => {
        const app = apps.find(a => a.id === windowState.appId) || (windowState.appId === 'docreader' ? readerApp : null);

        if (!app) return null;

        if (app.id === 'finder') return <Finder />;
        if (app.id === 'store') return <AppStore />;
        if (app.id === 'terminal') return <Terminal />;
        if (app.id === 'messenger') return <Messenger />;
        if (app.id === 'preview') return <Preview content={windowState.content} />;
        if (app.id === 'textedit') return <TextEdit content={windowState.content} />;
        if (app.id === 'docreader') return <DocReader content={windowState.content} />;

        // Custom URL apps or Safari
        if (app.type === 'browser') {
            // Use windowState.content if available (for PDFs opened from Finder), otherwise fallback to app.url
            return <Browser url={windowState.content || app.url || ''} />;
        }

        return <div className="p-10 text-center text-gray-500">App content not loaded.</div>;
    };

    const hasMaximizedWindow = windows.some(windowState => !windowState.isMinimized && windowState.isMaximized);

    const openContextMenuAt = useCallback((clientX: number, clientY: number) => {
        const menuWidth = 220;
        const menuHeight = 260;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const x = Math.min(clientX, viewportWidth - menuWidth - 8);
        const y = Math.min(clientY, viewportHeight - menuHeight - 8);

        setContextMenu({
            visible: true,
            x: Math.max(8, x),
            y: Math.max(8, y),
        });
    }, []);

    const closeContextMenu = useCallback(() => {
        setContextMenu(prev => (prev.visible ? { ...prev, visible: false } : prev));
    }, []);

    const handleDesktopContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        openContextMenuAt(event.clientX, event.clientY);
    }, [openContextMenuAt]);

    const handleDesktopPointerDown = useCallback((event: React.MouseEvent) => {
        if (event.button === 2) {
            event.preventDefault();
            openContextMenuAt(event.clientX, event.clientY);
        }
    }, [openContextMenuAt]);

    useEffect(() => {
        const handleGlobalContextMenu = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const tagName = target.tagName;
            const isEditable =
                tagName === 'INPUT' ||
                tagName === 'TEXTAREA' ||
                target.isContentEditable;

            // Keep native menu for editable fields.
            if (isEditable) return;

            event.preventDefault();

            openContextMenuAt(event.clientX, event.clientY);
        };

        document.addEventListener('contextmenu', handleGlobalContextMenu, true);
        return () => {
            document.removeEventListener('contextmenu', handleGlobalContextMenu, true);
        };
    }, [openContextMenuAt]);

    const runContextAction = useCallback((action: string) => {
        if (action === 'open-finder') {
            const finderApp = apps.find(app => app.id === 'finder');
            if (finderApp) launchApp(finderApp);
        }

        if (action === 'new-directory') {
            window.dispatchEvent(new CustomEvent('os:new-directory'));
        }

        if (action === 'toggle-widgets') {
            setShowDesktopWidgets(prev => !prev);
        }

        if (action === 'toggle-grid') {
            setShowDataGrid(prev => !prev);
        }

        if (action === 'toggle-metrics') {
            setShowMetrics(prev => !prev);
        }

        if (action === 'close-active' && activeWindowId) {
            closeWindow(activeWindowId);
        }

        if (action === 'minimize-all') {
            setWindows(prev => prev.map(win => ({ ...win, isMinimized: true })));
            setActiveWindowId(null);
        }

        if (action === 'restore-all') {
            setWindows(prev => prev.map(win => ({ ...win, isMinimized: false })));
        }

        closeContextMenu();
    }, [activeWindowId, apps, closeContextMenu, closeWindow, launchApp]);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeContextMenu();
            }
        };

        window.addEventListener('keydown', handleEscape);
        window.addEventListener('resize', closeContextMenu);
        window.addEventListener('scroll', closeContextMenu, true);

        return () => {
            window.removeEventListener('keydown', handleEscape);
            window.removeEventListener('resize', closeContextMenu);
            window.removeEventListener('scroll', closeContextMenu, true);
        };
    }, [closeContextMenu]);

    return (
        <OSContext.Provider value={{
            apps,
            fileSystem,
            windows,
            activeWindowId,
            launchApp,
            openFile,
            closeWindow,
            minimizeWindow,
            maximizeWindow,
            focusWindow,
            moveWindow,
            resizeWindow,
            installApp
        }}>
            <div
                className="relative w-full h-screen overflow-hidden bg-cover bg-center select-none"
                style={{ backgroundImage: `url(${WALLPAPER_URL})` }}
                onContextMenu={handleDesktopContextMenu}
                onMouseDownCapture={handleDesktopPointerDown}
                onMouseDown={(event) => {
                    if (event.button === 0) {
                        closeContextMenu();
                    }
                }}
            >
                {!hasMaximizedWindow && <MenuBar />}

                {/* 
            Desktop Constraints Area:
            Starts below the MenuBar (top-16) and ends above Dock area.
            This invisible div defines where windows can be dragged.
        */}
                <div
                    ref={desktopAreaRef}
                    className="absolute top-16 left-0 right-0 bottom-0 pointer-events-none z-0"
                />

                {showDesktopWidgets && <DesktopSkillsWidget />}

                {showDataGrid && (
                    <div className="absolute top-16 left-0 right-0 bottom-24 pointer-events-none z-[1] opacity-35"
                        style={{
                            backgroundImage:
                                'linear-gradient(rgba(34,211,238,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.18) 1px, transparent 1px)',
                            backgroundSize: '28px 28px',
                        }}
                    />
                )}

                {showMetrics && (
                    <div className="fixed top-16 right-4 z-[1100] rounded-xl border border-cyan-500/30 bg-black/75 backdrop-blur-md p-3 text-cyan-100 text-xs space-y-1">
                        <div className="uppercase tracking-[0.2em] text-[10px] text-cyan-300">Metrics</div>
                        <div>Open windows: {windows.filter(w => !w.isMinimized).length}</div>
                        <div>Installed apps: {apps.length}</div>
                        <div>Viewport: {window.innerWidth} x {window.innerHeight}</div>
                    </div>
                )}

                {/* Desktop Icons Area */}
                {/* Adjusted top-24 to clear the floating menu bar */}
                <div className="absolute top-24 right-6 flex flex-col items-end space-y-6 z-0">
                    {/* parkachieveone */}
                    <div
                        className="flex flex-col items-center group cursor-pointer w-24"
                        onClick={() => launchApp(apps.find(a => a.id === 'finder')!)}
                    >
                        <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 backdrop-blur-sm shadow-sm group-hover:bg-white/20 transition-colors">
                            <HardDrive size={42} className="text-gray-200" strokeWidth={1.5} />
                        </div>
                        <span className="mt-2 text-cyan-200 text-[10px] font-bold tracking-widest uppercase drop-shadow-md px-2 py-0.5 rounded group-hover:bg-cyan-900/80 transition-colors text-center">
                parkachieveone
              </span>
                    </div>
                </div>

                {/* Windows Layer */}
                <AnimatePresence>
                    {windows.map(win => (
                        <Window
                            key={win.id}
                            window={win}
                            constraintsRef={desktopAreaRef} // Pass the restricted area ref
                            topOffset={0}
                            dockOffset={0}
                        >
                            {renderAppContent(win)}
                        </Window>
                    ))}
                </AnimatePresence>

                {contextMenu.visible && (
                    <div
                        className="fixed z-[1400] min-w-[220px] rounded-xl border border-cyan-500/35 bg-black/85 backdrop-blur-xl shadow-[0_0_18px_rgba(34,211,238,0.25)] p-1 text-cyan-100"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300/90">Desktop Menu</div>
                        <button type="button" onClick={() => runContextAction('open-finder')} className="w-full text-left px-3 py-2 rounded-md hover:bg-cyan-500/15 text-xs">Open Finder</button>
                        <button type="button" onClick={() => runContextAction('new-directory')} className="w-full text-left px-3 py-2 rounded-md hover:bg-cyan-500/15 text-xs">New Directory</button>
                        <div className="h-px bg-cyan-500/20 my-1 mx-2" />
                        <button type="button" onClick={() => runContextAction('toggle-widgets')} className="w-full flex items-center justify-between text-left px-3 py-2 rounded-md hover:bg-cyan-500/15 text-xs"><span>HUD Mode</span><span>{showDesktopWidgets ? 'ON' : 'OFF'}</span></button>
                        <button type="button" onClick={() => runContextAction('toggle-grid')} className="w-full flex items-center justify-between text-left px-3 py-2 rounded-md hover:bg-cyan-500/15 text-xs"><span>Data Grid</span><span>{showDataGrid ? 'ON' : 'OFF'}</span></button>
                        <button type="button" onClick={() => runContextAction('toggle-metrics')} className="w-full flex items-center justify-between text-left px-3 py-2 rounded-md hover:bg-cyan-500/15 text-xs"><span>Metrics</span><span>{showMetrics ? 'ON' : 'OFF'}</span></button>
                        <div className="h-px bg-cyan-500/20 my-1 mx-2" />
                        <button type="button" onClick={() => runContextAction('close-active')} className="w-full text-left px-3 py-2 rounded-md hover:bg-red-500/15 text-xs">Close Active Window</button>
                        <button type="button" onClick={() => runContextAction('minimize-all')} className="w-full text-left px-3 py-2 rounded-md hover:bg-cyan-500/15 text-xs">Minimize All</button>
                        <button type="button" onClick={() => runContextAction('restore-all')} className="w-full text-left px-3 py-2 rounded-md hover:bg-cyan-500/15 text-xs">Restore All</button>
                    </div>
                )}

                <Dock isHidden={hasMaximizedWindow} />
            </div>
        </OSContext.Provider>
    );
};

export default App;
