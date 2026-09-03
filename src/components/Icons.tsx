'use client';

import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
  strokeWidth?: number;
}

/** Base for stroked icons */
function S({
  size = 16, className = '', style, 'aria-label': label,
  strokeWidth = 1.75, children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size} height={size}
      fill="none" stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      className={className}
      style={style}
    >
      {children}
    </svg>
  );
}

/** Base for filled icons */
function F({
  size = 16, className = '', style, 'aria-label': label, children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size} height={size}
      fill="currentColor"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      className={className}
      style={style}
    >
      {children}
    </svg>
  );
}

/* ── Navigation ────────────────────────────────────────────── */

export function MenuIcon(p: IconProps) {
  return <S {...p}>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </S>;
}

export function GlobeIcon(p: IconProps) {
  return <S {...p}>
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 3c-2.5 3-3.9 5.8-3.9 9s1.4 6 3.9 9"/>
    <path d="M12 3c2.5 3 3.9 5.8 3.9 9s-1.4 6-3.9 9"/>
    <line x1="3.6" y1="9" x2="20.4" y2="9"/>
    <line x1="3.6" y1="15" x2="20.4" y2="15"/>
  </S>;
}

export function ChevronDownIcon(p: IconProps) {
  return <S {...p}><polyline points="6 9 12 15 18 9"/></S>;
}

export function ChevronUpIcon(p: IconProps) {
  return <S {...p}><polyline points="18 15 12 9 6 15"/></S>;
}

/* ── Theme ─────────────────────────────────────────────────── */

export function SunIcon(p: IconProps) {
  return <S {...p}>
    <circle cx="12" cy="12" r="4"/>
    <line x1="12" y1="2" x2="12" y2="4"/>
    <line x1="12" y1="20" x2="12" y2="22"/>
    <line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/>
    <line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/>
    <line x1="2" y1="12" x2="4" y2="12"/>
    <line x1="20" y1="12" x2="22" y2="12"/>
    <line x1="6.34" y1="17.66" x2="4.93" y2="19.07"/>
    <line x1="19.07" y1="4.93" x2="17.66" y2="6.34"/>
  </S>;
}

export function MoonIcon(p: IconProps) {
  return <F {...p}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </F>;
}

/* ── Auth / Access ─────────────────────────────────────────── */

