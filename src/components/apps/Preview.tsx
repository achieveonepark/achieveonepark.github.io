import React from 'react';

interface PreviewProps {
  content?: string;
}

export const Preview: React.FC<PreviewProps> = ({ content }) => {
  if (!content) return <div className="flex items-center justify-center h-full text-gray-400">No image selected</div>;

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 overflow-hidden">
        <img src={content} alt="Preview" className="max-w-full max-h-full object-contain shadow-2xl" />
    </div>
  );
};