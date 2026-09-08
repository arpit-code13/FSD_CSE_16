import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'alert';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 5000
  timestamp: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id' | 'timestamp'>) => {
      counterRef.current += 1;
      const id = `toast-${Date.now()}-${counterRef.current}`;
      const newToast: Toast = {
        ...toast,
        id,
        timestamp: Date.now(),
        duration: toast.duration ?? 5000,
      };

      setToasts((prev) => [...prev.slice(-4), newToast]); // keep max 5

      // Auto-remove after duration
      const duration = newToast.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      {/* Toast Render Layer */}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 w-80 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// --- ToastItem component ---

const typeStyles: Record<ToastType, { bg: string; border: string; icon: string; accent: string }> = {
  success: {
    bg: 'bg-emerald-950/90',
    border: 'border-emerald-500/50',
    icon: 'text-emerald-400',
    accent: 'bg-emerald-500/20',
  },
  error: {
    bg: 'bg-red-950/90',
    border: 'border-red-500/50',
    icon: 'text-red-400',
    accent: 'bg-red-500/20',
  },
  warning: {
    bg: 'bg-amber-950/90',
    border: 'border-amber-500/50',
    icon: 'text-amber-400',
    accent: 'bg-amber-500/20',
  },
  info: {
    bg: 'bg-slate-900/95',
    border: 'border-cyan-500/50',
    icon: 'text-cyan-400',
    accent: 'bg-cyan-500/20',
  },
  alert: {
    bg: 'bg-red-950/95',
    border: 'border-red-500/70',
    icon: 'text-red-400',
    accent: 'bg-red-500/30',
  },
};

const typeEmoji: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
  alert: '🚨',
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const style = typeStyles[toast.type];

  return (
    <div
      className={`${style.bg} ${style.border} border rounded-xl p-3 shadow-2xl pointer-events-auto animate-slide-in-right backdrop-blur-md`}
    >
      <div className="flex items-start gap-2.5">
        <div className={`${style.accent} p-1.5 rounded-lg shrink-0 mt-0.5`}>
          <span className={`${style.icon} text-xs font-bold font-mono`}>{typeEmoji[toast.type]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-100 font-mono uppercase tracking-wide truncate">
              {toast.title}
            </h4>
            <button
              onClick={() => onRemove(toast.id)}
              className="text-slate-500 hover:text-slate-200 text-xs shrink-0 transition-colors"
            >
              ✕
            </button>
          </div>
          {toast.message && (
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{toast.message}</p>
          )}
          <div className="text-[9px] text-slate-500 font-mono mt-1">
            {new Date(toast.timestamp).toLocaleTimeString('en-IN', { hour12: false })}
          </div>
        </div>
      </div>
    </div>
  );
};
