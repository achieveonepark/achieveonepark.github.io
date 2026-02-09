import React from 'react';
import { Lock, RotateCcw, Shield } from 'lucide-react';

interface BrowserProps {
  url: string;
}

export const Browser: React.FC<BrowserProps> = ({ url }) => {
  const isYouTube = /youtube\.com|youtu\.be/i.test(url);
  const iframeClassName = isYouTube
    ? 'w-full flex-1 border-none bg-black'
    : 'w-full flex-1 border-none bg-white';

  return (
    <div className="w-full h-full flex flex-col bg-gray-900">
      {/* Browser Toolbar */}
      <div className="h-10 bg-black/40 border-b border-white/10 flex items-center px-4 space-x-3">
        <div className="flex space-x-2 text-gray-500">
           <RotateCcw size={16} className="hover:text-cyan-400 cursor-pointer" />
        </div>
        <div className="flex-1 bg-black/50 rounded h-7 border border-white/10 flex items-center px-3 text-xs text-cyan-600 shadow-inner font-mono">
          <Shield size={10} className="mr-2 text-green-500" />
          <span className="text-gray-400 mr-1">SECURE://</span> {url.replace('https://', '')}
        </div>
      </div>
      <iframe
        src={url}
        className={iframeClassName}
        title="browser"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
      />
    </div>
  );
};
