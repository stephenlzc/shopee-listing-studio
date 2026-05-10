import React from 'react';
import { Spinner } from './Spinner';

interface LoadingOverlayProps {
  title: string;
  description: string;
  colorClass?: string; // e.g. 'purple', 'blue', 'green'
  timeEstimate?: string; // e.g. '预计需要 1-2 分钟'
}

const COLOR_MAP: Record<string, string> = {
  purple: 'text-purple-600 dark:text-purple-400',
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-green-600 dark:text-green-400',
};

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  title,
  description,
  colorClass = 'purple',
  timeEstimate,
}) => {
  const spinnerColor = COLOR_MAP[colorClass] || COLOR_MAP.purple;

  return (
    <div className="flex flex-col items-center justify-center mt-20 space-y-6 text-center animate-in fade-in zoom-in duration-500">
      <div className="relative">
        <Spinner className={`w-20 h-20 ${spinnerColor}`} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 bg-white rounded-full opacity-10 animate-ping"></div>
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
        <p className="text-gray-500 dark:text-gray-400">{description}</p>
        {timeEstimate && (
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-3">{timeEstimate}</p>
        )}
      </div>
    </div>
  );
};
