'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

const CONFIGS = {
  success: { border: 'var(--green)',  bg: 'rgba(52,168,83,0.10)',  color: 'var(--green)',  icon: '✓' },
  error:   { border: 'var(--red)',    bg: 'rgba(234,67,53,0.10)',  color: 'var(--red)',    icon: '✕' },
  info:    { border: 'var(--blue)',   bg: 'rgba(66,133,244,0.10)', color: 'var(--blue)',   icon: 'ℹ' },
};

export default function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  const c = CONFIGS[type] ?? CONFIGS.info;

  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  return (
    <div
      className="animate-toast-in flex items-start gap-3 rounded-xl pointer-events-auto"
      style={{
        background: 'var(--surface)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${c.border}50`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px ${c.border}20`,
        padding: '0.875rem 1rem',
        maxWidth: 360,
        minWidth: 280,
      }}
      role="alert"
    >
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-black shrink-0 mt-0.5"
        style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}40` }}>
        {c.icon}
      </span>
      <p className="flex-1 text-xs font-medium leading-snug" style={{ color: 'var(--foreground)' }}>
        {message}
      </p>
      <button
        onClick={onClose}
        className="w-5 h-5 flex items-center justify-center shrink-0 font-mono text-xs transition-opacity hover:opacity-60"
        style={{ color: 'var(--text-muted)' }}>
        ✕
      </button>
    </div>
  );
}

export function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: { id: string; message: string; type: 'success' | 'error' | 'info' }[];
  removeToast: (id: string) => void;
}) {
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      role="region"
      aria-label="Notifications">
      {toasts.map(t => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