export function LockIcon(p: IconProps) {
  return <S {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" ry="2"/>
    <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
  </S>;
}

export function KeyIcon(p: IconProps) {
  return <S {...p}>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </S>;
}

export function ShieldLockIcon(p: IconProps) {
  return <S {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <rect x="9" y="11" width="6" height="5" rx="1"/>
    <path d="M10 11V9a2 2 0 0 1 4 0v2"/>
  </S>;
}

export function ShieldCheckIcon(p: IconProps) {
  return <S {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </S>;
}

export function LogOutIcon(p: IconProps) {
  return <S {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </S>;
}

/* ── Users / Social ────────────────────────────────────────── */

export function UserIcon(p: IconProps) {
  return <S {...p}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </S>;
}

export function UsersIcon(p: IconProps) {
  return <S {...p}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </S>;
}

/* ── Tiers / Rankings ──────────────────────────────────────── */

export function TrophyIcon(p: IconProps) {
  return <S {...p}>
    <polyline points="14.5 17 14.5 22 9.5 22 9.5 17"/>
    <path d="M20 4H4v6a8 8 0 0 0 16 0V4z"/>
    <line x1="2" y1="4" x2="6" y2="4"/>
    <line x1="22" y1="4" x2="18" y2="4"/>
    <line x1="7" y1="22" x2="17" y2="22"/>
  </S>;
}

export function CrownIcon(p: IconProps) {
  return <S {...p}>
    <path d="M2 20h20"/>
    <path d="M4 20L2 8l5.5 3.5L12 4l4.5 7.5L22 8l-2 12"/>
  </S>;
}

export function CrosshairIcon(p: IconProps) {
  return <S {...p}>
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="3"/>
    <line x1="12" y1="3" x2="12" y2="7"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
    <line x1="3" y1="12" x2="7" y2="12"/>
    <line x1="17" y1="12" x2="21" y2="12"/>
  </S>;
}

export function ShieldIcon(p: IconProps) {
  return <S {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </S>;
}

/* ── Status / Streak ───────────────────────────────────────── */

export function FlameIcon(p: IconProps) {
  return <F {...p}>
    <path d="M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 4.85 13.95 3c-1 .23-1.94.68-2.71 1.32-2.23 1.89-2.88 5.13-2.2 7.89.07.28.15.56.23.84.08.28.15.57.15.86 0 .59-.16 1.19-.48 1.71-.25.4-.58.85-.57 1.35.01.27.12.53.27.76.35.52.88.9 1.47 1.05.53.14 1.06.14 1.59.03.5-.1.94-.28 1.38-.5a8.42 8.42 0 0 0 3.08-3.46c.29-.63.48-1.3.54-1.97.01-.15.01-.31.01-.46 0-.64-.13-1.31-.38-1.93.2.06.38.16.53.32"/>
  </F>;
}

export function BoltIcon(p: IconProps) {
  return <S {...p}><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></S>;
}

export function StarIcon(p: IconProps) {
  return <S {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></S>;
}

/* ── Actions ───────────────────────────────────────────────── */

export function CheckIcon(p: IconProps) {
  return <S {...p}><polyline points="20 6 9 17 4 12"/></S>;
}

export function CheckCircleIcon(p: IconProps) {
  return <S {...p}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </S>;
}

export function XIcon(p: IconProps) {
  return <S {...p}>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </S>;
}

export function XCircleIcon(p: IconProps) {
  return <S {...p}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </S>;
}

export function RefreshIcon(p: IconProps) {
  return <S {...p}>
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </S>;
}

export function ExternalLinkIcon(p: IconProps) {
  return <S {...p}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </S>;
}

export function CopyIcon(p: IconProps) {
  return <S {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </S>;
}

export function SendIcon(p: IconProps) {
  return <S {...p}>
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </S>;
}

export function ArrowUpRightIcon(p: IconProps) {
  return <S {...p}>
    <line x1="7" y1="17" x2="17" y2="7"/>
    <polyline points="7 7 17 7 17 17"/>
  </S>;
}

export function PlayIcon(p: IconProps) {
  return <F {...p}><polygon points="5 3 19 12 5 21 5 3"/></F>;
}

/* ── Data / Content ────────────────────────────────────────── */

export function ChartBarIcon(p: IconProps) {
  return <S {...p}>
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </S>;
}

export function TableIcon(p: IconProps) {
  return <S {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="3" y1="15" x2="21" y2="15"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
  </S>;
}

export function FileIcon(p: IconProps) {
  return <S {...p}>
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
    <polyline points="13 2 13 9 20 9"/>
  </S>;
}

export function FileTextIcon(p: IconProps) {
  return <S {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </S>;
}

export function UploadIcon(p: IconProps) {
  return <S {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </S>;
}

export function ClockIcon(p: IconProps) {
  return <S {...p}>
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </S>;
}

export function DatabaseIcon(p: IconProps) {
  return <S {...p}>
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </S>;
}

export function SearchIcon(p: IconProps) {
  return <S {...p}>
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </S>;
}

export function FilterIcon(p: IconProps) {
  return <S {...p}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></S>;
}

/* ── Communication ─────────────────────────────────────────── */

export function MailIcon(p: IconProps) {
  return <S {...p}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22 6 12 13 2 6"/>
  </S>;
}

export function MessageIcon(p: IconProps) {
  return <S {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </S>;
}

/* ── Settings / System ─────────────────────────────────────── */

export function WrenchIcon(p: IconProps) {
  return <S {...p}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </S>;
}

export function AuditIcon(p: IconProps) {
  return <S {...p}>
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="2"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="16" x2="12" y2="16"/>
  </S>;
}

export function SyncAllIcon(p: IconProps) {
  return <S {...p}>
    <polyline points="17 1 21 5 17 9"/>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <polyline points="7 23 3 19 7 15"/>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </S>;
}

export function GridIcon(p: IconProps) {
  return <S {...p}>
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </S>;
}

export function LayersIcon(p: IconProps) {
  return <S {...p}>
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </S>;
}

export function BadgeIcon(p: IconProps) {
  return <S {...p}>
    <circle cx="12" cy="8" r="6"/>
    <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
  </S>;
}

export function InfoIcon(p: IconProps) {
  return <S {...p}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </S>;
}

export function AlertIcon(p: IconProps) {
  return <S {...p}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </S>;
}

export function TrendUpIcon(p: IconProps) {
  return <S {...p}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </S>;
}

/* ══════════════════════════════════════════════════════════════
   Composite / Utility Components
   ══════════════════════════════════════════════════════════════ */

/** Numeric rank medal: gold (1), silver (2), bronze (3), plain text otherwise */
export function RankMedal({ rank, size = 20 }: { rank: number; size?: number }) {
  type MedalColor = { bg: string; text: string; border: string };
  const MEDAL: Record<number, MedalColor> = {
    1: { bg: '#fbbf24', text: '#78350f', border: '#d97706' },
    2: { bg: '#9ca3af', text: '#1f2937', border: '#6b7280' },
    3: { bg: '#b45309', text: '#fff7ed', border: '#92400e' },
  };
  const c = MEDAL[rank];
  if (!c) {
    return (
      <span
        className="font-mono font-bold tabular-nums leading-none"
        style={{ color: 'var(--text-muted)', fontSize: size * 0.7, minWidth: size, textAlign: 'center', display: 'inline-block' }}
      >
        {rank}
      </span>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      width={size}
      height={size}
      aria-label={`Rank ${rank}`}
      role="img"
    >
      <circle cx="10" cy="10" r="9" fill={c.bg} stroke={c.border} strokeWidth="1.5"/>
      <text
        x="10" y="14"
        textAnchor="middle"
        fontSize="9"
        fontWeight="900"
        fill={c.text}
        fontFamily="system-ui, -apple-system, monospace"
      >
        {rank}
      </text>
    </svg>
  );
}

/** Dispatch tier icon based on the tier key string */
export function TierIcon({
  tierKey, size = 16, color = 'currentColor',
}: {
  tierKey: string;
  size?: number;
  color?: string;
}) {
  const style: React.CSSProperties = { color, flexShrink: 0 };
  const props: IconProps = { size, style };
  switch (tierKey) {
    case 'tier.legend':   return <TrophyIcon   {...props} aria-label="Legend tier" />;
    case 'tier.champion': return <CrownIcon    {...props} aria-label="Champion tier" />;
    case 'tier.ranger':   return <CrosshairIcon {...props} aria-label="Ranger tier" />;
    case 'tier.trooper':  return <ShieldIcon   {...props} aria-label="Trooper tier" />;
    default:              return null;
  }
}

/** Animated live-status dot */
export function StatusDot({
  color = 'currentColor', pulse = false, size = 8,
}: {
  color?: string;
  pulse?: boolean;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={pulse ? 'animate-live-blip' : ''}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }}
    />
  );
}
