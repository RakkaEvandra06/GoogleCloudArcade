'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/lib/db';
import { useLang } from '@/lib/LanguageContext';

interface ActivityChartProps {
  badges: Badge[];
  activeMonthPrefix?: string; // optional — defaults to current month (real-time)
  embedded?: boolean;
}

function getCurrentMonthPrefix(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function ActivityChart({ badges, activeMonthPrefix, embedded = false }: ActivityChartProps) {
  const { t, monthFull } = useLang();
  const [activeWeek,     setActiveWeek]     = useState<string | null>(null);
  const [resolvedPrefix, setResolvedPrefix] = useState<string>(
    activeMonthPrefix ?? getCurrentMonthPrefix()
  );

  /* Real-time: auto-update current month every minute */
  useEffect(() => {
    if (activeMonthPrefix) { setResolvedPrefix(activeMonthPrefix); return; }
    setResolvedPrefix(getCurrentMonthPrefix());
    const id = setInterval(() => setResolvedPrefix(getCurrentMonthPrefix()), 60_000);
    return () => clearInterval(id);
  }, [activeMonthPrefix]);

  const [yearStr, monthStr] = resolvedPrefix.split('-');
  const year      = parseInt(yearStr);
  const month     = parseInt(monthStr);
  const totalDays = new Date(year, month, 0).getDate();
  const monthName = monthFull[month - 1] ?? '';

  /* Week ranges */
  const weekRanges = [
    { key: 'W1', labelKey: 'week.1', start: 1,  end: 7  },
    { key: 'W2', labelKey: 'week.2', start: 8,  end: 14 },
    { key: 'W3', labelKey: 'week.3', start: 15, end: 21 },
    { key: 'W4', labelKey: 'week.4', start: 22, end: Math.min(28, totalDays) },
    ...(totalDays > 28 ? [{ key: 'W5', labelKey: 'week.5', start: 29, end: totalDays }] : []),
  ];

  const chartWeeks = weekRanges.map(r => {
    let games = 0, skills = 0;
    for (const b of badges) {
      if (b.earned_date.startsWith(resolvedPrefix)) {
        const day = parseInt(b.earned_date.split('-')[2]);
        if (day >= r.start && day <= r.end) {
          if (b.category === 'game') games++;
          else if (b.category === 'skill_badge' || b.category === 'skill') skills++;
        }
      }
    }
    return { ...r, games, skills, total: games + skills };
  });

  const totalInRange  = chartWeeks.reduce((s, w) => s + w.total, 0);
  const activeWeeks   = chartWeeks.filter(w => w.total > 0).length;
  const maxBadgeCount = Math.max(5, ...chartWeeks.map(w => w.total));
  const chartHeightPx = 210;

  const today       = new Date();
  const isCurrMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
  const currentDay  = today.getDate();

  return (
    <div className={embedded ? 'space-y-4' : 'neobrutal-card space-y-4 animate-fade-slide-up stagger-4'}>
      {/* Header */}
      <div className="border-b-[2px] border-black pb-2.5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono">
          {t('chart.title')} ({monthName} {year})
        </span>
        <span className="text-[10px] font-mono text-text-muted font-bold">
          {totalInRange} {t('heatmap.badge_unit')} · {activeWeeks} {t('chart.active_weeks')}
        </span>
      </div>

      {/* Chart */}
      <div className="relative border-[3px] border-black rounded-lg bg-white p-4 shadow-[3px_3px_0px_#000]">
        <div className="absolute inset-0 flex flex-col justify-between p-4 pb-14 pointer-events-none opacity-10">
          <div className="border-b border-black w-full" />
          <div className="border-b border-black w-full" />
          <div className="border-b border-black w-full" />
        </div>
        <div className="pt-2">
          <div
            className="grid h-[240px] pb-1 relative z-10 px-1 gap-2 items-end justify-items-center"
            style={{ gridTemplateColumns: `repeat(${chartWeeks.length}, 1fr)` }}
          >
            {chartWeeks.map(week => {
              const totalHeight   = (week.total / maxBadgeCount) * chartHeightPx;
              const isTodayInWeek = isCurrMonth && currentDay >= week.start && currentDay <= week.end;
              const weekLabel     = t(week.labelKey);

              return (
                <div
                  key={week.key}
                  className="flex flex-col items-center w-full group relative cursor-pointer select-none"
                  onClick={() => setActiveWeek(activeWeek === week.key ? null : week.key)}
                >
                  {/* Tooltip */}
                  <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white text-black text-[10px] font-mono p-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] transition-opacity duration-150 z-30 min-w-[140px] text-center pointer-events-none ${activeWeek === week.key ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <div className="font-bold border-b border-black/20 pb-1 mb-1">
                      {weekLabel} ({week.start}–{week.end})
                    </div>
                    {week.total > 0 ? (
                      <div>
                        <div className="font-black text-secondary text-xs">{week.total} {t('chart.badge_count')}</div>
                        <div className="text-[10px] text-text-muted mt-1 space-y-0.5">
                          <div>▷ {week.games} {t('chart.game_badges')}</div>
                          <div>🜲 {week.skills} {t('chart.skill_badges')}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-text-muted">{t('chart.no_activity')}</div>
                    )}
                  </div>

                  {/* Bar */}
                  <div className="w-8 sm:w-12 relative flex flex-col justify-end items-center transition-all group-hover:-translate-y-0.5" style={{ height: `${chartHeightPx}px` }}>
                    {week.total > 0
                      ? <div className="w-full rounded-md border-[2.5px] border-black bg-primary overflow-hidden shadow-[2px_2px_0px_#000]" style={{ height: `${totalHeight}px` }} />
                      : <div className="w-full h-1.5 border-[2.5px] border-dashed border-black/20 rounded-md" />
                    }
                  </div>

                  {/* Label */}
                  <div className="mt-2 text-center flex flex-col items-center">
                    <span className={`font-mono text-xs font-bold ${isTodayInWeek ? 'bg-secondary text-white px-1.5 py-0.5 rounded shadow-[1px_1px_0px_#000] border border-black' : 'text-text-muted'}`}>
                      {week.key}
                    </span>
                    <span className="text-[9px] text-text-muted/60 font-mono font-bold mt-0.5">
                      {week.start}–{week.end}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-text-muted px-1">
        <span>* {t('chart.hover_hint')}</span>
        <div className="flex items-center gap-1">
          <span className="w-3.5 h-3.5 bg-primary border-[2px] border-black shadow-[1px_1px_0px_#000] rounded" />
          <span>{t('chart.total_label')}</span>
        </div>
      </div>
    </div>
  );
}
