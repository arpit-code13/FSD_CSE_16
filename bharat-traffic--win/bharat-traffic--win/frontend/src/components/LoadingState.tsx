import React from 'react';

export interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading telemetry feed...',
}) => {
  return (
    <div className="p-12 flex flex-col items-center justify-center space-y-3 text-center">
      <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      <p className="text-xs font-mono text-cyan-400 font-semibold tracking-wider animate-pulse">
        {message}
      </p>
    </div>
  );
};
