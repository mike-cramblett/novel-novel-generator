
import React from 'react';

interface LoadingIndicatorProps {
  message: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-sky-400"></div>
        <p className="text-xl font-semibold text-sky-300">{message}</p>
        <p className="text-slate-400 text-center">This may take a few moments. Please be patient as the AI writes your story.</p>
    </div>
  );
};

export default LoadingIndicator;
