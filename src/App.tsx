import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MenuBar } from './components/MenuBar';
import { Dock } from './components/Dock';
import { Window } from './components/Window';
import type { AppDefinition, WindowState, FileObject } from './types';
import { INITIAL_APPS, WALLPAPER_URL, FILE_SYSTEM } from './constants';
import { Browser } from './components/apps/Browser';
import { Finder } from './components/apps/Finder';
import { AppStore } from './components/apps/AppStore';
import { Preview } from './components/apps/Preview';
import { TextEdit } from './components/apps/TextEdit';
import { Terminal } from './components/apps/Terminal';
import { DocReader } from './components/apps/DocReader';
import { Globe, HardDrive, FileText } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { OSContext } from './context';

// Helper for generating IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
    const [apps, setApps] = useState<AppDefinition[]>(INITIAL_APPS);
    const [windows, setWindows] = useState<WindowState[]>([]);
    const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
    const [zIndexCounter, setZIndexCounter] = useState(10);
    const [isInitialized, setIsInitialized] = useState(false);

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
            isMaximized: false,
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
            targetAppId = 'safari';
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

        const width = Math.min(window.innerWidth * 0.6, 600);
        const height = Math.min(window.innerHeight * 0.7, 500);
        const x = Math.max(0, (window.innerWidth - width) / 2) + (windows.length * 20);
        const y = Math.max(40, (window.innerHeight - height) / 2) + (windows.length * 20);

        const newWindow: WindowState = {
            id: generateId(),
            appId: targetApp.id,
            title: file.type === 'app' ? targetApp.title : file.name,
            x,
            y,
            width,
            height,
            isMinimized: false,
            isMaximized: false,
            zIndex: zIndexCounter + 1,
            content: file.content // Pass the file content (url, text, or markdown) to the window
        };

        setZIndexCounter(prev => prev + 1);
        setWindows(prev => [...prev, newWindow]);
        setActiveWindowId(newWindow.id);

    }, [apps, windows, zIndexCounter]);

    // AUTO-STARTUP LOGIC
    useEffect(() => {
        if (!isInitialized) {
            // Attempt to find introduce.md in parkachieveone
            const rootFolder = FILE_SYSTEM['parkachieveone'];
            // We look for the exact file name defined in constants
            const introFile = rootFolder?.find(f => f.name === 'introduce.md');

            if (introFile) {
                // Small delay to ensure smooth entry animation
                setTimeout(() => {
                    openFile(introFile);
                }, 800);
            }
            setIsInitialized(true);
        }
    }, [isInitialized, openFile]);

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

    const installApp = useCallback((title: string, url: string, iconStr: string, color: string) => {
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

    return (
        <OSContext.Provider value={{
            apps,
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
            >
                <MenuBar />

                {/* 
            Desktop Constraints Area:
            Starts below the MenuBar (top-16) and ends above Dock area.
            This invisible div defines where windows can be dragged.
        */}
                <div
                    ref={desktopAreaRef}
                    className="absolute top-16 left-0 right-0 bottom-0 pointer-events-none z-0"
                />

                {/* Desktop Icons Area */}
                {/* Adjusted top-24 to clear the floating menu bar */}
                <div className="absolute top-24 right-6 flex flex-col items-end space-y-6 z-0">
                    {/* parkachieveone */}
                    <div
                        className="flex flex-col items-center group cursor-pointer w-24"
                        onDoubleClick={() => launchApp(apps.find(a => a.id === 'finder')!)}
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
                        >
                            {renderAppContent(win)}
                        </Window>
                    ))}
                </AnimatePresence>

                <Dock />
            </div>
        </OSContext.Provider>
    );
};

export default App;