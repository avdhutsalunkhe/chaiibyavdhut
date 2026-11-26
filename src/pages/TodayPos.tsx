import React, { useMemo, useState } from 'react';
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  Plus,
  Share2,
  Smartphone,
  Trash2,
} from 'lucide-react';
import type { AppMeta, DaySummary, MenuItem, PaymentMode, SaleRecord } from '../types';
import {
  addDays,
  formatDateWeekday,
  formatINR,
  formatTime,
  getTodayDateStr,
} from '../utils/format';

interface TodayPosProps {
  selectedDate: string;
  onChangeDate: (dateStr: string) => void;
  meta: AppMeta;
  summary: DaySummary;
  menuItems: MenuItem[];
  itemCounts: Map<number, number>;
  daySales: SaleRecord[];
  onTapItem: (item: MenuItem, qty: number, mode: PaymentMode) => Promise<void>;
  onDeleteSale: (id: number) => Promise<void>;
  onOpenExpenseModal: () => void;
  onNotify: (msg: string) => void;
}

const MULTIPLIERS = [1, 2, 3, 5];

export const TodayPos: React.FC<TodayPosProps> = ({
  selectedDate,
  onChangeDate,
  meta,
  summary,
  menuItems,
  itemCounts,
  daySales,
  onTapItem,
  onDeleteSale,
  onOpenExpenseModal,
  onNotify,
}) => {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [qtyMultiplier, setQtyMultiplier] = useState<number>(1);
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Tea' | 'Coffee' | 'Snacks'>('All');

  const todayStr = getTodayDateStr();
  const isToday = selectedDate === todayStr;

  const activeItems = useMemo(
    () =>
      menuItems
        .filter((m) => m.is_active === 1)
        .filter((m) => categoryFilter === 'All' || m.category === categoryFilter),
    [menuItems, categoryFilter]
  );

  const goalPct = Math.min(
    100,
    Math.round((summary.cups / Math.max(1, meta.daily_cup_target)) * 100)
  );

  const handleShareSummary = async () => {
    const lines = [
      `*${meta.shop_name} — Daily Summary*`,
      `Date: ${formatDateWeekday(selectedDate)}`,
      `Cups Sold: ${summary.cups} / ${meta.daily_cup_target} (${goalPct}%)`,
      `Total Revenue: ${formatINR(summary.revenue)}`,
      `  - Cash: ${formatINR(summary.cashRevenue)}`,
      `  - UPI: ${formatINR(summary.upiRevenue)}`,
      `Expenses: ${formatINR(summary.expenses)}`,
      `Net Profit: ${formatINR(summary.netProfit)}`,
    ];
    const text = lines.join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: `${meta.shop_name} Summary`, text });
        return;
      } catch {
        // Fallback to clipboard if user cancels or share fails
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      onNotify('Daily summary copied for WhatsApp');
    } catch {
      onNotify('Unable to copy summary');
    }
  };

  return (
    <div className="space-y-5">
      {/* Hero Summary Card */}
      <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Date Switcher */}
          <div className="flex items-center gap-1.5 rounded-xl bg-white/10 p-1 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => onChangeDate(addDays(selectedDate, -1))}
              className="rounded-lg p-1.5 text-indigo-100 transition hover:bg-white/15"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onChangeDate(todayStr)}
              className="px-2.5 py-1 text-xs font-semibold tracking-wide text-white"
            >
              {isToday ? `Today · ${formatDateWeekday(selectedDate)}` : formatDateWeekday(selectedDate)}
            </button>
            <button
              type="button"
              onClick={() => onChangeDate(addDays(selectedDate, 1))}
              disabled={isToday}
              className="rounded-lg p-1.5 text-indigo-100 transition hover:bg-white/15 disabled:opacity-40"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Primary CTAs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenExpenseModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Expense</span>
            </button>
            <button
              type="button"
              onClick={handleShareSummary}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share Daily Summary</span>
            </button>
          </div>
        </div>

        {/* Hero KPIs */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wider text-indigo-200">
              Revenue
            </div>
            <div className="tabular-nums mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {formatINR(summary.revenue)}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="tabular-nums inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 font-medium text-indigo-100">
                <Banknote className="h-3 w-3" /> Cash {formatINR(summary.cashRevenue)}
              </span>
              <span className="tabular-nums inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 font-medium text-indigo-100">
                <Smartphone className="h-3 w-3" /> UPI {formatINR(summary.upiRevenue)}
              </span>
            </div>
          </div>

          <div className="min-w-0 rounded-xl bg-white/10 p-3.5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs font-medium text-indigo-200">
              <span>Cups Sold</span>
              <span className="tabular-nums font-semibold text-white">{goalPct}% of goal</span>
            </div>
            <div className="tabular-nums mt-1 text-2xl font-bold">
              {summary.cups}{' '}
              <span className="text-sm font-medium text-indigo-200">
                / {meta.daily_cup_target}
              </span>
            </div>
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${goalPct}%` }}
              />
            </div>
          </div>

          <div className="min-w-0 rounded-xl bg-white/10 p-3.5 backdrop-blur-sm">
            <div className="text-xs font-medium text-indigo-200">Net Profit</div>
            <div
              className={`tabular-nums mt-1 text-2xl font-bold ${
                summary.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {formatINR(summary.netProfit)}
            </div>
            <div className="tabular-nums mt-1.5 text-xs text-indigo-200">
              Expenses: {formatINR(summary.expenses)}
            </div>
          </div>
        </div>
      </section>

      {/* Fast Entry Bar */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {/* Payment Mode Segmented Control */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Pay:
          </span>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
            {(['Cash', 'UPI'] as PaymentMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPaymentMode(mode)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  paymentMode === mode
                    ? 'bg-[#4F46E5] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {mode === 'Cash' ? (
                  <Banknote className="h-3.5 w-3.5" />
                ) : (
                  <Smartphone className="h-3.5 w-3.5" />
                )}
                <span>{mode}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quantity Multipliers */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Qty:
          </span>
          <div className="flex items-center gap-1.5">
            {MULTIPLIERS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setQtyMultiplier(m)}
                className={`tabular-nums rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  qtyMultiplier === m
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                ×{m}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5">
          {(['All', 'Tea', 'Coffee', 'Snacks'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Quick-Tap POS Grid */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {activeItems.map((item) => {
            const soldToday = itemCounts.get(item.id) ?? 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTapItem(item, qtyMultiplier, paymentMode)}
                className="group relative flex min-w-0 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {item.category}
                  </span>
                  {soldToday > 0 && (
                    <span className="tabular-nums rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                      {soldToday} sold
                    </span>
                  )}
                </div>

                <div className="mt-3 min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                    {item.name}
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <span className="tabular-nums text-lg font-extrabold text-slate-900 dark:text-white">
                      {formatINR(item.price)}
                    </span>
                    {qtyMultiplier > 1 && (
                      <span className="tabular-nums text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        ×{qtyMultiplier} = {formatINR(item.price * qtyMultiplier)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Today's Recent Sales Feed */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Recent Sales ({daySales.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tap trash to remove an entry
            </p>
          </div>
          <span className="tabular-nums text-xs font-semibold text-slate-500 dark:text-slate-400">
            {formatDateWeekday(selectedDate)}
          </span>
        </div>

        {daySales.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No sales recorded for this date yet. Tap any menu item above to log a sale.
          </div>
        ) : (
          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-700/70">
            {daySales.slice(0, 20).map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {sale.item_name}
                    </span>
                    <span className="tabular-nums rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      ×{sale.qty}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        sale.payment_mode === 'UPI'
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                      }`}
                    >
                      {sale.payment_mode}
                    </span>
                  </div>
                  <div className="tabular-nums text-xs text-slate-400">
                    {formatTime(sale.created_at)}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-sm font-bold text-slate-900 dark:text-slate-100">
                    {formatINR(sale.total_amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteSale(sale.id)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                    aria-label="Delete sale"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
