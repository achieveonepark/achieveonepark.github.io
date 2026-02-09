import React from 'react';

interface TextEditProps {
  content?: string;
}

export const TextEdit: React.FC<TextEditProps> = ({ content }) => {
  return (
    <div className="w-full h-full flex flex-col bg-[#111] text-gray-300">
      <div className="h-8 bg-black/20 border-b border-white/10 flex items-center px-4 space-x-4 text-xs text-gray-500 select-none font-mono">
         <span className="hover:text-cyan-400 cursor-pointer">FILE</span>
         <span className="hover:text-cyan-400 cursor-pointer">EDIT</span>
         <span className="hover:text-cyan-400 cursor-pointer">VIEW</span>
      </div>
      <textarea 
        className="flex-1 w-full h-full p-6 outline-none resize-none font-mono text-sm leading-relaxed bg-transparent text-cyan-100 placeholder-gray-700"
        value={content || ''}
        readOnly
        placeholder="Enter data stream..."
      />
    </div>
  );
};