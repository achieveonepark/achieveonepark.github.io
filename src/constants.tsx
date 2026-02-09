import type { AppDefinition, FileObject } from './types';
import {
    Globe,
    Folder,
    PlusCircle,
    Terminal,
    FileText,
    Eye,
    AppWindow,
    Code,
    Image as ImageIcon // Renamed to avoid conflict if needed, or just Image
} from 'lucide-react';

// Using a simple component mapping for demonstration
export const INITIAL_APPS: AppDefinition[] = [
    {
        id: 'finder',
        title: 'SYSTEM', // Renamed for sci-fi feel
        icon: Folder,
        type: 'system',
        color: 'bg-cyan-600',
        pinned: true,
    },
    {
        id: 'safari',
        title: 'NET',
        icon: Globe,
        type: 'browser',
        url: 'https://www.google.com/webhp?igu=1&theme=dark', // Try to force dark mode if possible
        color: 'bg-blue-600',
        pinned: true,
    },
    {
        id: 'store',
        title: 'MODULES',
        icon: PlusCircle,
        type: 'system',
        color: 'bg-purple-600',
        pinned: false, // Removed from dock by default
    },
    {
        id: 'terminal',
        title: 'SHELL',
        icon: Terminal,
        type: 'system',
        color: 'bg-gray-800',
        pinned: true,
    },
    {
        id: 'textedit',
        title: 'LOGS',
        icon: FileText,
        type: 'system',
        color: 'bg-emerald-600',
        pinned: false, // Removed from dock by default
    },
    {
        id: 'preview',
        title: 'VISUAL',
        icon: Eye, // Using Eye as generic preview icon
        type: 'system',
        color: 'bg-pink-600',
        pinned: false, // Removed from dock by default
    }
];

// Dark Developer Theme: Retro Pixel Art City/Room which gives a "Cute + Developer + Dark" vibe.
export const WALLPAPER_URL = "https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=2070&auto=format&fit=crop";

// ==================================================================================
// FILE SYSTEM CONFIGURATION
// ==================================================================================

// 1. Welcome Message Content (Inline fallback)
const introduceContent = `# WELCOME TO ACHIEVEONE_OS

## GREETINGS, USER
System initialization complete. Access level: **ADMINISTRATOR**.

This interface is a React-based simulation designed to showcase web capabilities in a desktop environment.

## NAVIGATION
- **[My Portfolio](https://github.com)** : Check out my source codes.
- **[React Docs](https://react.dev)** : Built with React 18.
- **[Tailwind CSS](https://tailwindcss.com)** : Styled for performance.

## GETTING STARTED
1. Open 'parkachieveone' to view your files.
2. Go to 'Applications' to access system modules like NetLink.
3. Add files to the public folder to see them here.

> "The future is already here, it's just not evenly distributed."
`;

/**
 * =================================================================
 * [USER MANUAL] HOW TO ADD FILES
 * =================================================================
 * 1. Put your files (.md, .png, .jpg) in the `public/` folder of your project.
 * 2. Add the filename to the `USER_FILES` list below.
 * =================================================================
 */
const USER_FILES = [
    // Example: 'photo.jpg', 
    // Example: 'about.md',
];

/**
 * Helper to determine file type and icon based on extension
 */
const getFileInfo = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
        return { type: 'image' as const, icon: ImageIcon, color: 'text-pink-400' };
    }
    if (ext === 'md') {
        return { type: 'markdown' as const, icon: FileText, color: 'text-yellow-400' };
    }
    if (ext === 'pdf') {
        return { type: 'pdf' as const, icon: FileText, color: 'text-red-400' };
    }
    return { type: 'text' as const, icon: FileText, color: 'text-gray-400' };
};

/**
 * Generates file objects pointing to the root public folder
 */
const generateUserFiles = (): FileObject[] => {
    return USER_FILES.map(filename => {
        const info = getFileInfo(filename);
        return {
            name: filename,
            icon: info.icon,
            color: info.color,
            type: info.type,
            content: `/${filename}` // Files are now expected in public root
        };
    });
};

// Fallback Manual Content
const manualContent = `# SYSTEM MANUAL V2.4

## OVERVIEW
Welcome to AchieveOne OS. This interface is designed for high-efficiency data processing and web module injection.

## COMMANDS (SHELL)
- /help : List available commands
- /clear : Purge visual logs
- /whoami : Identify user session

---
© 2024 ACHIEVEONE_CORP. ALL RIGHTS RESERVED.`;

// Export the File System
export const FILE_SYSTEM: Record<string, FileObject[]> = {
    'parkachieveone': [
        // 1. The Default Intro File (Inline)
        { name: 'introduce.md', icon: FileText, color: 'text-yellow-400', type: 'markdown', content: introduceContent },

        // 2. Your Custom Files (from public/)
        ...generateUserFiles(),

        // 3. Examples
        { name: 'Manual.md', icon: FileText, color: 'text-emerald-400', type: 'markdown', content: manualContent },
        {
            name: 'React_Readme.md',
            icon: FileText,
            color: 'text-blue-300',
            type: 'markdown',
            content: 'https://raw.githubusercontent.com/facebook/react/main/README.md'
        },
    ],
    'Applications': [
        { name: 'NetLink', icon: Globe, color: 'text-blue-500', type: 'app', content: 'safari' },
        { name: 'Shell', icon: Code, color: 'text-gray-400', type: 'app', content: 'terminal' },
        { name: 'Market', icon: PlusCircle, color: 'text-purple-500', type: 'app', content: 'store' },
    ]
};