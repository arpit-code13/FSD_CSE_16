import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'command' | 'gradient';
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  header,
  footer,
  className,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-slate-900/80 border border-slate-800 shadow-xl',
    bordered: 'bg-slate-950/60 border-2 border-slate-800 shadow-lg',
    command: 'bg-slate-900 border border-emerald-500/30 shadow-2xl shadow-emerald-500/5',
    gradient: 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-cyan-500/20 shadow-xl',
  };

  return (
    <div className={twMerge(clsx('rounded-2xl overflow-hidden transition-all', variantStyles[variant], className))} {...props}>
      {header && (
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          {header}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && (
        <div className="px-5 py-3.5 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
};
