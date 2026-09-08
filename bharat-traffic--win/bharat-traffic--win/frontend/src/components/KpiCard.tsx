import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  color?: 'cyan' | 'emerald' | 'amber' | 'red' | 'purple';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  trend = 'neutral',
  icon: Icon,
  color = 'cyan',
}) => {
  const colorVariants = {
    cyan: 'from-cyan-500/10 to-cyan-500/5 text-cyan-400 border-cyan-500/20',
    emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
    amber: 'from-amber-500/10 to-amber-500/5 text-amber-400 border-amber-500/20',
    red: 'from-red-500/10 to-red-500/5 text-red-400 border-red-500/20',
    purple: 'from-purple-500/10 to-purple-500/5 text-purple-400 border-purple-500/20',
  };

  const iconBgs = {
    cyan: 'bg-cyan-500/20 text-cyan-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    red: 'bg-red-500/20 text-red-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div className={`p-4 rounded-xl border bg-gradient-to-br ${colorVariants[color]} shadow-lg flex items-center justify-between`}>
      <div>
        <p className="text-xs text-slate-400 font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-slate-100 mt-1 font-mono tracking-tight">{value}</h3>
        {subtitle && (
          <p
            className={`text-[11px] mt-1 font-semibold ${
              trend === 'up'
                ? 'text-emerald-400'
                : trend === 'down'
                ? 'text-red-400'
                : 'text-slate-400'
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${iconBgs[color]} shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
};
