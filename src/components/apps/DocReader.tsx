import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Loader, AlertTriangle, ExternalLink } from 'lucide-react';
import { OSContext } from '../../context';
import { getFileInfo } from '../../constants';
import type { FileObject } from '../../types';

interface DocReaderProps {
  content?: string;
}

const VIEWER_FONT_FAMILY = "'Rajdhani', sans-serif";

export const DocReader: React.FC<DocReaderProps> = ({ content = '' }) => {
  const { openFile } = useContext(OSContext);
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const sourceUrl = useMemo(() => {
    if (!content.startsWith('http') && !content.startsWith('/')) return '';

    try {
      return new URL(content, window.location.origin).toString();
    } catch {
      return '';
    }
  }, [content]);

  const resolveLink = (href: string): URL | null => {
    try {
      const base = sourceUrl || window.location.href;
      return new URL(href, base);
    } catch {
      return null;
    }
  };

  const toOpenableFile = (targetUrl: URL): FileObject | null => {
    if (targetUrl.origin !== window.location.origin) return null;

    const pathname = decodeURIComponent(targetUrl.pathname);
    const fileName = pathname.split('/').pop();
    if (!fileName) return null;

    const { type, icon, color } = getFileInfo(fileName);
    if (!['markdown', 'pdf', 'image', 'text'].includes(type)) return null;

    return {
      name: fileName,
      type,
      icon,
      color,
      content: `${targetUrl.pathname}${targetUrl.search}`,
    };
  };

  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const targetUrl = resolveLink(href);
    if (!targetUrl) return;

    const file = toOpenableFile(targetUrl);
    if (!file) return;

    event.preventDefault();
    openFile(file);
  };

  useEffect(() => {
    // Check if content looks like a URL (http or local path /)
    const isUrl = content.startsWith('http') || content.startsWith('/');
    
    if (isUrl) {
      setLoading(true);
      setError(false);
      fetch(content)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to load: ${res.statusText}`);
          return res.text();
        })
        .then(data => {
          setText(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError(true);
          setLoading(false);
        });
    } else {
      // Treat as raw string content
      setText(content);
      setLoading(false);
      setError(false);
    }
  }, [content]);

  // Enhanced Inline Parser for Links and Bold text
  const parseInline = (text: string) => {
    // Regex for [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    
    // We will do a simple pass for links first as they are most complex
    // Note: This is a basic parser. Nested markdown isn't fully supported.
    
    // Replace logic with a splitter approach
    const splitByLink = text.split(linkRegex);
    
    // If no links, just check for bold
    if (splitByLink.length === 1) {
        return parseBold(text);
    }

    // Reconstruct with links
    // splitByLink will look like: ["Start ", "Link Text", "URL", " end."]
    for (let i = 0; i < splitByLink.length; i += 3) {
        // Text before link
        if (splitByLink[i]) {
            parts.push(<span key={`text-${i}`}>{parseBold(splitByLink[i])}</span>);
        }
        // The Link itself (if exists)
        if (i + 1 < splitByLink.length) {
            const linkText = splitByLink[i+1];
            const linkUrl = splitByLink[i+2];
            parts.push(
                <a 
                    key={`link-${i}`} 
                    href={resolveLink(linkUrl)?.toString() || linkUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(event) => handleLinkClick(event, linkUrl)}
                    className="text-blue-400 hover:text-blue-300 underline decoration-blue-500/30 hover:decoration-blue-300 inline-flex items-center gap-0.5 transition-colors mx-1"
                >
                    {linkText}
                    <ExternalLink size={10} className="opacity-70" />
                </a>
            );
        }
    }
    return parts;
  };

  const parseBold = (text: string) => {
      const parts = text.split(/\*\*([^*]+)\*\*/g);
      if (parts.length === 1) return text;

      return parts.map((part, i) => {
          // Even indices are normal text, odd are bold (captured group)
          if (i % 2 === 1) {
              return <strong key={i} className="text-cyan-100 font-bold">{part}</strong>;
          }
          return part;
      });
  };

  const lines = text.split('\n');

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d0d0d] text-cyan-500" style={{ fontFamily: VIEWER_FONT_FAMILY }}>
        <Loader className="animate-spin mb-4" size={32} />
        <div className="text-xs tracking-widest animate-pulse">ESTABLISHING DATALINK...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d0d0d] text-red-500 p-8 text-center" style={{ fontFamily: VIEWER_FONT_FAMILY }}>
        <AlertTriangle className="mb-4" size={32} />
        <div className="text-xs tracking-widest">CONNECTION FAILED</div>
        <div className="text-[10px] text-red-800 mt-2">UNABLE TO RETRIEVE DOCUMENT OBJECT</div>
        <div className="text-[10px] text-gray-600 mt-4 break-all bg-black/50 p-2 rounded">
          Target: {content}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#0d0d0d] text-gray-300" style={{ fontFamily: VIEWER_FONT_FAMILY }}>
      {/* Header Bar */}
      <div className="h-10 bg-black/40 border-b border-white/10 flex items-center px-4 space-x-3 shrink-0">
        <div className="bg-cyan-900/30 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border border-cyan-500/30">
          READ-ONLY
        </div>
        <div className="flex-1 text-right text-xs text-gray-600">
          DOC_VIEWER_V1.3
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-4">
          {lines.map((line, idx) => {
            // Header 1
            if (line.startsWith('# ')) {
              return (
                <h1 key={idx} className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mt-6 mb-4 border-b border-white/10 pb-2 uppercase tracking-tight">
                  {line.replace('# ', '')}
                </h1>
              );
            }
            // Header 2
            if (line.startsWith('## ')) {
              return (
                <h2 key={idx} className="text-xl font-bold text-cyan-200 mt-6 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-cyan-500 rounded-full mr-2"></span>
                  {line.replace('## ', '')}
                </h2>
              );
            }
             // Header 3
             if (line.startsWith('### ')) {
                return (
                  <h3 key={idx} className="text-lg font-bold text-purple-300 mt-4 mb-2">
                    {line.replace('### ', '')}
                  </h3>
                );
              }
            // List Item
            if (line.trim().startsWith('- ')) {
              return (
                <div key={idx} className="flex items-start ml-4 text-gray-300 my-1">
                  <span className="text-cyan-500 mr-2">▹</span>
                  <span className="text-gray-400">{parseInline(line.replace('- ', ''))}</span>
                </div>
              );
            }
             // Numbered List
             if (/^\d+\./.test(line.trim())) {
                return (
                  <div key={idx} className="flex items-start ml-4 text-gray-300 my-1">
                    <span className="text-purple-500 mr-2 text-xs">{line.split('.')[0]}.</span>
                    <span>{parseInline(line.replace(/^\d+\.\s/, ''))}</span>
                  </div>
                );
              }
            // Blockquote
            if (line.trim().startsWith('> ')) {
              return (
                <div key={idx} className="border-l-2 border-purple-500 bg-purple-900/10 p-3 my-4 italic text-purple-200 rounded-r">
                  {parseInline(line.replace('> ', ''))}
                </div>
              );
            }
            // Code Block (Simple detection)
            if (line.trim().startsWith('```')) {
                return null; // Skip the markers for this simple parser
            }
             // Horizontal Rule
             if (line.trim() === '---') {
                return <div key={idx} className="border-b border-white/10 my-8"></div>;
             }

            // Empty line
            if (line.trim() === '') {
              return <div key={idx} className="h-2"></div>;
            }
            // Regular paragraph
            return (
              <p key={idx} className="text-sm leading-relaxed text-gray-400">
                {parseInline(line)}
              </p>
            );
          })}
        </div>
        
        {/* End of Document Marker */}
        <div className="mt-12 flex justify-center opacity-30">
             <div className="w-2 h-2 bg-gray-500 rounded-full mx-1"></div>
             <div className="w-2 h-2 bg-gray-500 rounded-full mx-1"></div>
             <div className="w-2 h-2 bg-gray-500 rounded-full mx-1"></div>
        </div>
      </div>
    </div>
  );
};
