import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { AppMeta, DaySummary } from '../types';
import {
  addDays,
  formatDateShort,
  formatINR,
  getMonthDays,
  getTodayDateStr,
} from '../utils/format';

interface CalendarPageProps {
  meta: AppMeta;
  summariesMap: Map<string, DaySummary>;
  onJumpToPosDate: (dateStr: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarPage: React.FC<CalendarPageProps> = ({
  meta,
  summariesMap,
  onJumpToPosDate,
}) => {
  const todayStr = getTodayDateStr();
  const [nowY, nowM] = todayStr.split('-').map(Number);

  const [viewYear, setViewYear] = useState(nowY);
  const [viewMonth0, setViewMonth0] = useState(nowM - 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(todayStr);

  // Build 365-day heatmap (52 weeks + partial)
  const heatmapDays = useMemo(() => {
    const arr: string[] = [];
    for (let i = 364; i >= 0; i--) {
      arr.push(addDays(todayStr, -i));
    }
    return arr;
  }, [todayStr]);

  const maxRev = useMemo(() => {
    let max = 0;
    for (const d of heatmapDays) {
      const s = summariesMap.get(d);
      if (s && s.revenue > max) max = s.revenue;
    }
    return Math.max(max, 500);
  }, [heatmapDays, summariesMap]);

  const getHeatClass = (rev: number) => {
    if (rev <= 0) return 'bg-slate-100 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60';
    const ratio = rev / maxRev;
    if (ratio < 0.25) return 'bg-indigo-200 dark:bg-indigo-900/70 border-indigo-300/50 dark:border-indigo-800';
    if (ratio < 0.5) return 'bg-indigo-400 dark:bg-indigo-700 border-indigo-400/50 dark:border-indigo-600';
    if (ratio < 0.75) return 'bg-emerald-400 dark:bg-emerald-600 border-emerald-500/50 dark:border-emerald-500';
    return 'bg-emerald-600 dark:bg-emerald-500 border-emerald-700/50 dark:border-emerald-400';
  };

  // Monthly calendar grid
  const monthDays = useMemo(() => getMonthDays(viewYear, viewMonth0), [viewYear, viewMonth0]);
  const firstDayOffset = useMemo(() => {
    const d = new Date(viewYear, viewMonth0, 1);
    return d.getDay();
  }, [viewYear, viewMonth0]);

  const monthLabel = new Date(viewYear, viewMonth0, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const prevMonth = () => {
    if (viewMonth0 === 0) {
      setViewYear((y) => y - 1);
      setViewMonth0(11);
    } else {
      setViewMonth0((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth0 === 11) {
      setViewYear((y) => y + 1);
      setViewMonth0(0);
    } else {
      setViewMonth0((m) => m + 1);
    }
  };

  const selectedSummary: DaySummary | null = selectedDay
    ? summariesMap.get(selectedDay) ?? {
        date: selectedDay,
        cups: 0,
        revenue: 0,
        expenses: 0,
        netProfit: 0,
        cashRevenue: 0,
        upiRevenue: 0,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* 365-Day Sales Consistency Heatmap */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              365-Day Sales Consistency Heatmap
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hover any square to inspect daily cups and revenue
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Less</span>
            <span className="h-3 w-3 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
            <span className="h-3 w-3 rounded-sm bg-indigo-200 dark:bg-indigo-900/70" />
            <span className="h-3 w-3 rounded-sm bg-indigo-400 dark:bg-indigo-700" />
            <span className="h-3 w-3 rounded-sm bg-emerald-400 dark:bg-emerald-600" />
            <span className="h-3 w-3 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
            <span>More</span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto pb-2">
          <div
            className="grid grid-flow-col grid-rows-7 gap-1"
            style={{ width: 'max-content' }}
          >
            {heatmapDays.map((d) => {
              const s = summariesMap.get(d);
              const rev = s?.revenue ?? 0;
              const cups = s?.cups ?? 0;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  title={`${formatDateShort(d)} · ${cups} Cups · ${formatINR(rev)}`}
                  className={`h-3.5 w-3.5 rounded-[3px] border transition hover:ring-2 hover:ring-indigo-500 ${getHeatClass(
                    rev
                  )}`}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Monthly Calendar + Day Breakdown */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {monthLabel}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewYear(nowY);
                  setViewMonth0(nowM - 1);
                }}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-slate-400">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 rounded-xl bg-slate-50/50 dark:bg-slate-900/30" />
            ))}
            {monthDays.map((d) => {
              const dayNum = Number(d.slice(-2));
              const s = summariesMap.get(d);
              const cups = s?.cups ?? 0;
              const rev = s?.revenue ?? 0;
              const pct = Math.min(100, Math.round((cups / Math.max(1, meta.daily_cup_target)) * 100));
              const isSelected = selectedDay === d;
              const isToday = d === todayStr;

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={`flex h-20 flex-col justify-between rounded-xl border p-2 text-left transition ${
                    isSelected
                      ? 'border-[#4F46E5] bg-indigo-50/70 ring-1 ring-[#4F46E5] dark:bg-indigo-950/50'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/90 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`tabular-nums text-xs font-bold ${
                        isToday
                          ? 'rounded-md bg-[#4F46E5] px-1.5 py-0.5 text-white'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {cups > 0 && (
                      <span className="tabular-nums text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {cups}c
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="tabular-nums truncate text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {rev > 0 ? formatINR(rev) : '—'}
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-[#4F46E5]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Selected Day Breakdown */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          {selectedSummary ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Day Breakdown
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {formatDateShort(selectedSummary.date)}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Revenue</div>
                  <div className="tabular-nums mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                    {formatINR(selectedSummary.revenue)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Cups Sold</div>
                  <div className="tabular-nums mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                    {selectedSummary.cups}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Expenses</div>
                  <div className="tabular-nums mt-0.5 text-lg font-bold text-rose-600 dark:text-rose-400">
                    {formatINR(selectedSummary.expenses)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Net Profit</div>
                  <div
                    className={`tabular-nums mt-0.5 text-lg font-bold ${
                      selectedSummary.netProfit >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatINR(selectedSummary.netProfit)}
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Cash Sales</span>
                  <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                    {formatINR(selectedSummary.cashRevenue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">UPI Sales</span>
                  <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                    {formatINR(selectedSummary.upiRevenue)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onJumpToPosDate(selectedSummary.date)}
                className="w-full rounded-xl bg-[#4F46E5] py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#4338CA]"
              >
                Open {formatDateShort(selectedSummary.date)} in POS
              </button>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Select a date on the calendar or heatmap to view its breakdown.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
