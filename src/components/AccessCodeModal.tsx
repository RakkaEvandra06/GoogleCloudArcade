'use client';
import { useLang } from '@/lib/LanguageContext';
import { useState, useEffect } from 'react';
import { CheckIcon, CopyIcon, ExternalLinkIcon } from '@radix-ui/react-icons';

export interface TrackInfo {
  id: number;
  name: string;
  fullName: string;
  url: string;
  accessCode: string;
  img: string;
  desc: string;
  levelColor: string;
  level: string;
  type: string;
}

interface Props {
  track: TrackInfo; // always non-null — component only mounts when a track is selected
  onClose: () => void;
}

export default function AccessCodeModal({ track, onClose }: Props) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  /* Close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  /* Lock background scroll */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(track.accessCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.getElementById('arcade-access-code');
      if (el) window.getSelection()?.selectAllChildren(el);
    }
  };

  const handleOpen = () => {
    window.open(track.url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    /**
     * ROOT — fixed full-screen container, just a stacking-context anchor.
     */
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">

      <div
        className="absolute inset-0 overflow-y-auto animate-backdrop-in"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >

        <div className="flex min-h-full items-center justify-center p-4">

          {/* CARD — stopPropagation prevents backdrop's onClick from firing */}
          <div
            className="relative w-full max-w-sm animate-pop-in"
            style={{
              background: 'var(--surface)',
              border: `1px solid ${track.levelColor}50`,
              borderRadius: '1.25rem',
              boxShadow: `0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px ${track.levelColor}25`,
              padding: '1.5rem',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs transition-colors hover:opacity-70"
              style={{
                background: 'var(--surface-alt)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-md)',
              }}
              aria-label="Close"
            >✕</button>

            {/* Badge image + title */}
            <div className="flex flex-col items-center text-center mb-5">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-3 overflow-hidden"
                style={{ background: `${track.levelColor}18`, border: `1px solid ${track.levelColor}40` }}
              >
                <img
                  src={track.img}
                  alt={track.name}
                  className="w-16 h-16 object-contain"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <span
                className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider mb-2"
                style={{
                  background: `${track.levelColor}20`,
                  color: track.levelColor,
                  border: `1px solid ${track.levelColor}40`,
                }}
              >
                {track.type} · {track.level}
              </span>
              <h3 className="font-black text-base leading-tight mb-0.5" style={{ color: 'var(--foreground)' }}>
                {track.name}
              </h3>
              <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                {track.fullName}
              </p>
            </div>

            {/* Description */}
            <p className="text-xs leading-relaxed mb-5 text-center" style={{ color: 'var(--text-muted)' }}>
              {track.desc}
            </p>

            {/* Access code */}
            <div className="mb-5">
              <p className="text-[9px] font-mono font-bold uppercase tracking-widest mb-2 text-center" style={{ color: 'var(--text-muted)' }}>
                {t('modal.access.code')}
              </p>
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: 'var(--surface-alt)',
                  border: `2px solid ${track.levelColor}55`,
                  boxShadow: `0 0 12px ${track.levelColor}15`,
                }}
              >
                <code
                  id="arcade-access-code"
                  className="flex-1 text-center text-base font-mono font-black select-all tracking-wider"
                  style={{ color: 'var(--foreground)' }}
                >
                  {track.accessCode}
                </code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: copied ? 'var(--green-dim)' : 'var(--blue-dim)',
                    color: copied ? 'var(--green)' : 'var(--blue)',
                    border: `1px solid ${copied ? 'var(--green-border)' : 'var(--blue-border)'}`,
                  }}
                  title="Copy access code"
                >
                  {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                </button>
              </div>
              <p
                className="text-[9px] font-mono text-center mt-2 transition-opacity"
                style={{ color: 'var(--green)', opacity: copied ? 1 : 0, height: '1rem' }}
              >
                ✓ Copied to clipboard!
              </p>
            </div>

            {/* How to use */}
            <div
              className="rounded-xl px-4 py-3 mb-5 text-[10px] font-mono"
              style={{
                background: 'var(--blue-dim)',
                border: '1px solid var(--blue-border)',
                color: 'var(--text-muted)',
                lineHeight: 1.7,
              }}
            >
              <p className="font-bold mb-1" style={{ color: 'var(--blue)' }}>{t('modal.how_to_use')}</p>
              <ol className="space-y-0.5 list-decimal list-inside">
                <li>{t('modal.step1')}</li>
                <li>{t('modal.step2')}</li>
                <li>{t('modal.step3')}</li>
                <li>{t('modal.step4')}</li>
              </ol>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2.5">
              <button onClick={onClose} className="btn-ghost flex-1 text-xs py-2.5">
                {t('modal.close')}
              </button>
              <button
                onClick={handleOpen}
                className="btn-primary flex-1 text-xs py-2.5 flex items-center justify-center gap-1.5"
                style={{ background: track.levelColor, color: '#fff' }}
              >
                <ExternalLinkIcon className="w-3.5 h-3.5" />
                Open Google Skills
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}