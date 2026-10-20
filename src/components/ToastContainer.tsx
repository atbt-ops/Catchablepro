import React from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  const ICONS = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-500 flex-shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />,
  };

  const BORDERS = {
    success: 'border-emerald-200 bg-white/95 text-slate-900 shadow-emerald-500/10',
    info: 'border-indigo-200 bg-white/95 text-slate-900 shadow-indigo-500/10',
    warning: 'border-amber-200 bg-white/95 text-slate-900 shadow-amber-500/10',
    error: 'border-rose-200 bg-white/95 text-slate-900 shadow-rose-500/10',
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-md shadow-xl transition-all animate-in slide-in-from-bottom-5 duration-200 ${BORDERS[toast.type]}`}
        >
          <div className="pt-0.5">{ICONS[toast.type]}</div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 leading-tight">{toast.title}</h4>
            {toast.message && (
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
