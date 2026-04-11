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

  // Enhanced inline parser for links and inline markdown styles.
  const parseInline = (text: string) => {
    // Regex for [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    
    // We will do a simple pass for links first as they are most complex
    // Note: This is a basic parser. Nested markdown isn't fully supported.
    
    // Replace logic with a splitter approach
    const splitByLink = text.split(linkRegex);
    
    // If no links, just check inline styles.
    if (splitByLink.length === 1) {
        return parseInlineStyles(text);
    }

    // Reconstruct with links
    // splitByLink will look like: ["Start ", "Link Text", "URL", " end."]
    for (let i = 0; i < splitByLink.length; i += 3) {
        // Text before link
        if (splitByLink[i]) {
            parts.push(<span key={`text-${i}`}>{parseInlineStyles(splitByLink[i])}</span>);
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

  const parseInlineStyles = (text: string) => {
      if (!/(`[^`]+`|\*\*[^*]+\*\*)/.test(text)) return text;
      const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);

      return parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
              return <strong key={i} className="text-cyan-100 font-bold">{part.slice(2, -2)}</strong>;
          }

          if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
              return (
                <code
                  key={i}
                  className="rounded border border-cyan-500/30 bg-cyan-950/60 px-1.5 py-0.5 font-mono text-[0.78rem] text-cyan-100"
                >
                  {part.slice(1, -1)}
                </code>
              );
          }

          return <React.Fragment key={i}>{part}</React.Fragment>;
      });
  };

  const normalizeTableLine = (line: string) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- |')) return trimmed.slice(2).trimStart();
    if (trimmed.startsWith('|')) return trimmed;
    return null;
  };

  const splitTableRow = (line: string) => {
    const normalized = line.trim().replace(/^\|/, '').replace(/\|$/, '');
    return normalized.split('|').map(cell => cell.trim());
  };

  const isTableSeparator = (line: string) => {
    const cells = splitTableRow(line);
    return cells.length > 0 && cells.every(cell => cell === '' || /^:?-{3,}:?$/.test(cell));
  };

  const extractYouTubeVideoId = (url: string) => {
    const embedMatch = url.match(/youtube\.com\/embed\/([^?&/]+)/i);
    if (embedMatch?.[1]) return embedMatch[1];

    const watchMatch = url.match(/[?&]v=([^?&/]+)/i);
    if (watchMatch?.[1]) return watchMatch[1];

    const shortMatch = url.match(/youtu\.be\/([^?&/]+)/i);
    if (shortMatch?.[1]) return shortMatch[1];

    return '';
  };

  const parseMediaLine = (line: string) => {
    const trimmed = line.trim();
    const markdownMediaMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    const directUrlMatch = trimmed.match(/^https?:\/\/\S+$/i);
    if (!markdownMediaMatch && !directUrlMatch) return null;

    const alt = markdownMediaMatch?.[1] || '';
    const rawSrc = markdownMediaMatch?.[2] || directUrlMatch?.[0] || '';
    const resolvedSrc = resolveLink(rawSrc)?.toString() || rawSrc;
    const youtubeId = extractYouTubeVideoId(rawSrc) || extractYouTubeVideoId(resolvedSrc);
    if (youtubeId) {
      return {
        kind: 'youtube' as const,
        alt,
        src: `https://www.youtube.com/embed/${youtubeId}`,
        rawUrl: resolvedSrc,
      };
    }

    const isVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(rawSrc) || /\.(mp4|webm|ogg)(\?.*)?$/i.test(resolvedSrc);
    const isImage = /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(rawSrc) || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(resolvedSrc);
    if (isVideo) {
      return {
        kind: 'video' as const,
        alt,
        src: resolvedSrc,
        rawUrl: resolvedSrc,
      };
    }
    if (isImage) {
      return {
        kind: 'image' as const,
        alt,
        src: resolvedSrc,
        rawUrl: resolvedSrc,
      };
    }
    return null;
  };

  const lines = text.split('\n');
  const renderedLines: React.ReactNode[] = [];

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    const trimmedLine = line.trim();

    // Markdown table (supports lines starting with "|", and "- |" inside lists).
    const tableHeaderCandidate = normalizeTableLine(line);
    const tableSeparatorCandidate = idx + 1 < lines.length ? normalizeTableLine(lines[idx + 1]) : null;
    if (tableHeaderCandidate && tableSeparatorCandidate && isTableSeparator(tableSeparatorCandidate)) {
      const tableLines: string[] = [tableHeaderCandidate];
      let tableCursor = idx + 1;

      while (tableCursor < lines.length) {
        const rowCandidate = normalizeTableLine(lines[tableCursor]);
        if (!rowCandidate) break;
        tableLines.push(rowCandidate);
        tableCursor += 1;
      }

      const headerCells = splitTableRow(tableLines[0]);
      const bodyRows = tableLines.slice(2).map(splitTableRow);

      renderedLines.push(
        <div key={`table-${idx}`} className="my-4 overflow-x-auto rounded-lg border border-cyan-500/30 bg-black/40">
          <table className="min-w-full border-collapse text-xs sm:text-sm">
            <thead className="bg-cyan-900/25">
              <tr>
                {headerCells.map((cell, cellIndex) => (
                  <th
                    key={`th-${idx}-${cellIndex}`}
                    className="border-b border-cyan-500/25 px-3 py-2 text-left text-cyan-100 font-semibold whitespace-nowrap"
                  >
                    {cell ? parseInline(cell) : '\u00A0'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, rowIndex) => (
                <tr key={`tr-${idx}-${rowIndex}`} className="even:bg-cyan-900/10">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`td-${idx}-${rowIndex}-${cellIndex}`}
                      className="border-t border-cyan-500/15 px-3 py-2 text-gray-300 align-top"
                    >
                      {cell ? parseInline(cell) : '\u00A0'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );

      idx = tableCursor - 1;
      continue;
    }

    const media = parseMediaLine(line);
    if (media?.kind === 'youtube') {
      renderedLines.push(
        <div key={`youtube-${idx}`} className="my-4 rounded-lg border border-cyan-500/30 bg-black/40 p-2.5">
          <div className="relative w-full overflow-hidden rounded-md border border-white/10 bg-black pb-[56.25%]">
            <iframe
              src={media.src}
              title={media.alt || 'YouTube Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-cyan-200/90">{media.alt || 'YouTube Video'}</span>
            <a
              href={media.rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200 underline decoration-blue-400/40"
            >
              Open YouTube
              <ExternalLink size={11} />
            </a>
          </div>
        </div>,
      );
      continue;
    }

    if (media?.kind === 'video') {
      renderedLines.push(
        <div key={`video-${idx}`} className="my-4 rounded-lg border border-cyan-500/30 bg-black/40 p-2.5">
          <video controls preload="metadata" className="w-full rounded-md border border-white/10 bg-black">
            <source src={media.src} />
            Your browser does not support the video tag.
          </video>
          {(media.alt || media.src) && (
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-cyan-200/90">{media.alt || 'Video'}</span>
              <a
                href={media.src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200 underline decoration-blue-400/40"
              >
                Open Video
                <ExternalLink size={11} />
              </a>
            </div>
          )}
        </div>,
      );
      continue;
    }

    if (media?.kind === 'image') {
      renderedLines.push(
        <div key={`image-${idx}`} className="my-4 rounded-lg border border-cyan-500/30 bg-black/40 p-2.5">
          <img src={media.src} alt={media.alt || 'Image'} className="w-full rounded-md border border-white/10" />
          {media.alt && <div className="mt-2 text-xs text-cyan-200/90">{media.alt}</div>}
        </div>,
      );
      continue;
    }

    // Header 1
    if (line.startsWith('# ')) {
      renderedLines.push(
        <h1 key={idx} className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mt-6 mb-4 border-b border-white/10 pb-2 uppercase tracking-tight">
          {line.replace('# ', '')}
        </h1>,
      );
      continue;
    }

    // Header 2
    if (line.startsWith('## ')) {
      renderedLines.push(
        <h2 key={idx} className="text-xl font-bold text-cyan-200 mt-6 mb-2 flex items-center">
          <span className="w-2 h-2 bg-cyan-500 rounded-full mr-2"></span>
          {line.replace('## ', '')}
        </h2>,
      );
      continue;
    }

    // Header 3
    if (line.startsWith('### ')) {
      renderedLines.push(
        <h3 key={idx} className="text-lg font-bold text-purple-300 mt-4 mb-2">
          {line.replace('### ', '')}
        </h3>,
      );
      continue;
    }

    // List Item
    if (trimmedLine.startsWith('- ')) {
      renderedLines.push(
        <div key={idx} className="flex items-start ml-4 text-gray-300 my-1">
          <span className="text-cyan-500 mr-2">▹</span>
          <span className="text-gray-400">{parseInline(trimmedLine.replace(/^- /, ''))}</span>
        </div>,
      );
      continue;
    }

    // Numbered List
    if (/^\d+\./.test(trimmedLine)) {
      const orderMark = trimmedLine.match(/^\d+\./)?.[0] || '1.';
      renderedLines.push(
        <div key={idx} className="flex items-start ml-4 text-gray-300 my-1">
          <span className="text-purple-500 mr-2 text-xs">{orderMark}</span>
          <span>{parseInline(trimmedLine.replace(/^\d+\.\s*/, ''))}</span>
        </div>,
      );
      continue;
    }

    // Blockquote
    if (trimmedLine.startsWith('> ')) {
      renderedLines.push(
        <div key={idx} className="border-l-2 border-purple-500 bg-purple-900/10 p-3 my-4 italic text-purple-200 rounded-r">
          {parseInline(trimmedLine.replace(/^> /, ''))}
        </div>,
      );
      continue;
    }

    // Code Block (Simple detection)
    if (trimmedLine.startsWith('```')) {
      continue; // Skip the markers for this simple parser
    }

    // Horizontal Rule
    if (trimmedLine === '---') {
      renderedLines.push(<div key={idx} className="border-b border-white/10 my-8"></div>);
      continue;
    }

    // Empty line
    if (trimmedLine === '') {
      renderedLines.push(<div key={idx} className="h-2"></div>);
      continue;
    }

    // Regular paragraph
    renderedLines.push(
      <p key={idx} className="text-sm leading-relaxed text-gray-400">
        {parseInline(line)}
      </p>,
    );
  }

  if (loading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d0d] text-cyan-500" style={{ fontFamily: VIEWER_FONT_FAMILY }}>
        <Loader className="animate-spin mb-4" size={32} />
        <div className="text-xs tracking-widest animate-pulse">ESTABLISHING DATALINK...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d0d] text-red-500 p-8 text-center" style={{ fontFamily: VIEWER_FONT_FAMILY }}>
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
    <div className="absolute inset-0 flex flex-col bg-[#0d0d0d] text-gray-300" style={{ fontFamily: VIEWER_FONT_FAMILY }}>
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
      <div className="flex-1 min-h-0 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-4">
          {renderedLines}
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
