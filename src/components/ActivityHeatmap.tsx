'use client';

import { Badge } from '@/lib/db';
import { useLang } from '@/lib/LanguageContext';

const WEEKS  = 26;        // ~6 bulan terakhir
const DAY_MS = 86400000;

function keyOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function levelClass(count: number) {
  if (count === 0) return 'bg-surface-alt';
  if (count === 1) return 'bg-success/30';
  if (count === 2) return 'bg-success/60';
  if (count === 3) return 'bg-success/80';
  return 'bg-success';
}

export default function ActivityHeatmap({ badges, embedded = false }: { badges: Badge[]; embedded?: boolean }) {
  const { t, monthShort } = useLang();

  // Count badges per calendar day
  const counts = new Map<string, number>();
  for (const b of badges) {
    counts.set(b.earned_date, (counts.get(b.earned_date) ?? 0) + 1);
  }

  // Range: go back WEEKS weeks from today, aligned to Sunday
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - (WEEKS * 7 - 1) * DAY_MS);
  start.setDate(start.getDate() - start.getDay());

  // Build week columns (7 days each)
  const weeks: { date: Date; key: string; count: number; future: boolean }[][] = [];
  for (let w = 0; w * 7 * DAY_MS <= end.getTime() - start.getTime() + 6 * DAY_MS; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * DAY_MS);
      const key  = keyOf(date);
      col.push({ date, key, count: counts.get(key) ?? 0, future: date.getTime() > end.getTime() });
    }
    weeks.push(col);
  }

  const totalInRange = weeks.flat().reduce((s, c) => s + c.count, 0);
  const activeDays   = weeks.flat().filter(c => c.count > 0).length;

  // Month labels above columns (shown when month changes)
  let lastMonth = -1;
  const monthLabels = weeks.map(col => {
    const m = col[0].date.getMonth();
    if (m !== lastMonth) { lastMonth = m; return monthShort[m] ?? ''; }
    return '';
  });

  // Translated day-of-week labels (row 1 Mon, row 3 Wed, row 5 Fri)
  const dayLabels = ['', t('heatmap.day.mon'), '', t('heatmap.day.wed'), '', t('heatmap.day.fri'), ''];

  return (
    <div className={embedded ? 'space-y-4' : 'neobrutal-card space-y-4 animate-fade-slide-up stagger-4'}>

      {/* Header */}
      <div className="border-b-[2px] border-black pb-2.5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono">
          {t('heatmap.title')}
        </span>
        <span className="text-[10px] font-mono text-text-muted font-bold">
          {totalInRange} {t('heatmap.badge_unit')} · {activeDays} {t('heatmap.active_days')}
        </span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1 min-w-full">

          {/* Month label row */}
          <div className="flex gap-[3px] pl-6">
            {monthLabels.map((label, i) => (
              <div key={i} className="w-3 text-[8px] font-mono font-bold text-text-muted">
                {label}
              </div>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {/* Day-of-week labels */}
            <div className="flex flex-col gap-[3px] pr-1">
              {dayLabels.map((d, i) => (
                <div key={i} className="h-3 w-5 text-[7px] font-mono font-bold text-text-muted leading-3">
                  {d}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((col, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {col.map(cell =>
                  cell.future ? (
                    <div key={cell.key} className="w-3 h-3" />
                  ) : (
                    <div
                      key={cell.key}
                      title={`${cell.count} ${t('heatmap.badge_unit')} · ${cell.date.getDate()} ${monthShort[cell.date.getMonth()] ?? ''} ${cell.date.getFullYear()}`}
                      className={`w-3 h-3 rounded-[2px] border border-black/30 ${levelClass(cell.count)}`}
                    />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 text-[8px] font-mono font-bold text-text-muted">
        <span>{t('heatmap.less')}</span>
        {['bg-surface-alt', 'bg-success/30', 'bg-success/60', 'bg-success/80', 'bg-success'].map(c => (
          <div key={c} className={`w-3 h-3 rounded-[2px] border border-black/30 ${c}`} />
        ))}
        <span>{t('heatmap.more')}</span>
      </div>
    </div>
  );
}
