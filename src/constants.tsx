import type { AppDefinition, FileObject } from './types';
import {
    Globe,
    Folder,
    PlusCircle,
    Terminal,
    FileText,
    Eye,
    Code,
    Gamepad2,
    Image as ImageIcon // Renamed to avoid conflict if needed, or just Image
} from 'lucide-react';

const normalizeBaseUrl = (baseUrl: string) => {
    if (!baseUrl) return '/';
    return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
};

export const BASE_URL = normalizeBaseUrl(import.meta.env.BASE_URL || '/');

export const withBasePath = (path: string) => {
    if (/^https?:\/\//i.test(path)) return path;
    const normalizedPath = path.replace(/^\/+/, '');
    return `${BASE_URL}${normalizedPath}`;
};

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
    },
    {
        id: 'gameplayer',
        title: 'GAME',
        icon: Gamepad2,
        type: 'browser',
        url: withBasePath('applications/game/Escape%20Dungeon/dist/index.html'),
        color: 'bg-indigo-600',
        pinned: false,
    }
];

// Dark Developer Theme: Retro Pixel Art City/Room which gives a "Cute + Developer + Dark" vibe.
export const WALLPAPER_URL = "https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=2070&auto=format&fit=crop";

// ==================================================================================
// FILE SYSTEM CONFIGURATION
// ==================================================================================

/**
 * Helper to determine file type and icon based on extension.
 */
export const getFileInfo = (filename: string) => {
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
 * Creates a file object that points to a static file under public.
 */
export const createPublicFileObject = (filename: string, basePath: string): FileObject => {
    const info = getFileInfo(filename);
    return {
        name: filename,
        icon: info.icon,
        color: info.color,
        type: info.type,
        content: `${basePath}/${filename}`
    };
};

export const PARK_ROOT_PUBLIC_PATH = withBasePath('parkachieveone');
export const PARK_FILES_MANIFEST_PATH = `${PARK_ROOT_PUBLIC_PATH}/files.json`;

type ManifestEntry = {
    path: string;
    thumbnail?: string;
};

const addFolderIfMissing = (
    fsMap: Record<string, FileObject[]>,
    parentPath: string,
    folderName: string,
    folderPath: string,
) => {
    const parentItems = fsMap[parentPath] || [];
    const alreadyExists = parentItems.some(item => item.type === 'folder' && item.content === folderPath);

    if (!alreadyExists) {
        parentItems.push({
            name: folderName,
            icon: Folder,
            color: 'text-cyan-400',
            type: 'folder',
            content: folderPath,
        });
    }

    fsMap[parentPath] = parentItems;

    if (!fsMap[folderPath]) {
        fsMap[folderPath] = [];
    }
};

export const buildParkFileSystem = (entries: ManifestEntry[]): Record<string, FileObject[]> => {
    const fileSystemMap: Record<string, FileObject[]> = {
        parkachieveone: [],
    };

    for (const entry of entries) {
        const normalized = entry.path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
        if (!normalized) continue;

        const segments = normalized.split('/').filter(Boolean);
        const fileName = segments[segments.length - 1];

        let parentPath = 'parkachieveone';
        let absoluteFolderPath = PARK_ROOT_PUBLIC_PATH;
        const folderSegments = segments.slice(0, -1);

        for (const segment of folderSegments) {
            const nextFolderPath = parentPath === 'parkachieveone' ? segment : `${parentPath}/${segment}`;
            addFolderIfMissing(fileSystemMap, parentPath, segment, nextFolderPath);

            parentPath = nextFolderPath;
            absoluteFolderPath = `${absoluteFolderPath}/${segment}`;
        }

        const fileObject = createPublicFileObject(fileName, absoluteFolderPath);
        if (entry.thumbnail) {
            fileObject.thumbnail = entry.thumbnail;
        }

        fileSystemMap[parentPath] = [...(fileSystemMap[parentPath] || []), fileObject];
    }

    return fileSystemMap;
};

// Export the File System
export const FILE_SYSTEM: Record<string, FileObject[]> = {
    'parkachieveone': [],
    'Applications': [
        { name: 'NetLink', icon: Globe, color: 'text-blue-500', type: 'app', content: 'safari' },
        { name: 'Shell', icon: Code, color: 'text-gray-400', type: 'app', content: 'terminal' },
        { name: 'Market', icon: PlusCircle, color: 'text-purple-500', type: 'app', content: 'store' },
    ]
};
