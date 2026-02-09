import React, { useState, useContext } from 'react';
import {
    HardDrive,
    LayoutGrid,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FileObject } from '../../types';
import { OSContext } from '../../context';
import { FILE_SYSTEM } from '../../constants';

export const Finder: React.FC = () => {
    const { openFile } = useContext(OSContext);
    // Default path
    const [activePath, setActivePath] = useState('parkachieveone');

    // Sidebar Configuration: Grouping items clearly
    const sidebarGroups = [
        {
            title: 'Favorites',
            items: [
                { name: 'Applications', path: 'Applications', icon: LayoutGrid, color: 'text-purple-400' },
            ]
        },
        {
            title: 'Locations',
            items: [
                { name: 'parkachieveone', path: 'parkachieveone', icon: HardDrive, color: 'text-cyan-400' },
            ]
        }
    ];

    // Retrieve files for current path
    const currentFiles = FILE_SYSTEM[activePath] || [];

    const handleDoubleClick = (file: FileObject) => {
        if (file.type === 'folder') {
            if (FILE_SYSTEM[file.name]) {
                setActivePath(file.name);
            } else {
                alert(`ACCESS DENIED: ${file.name} is encrypted.`);
            }
        } else {
            openFile(file);
        }
    };

    return (
        <div className="flex w-full h-full text-cyan-100 text-sm bg-transparent">
            {/* Sidebar */}
            <div className="w-48 bg-black/40 border-r border-white/10 p-3 pt-5 flex flex-col gap-6 select-none backdrop-blur-md">

                {sidebarGroups.map((group) => (
                    <div key={group.title} className="space-y-1">
                        <div className="text-[10px] uppercase tracking-widest font-bold text-gray-500 px-3 mb-2">
                            {group.title}
                        </div>
                        {group.items.map((item) => (
                            <div
                                key={item.name}
                                onClick={() => setActivePath(item.path)}
                                className={`
                    px-3 py-2 rounded-md cursor-pointer flex items-center space-x-3 transition-all duration-200
                    ${activePath === item.path
                                    ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                                    : 'hover:bg-white/10 text-gray-400 hover:text-cyan-100'}
                  `}
                            >
                                <item.icon size={16} className={activePath === item.path ? item.color : 'text-gray-500 group-hover:text-gray-300'} />
                                <span className="font-medium text-xs tracking-wide truncate">{item.name}</span>
                            </div>
                        ))}
                    </div>
                ))}

            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-black/20">
                {/* Path Bar */}
                <div className="h-9 border-b border-white/10 flex items-center px-4 bg-black/10 text-xs font-mono text-cyan-500/70">
                    ROOT / {activePath.toUpperCase()}
                </div>

                <div className="flex-1 p-4 overflow-y-auto" onClick={() => {}}>
                    <AnimatePresence mode="wait">
                        {currentFiles.length === 0 ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center justify-center h-full text-cyan-900 font-mono tracking-widest"
                            >
                                [ NO DATA ]
                            </motion.div>
                        ) : (
                            <motion.div
                                key={activePath}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.02 }}
                                transition={{ duration: 0.2 }}
                                className="grid grid-cols-4 md:grid-cols-5 gap-4 content-start"
                            >
                                {currentFiles.map((file, i) => (
                                    <div
                                        key={i}
                                        className="flex flex-col items-center p-3 rounded-lg hover:bg-white/10 cursor-pointer group transition-all duration-200 border border-transparent hover:border-cyan-500/20 active:scale-95"
                                        onDoubleClick={() => handleDoubleClick(file)}
                                    >
                                        <file.icon
                                            size={42}
                                            strokeWidth={1}
                                            className={`${file.color} mb-3 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-300`}
                                        />
                                        <span className="text-center text-[11px] text-gray-400 group-hover:text-cyan-300 leading-tight line-clamp-2 w-full break-words px-1 font-mono font-medium">
                                {file.name}
                            </span>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Status */}
                <div className="h-6 border-t border-white/10 bg-black/30 flex items-center justify-end px-3 text-[10px] text-gray-600 font-mono">
                    {currentFiles.length} OBJECTS FOUND
                </div>
            </div>
        </div>
    );
};