import React, { useState, useContext } from 'react';
import { OSContext } from '../../context';
import { Plus, Globe, Layout, Type } from 'lucide-react';

export const AppStore: React.FC = () => {
  const { installApp } = useContext(OSContext);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('https://');
  const [color, setColor] = useState('bg-indigo-500');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url) return;
    installApp(title, url, 'globe', color);
    setTitle('');
    setUrl('https://');
    alert(`Module [${title}] Loaded Successfully.`);
  };

  const colors = [
    'bg-red-600', 'bg-orange-600', 'bg-yellow-600', 
    'bg-green-600', 'bg-teal-600', 'bg-blue-600', 
    'bg-indigo-600', 'bg-purple-600', 'bg-pink-600', 'bg-gray-700'
  ];

  return (
    <div className="w-full h-full bg-[#0a0a0a] text-cyan-100 flex flex-col font-mono">
       <div className="bg-black/20 border-b border-white/10 p-8">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2 uppercase tracking-tighter">
                Module Store
            </h1>
            <p className="text-gray-500 text-sm">Expand system capabilities with external links.</p>
       </div>

       <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto bg-white/5 rounded-xl border border-white/10 p-6 backdrop-blur-sm">
                <h2 className="text-lg font-semibold mb-6 flex items-center text-cyan-400 uppercase tracking-widest">
                    <Plus className="mr-2" size={20} />
                    Inject New Module
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Module Designation</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Type size={16} className="text-gray-600 group-focus-within:text-cyan-500" />
                            </div>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 bg-black/40 border border-gray-700 rounded focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors text-white placeholder-gray-700"
                                placeholder="e.g., NEURAL_LINK"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Source URL</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Globe size={16} className="text-gray-600 group-focus-within:text-cyan-500" />
                            </div>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 bg-black/40 border border-gray-700 rounded focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors text-white placeholder-gray-700"
                                placeholder="https://example.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Signature Color</label>
                        <div className="flex flex-wrap gap-3">
                            {colors.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded border border-white/10 ${c} ${color === c ? 'ring-2 ring-offset-2 ring-offset-black ring-cyan-500 scale-110' : 'hover:opacity-80'}`}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full flex justify-center py-2 px-4 border border-cyan-500/50 rounded shadow-[0_0_10px_rgba(6,182,212,0.2)] text-sm font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/50 hover:text-white transition-all"
                        >
                            Execute Injection
                        </button>
                    </div>
                </form>
            </div>
       </div>
    </div>
  );
};