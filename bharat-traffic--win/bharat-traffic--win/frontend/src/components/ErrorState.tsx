import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Telemetry Connection Error',
  message = 'Failed to connect to traffic control server or load live feed.',
  onRetry,
}) => {
  return (
    <div className="p-8 border border-red-500/30 rounded-2xl bg-red-950/20 text-center flex flex-col items-center space-y-3">
      <div className="p-3 rounded-full bg-red-500/20 text-red-400">
        <AlertOctagon className="w-8 h-8" />
      </div>
      <h4 className="text-sm font-bold text-red-400 font-mono">{title}</h4>
      <p className="text-xs text-slate-300 max-w-md">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Retry Connection
        </Button>
      )}
    </div>
  );
};
