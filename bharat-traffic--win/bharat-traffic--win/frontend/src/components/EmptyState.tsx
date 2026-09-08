import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Telemetry Records Found',
  description = 'There are currently no active items or telemetry records available in this view.',
  actionText,
  onAction,
}) => {
  return (
    <div className="p-12 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/40 flex flex-col items-center justify-center text-center space-y-3">
      <div className="p-3 rounded-2xl bg-slate-800/60 text-slate-400">
        <Inbox className="w-8 h-8" />
      </div>
      <h4 className="text-sm font-bold text-slate-200 font-mono">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm">{description}</p>
      {actionText && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-2">
          {actionText}
        </Button>
      )}
    </div>
  );
};
