import React, { useState } from 'react';

interface DebugPromptModalProps {
  isOpen: boolean;
  promptContent: string | null;
  onClose: () => void;
  phaseName: string;
}

export const DebugPromptModal: React.FC<DebugPromptModalProps> = ({ isOpen, promptContent, onClose, phaseName }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !promptContent) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="bg-gray-50 dark:bg-[#1e1e24] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-xl">🐛</span> 
            {phaseName} 生成提示詞 Debug
          </h3>
          <div className="flex items-center gap-2">
            <button
               onClick={handleCopy}
               className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${copied ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-300 dark:border-green-500/30' : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-300 dark:border-white/10'}`}
            >
              {copied ? '已複製！' : '複製內容'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-y-auto bg-gray-100 dark:bg-[#0a0a0d] m-4 rounded-xl border border-gray-200 dark:border-white/5 font-mono text-sm leading-relaxed text-gray-700 dark:text-gray-300 shadow-inner custom-scrollbar whitespace-pre-wrap">
          {promptContent}
        </div>
      </div>
    </div>
  );
};
