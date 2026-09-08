import React from 'react';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
}) => {
  return (
    <div className={`bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-2xl space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
            {title}
          </h3>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="pt-2">{children}</div>
    </div>
  );
};
