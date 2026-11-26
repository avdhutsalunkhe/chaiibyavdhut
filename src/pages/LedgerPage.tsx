import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { DaySummary, ExpenseRecord, PaymentMode, SaleRecord } from '../types';
import {
  addDays,
  formatDateShort,
  formatINR,
  formatTime,
  getTodayDateStr,
} from '../utils/format';

interface LedgerPageProps {
  sales: SaleRecord[];
  expenses: ExpenseRecord[];
  onDeleteSale: (id: number) => Promise<void>;
  onDeleteExpense: (id: number) => Promise<void>;
  onOpenExpenseModal: () => void;
}

type RangePreset = 'today' | 'yesterday' | '7d' | 'month' | 'all' | 'custom';

export const LedgerPage: React.FC<LedgerPageProps> = ({
  sales,
  expenses,
  onDeleteSale,
  onDeleteExpense,
  onOpenExpenseModal,
}) => {
  const todayStr = getTodayDateStr();
  const [range, setRange] = useState<RangePreset>('7d');
  const [customDate, setCustomDate] = useState(todayStr);
  const [payFilter, setPayFilter] = useState<PaymentMode | 'All'>('All');
  const [activeSubTab, setActiveSubTab] = useState<'sales' | 'expenses' | 'closing'>('sales');

  const { startDate, endDate } = useMemo(() => {
    if (range === 'today') return { startDate: todayStr, endDate: todayStr };
    if (range === 'yesterday') {
      const y = addDays(todayStr, -1);
      return { startDate: y, endDate: y };
    }
    if (range === '7d') {
      return { startDate: addDays(todayStr, -6), endDate: todayStr };
    }
    if (range === 'month') {
      return { startDate: `${todayStr.slice(0, 7)}-01`, endDate: todayStr };
    }
    if (range === 'custom') {
      return { startDate: customDate, endDate: customDate };
    }
    return { startDate: undefined, endDate: undefined };
  }, [range, customDate, todayStr]);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (startDate && s.sale_date < startDate) return false;
      if (endDate && s.sale_date > endDate) return false;
      if (payFilter !== 'All' && s.payment_mode !== payFilter) return false;
      return true;
    });
  }, [sales, startDate, endDate, payFilter]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (startDate && e.expense_date < startDate) return false;
      if (endDate && e.expense_date > endDate) return false;
      return true;
    });
  }, [expenses, startDate, endDate]);

  const closingRows: DaySummary[] = useMemo(() => {
    const map = new Map<string, DaySummary>();
    for (const s of filteredSales) {
      const existing = map.get(s.sale_date) ?? {
        date: s.sale_date,
        cups: 0,
        revenue: 0,
        expenses: 0,
        netProfit: 0,
        cashRevenue: 0,
        upiRevenue: 0,
      };
      existing.cups += s.qty;
      existing.revenue += s.total_amount;
      if (s.payment_mode === 'Cash') existing.cashRevenue += s.total_amount;
      else existing.upiRevenue += s.total_amount;
      existing.netProfit = existing.revenue - existing.expenses;
      map.set(s.sale_date, existing);
    }
    for (const e of filteredExpenses) {
      const existing = map.get(e.expense_date) ?? {
        date: e.expense_date,
        cups: 0,
        revenue: 0,
        expenses: 0,
        netProfit: 0,
        cashRevenue: 0,
        upiRevenue: 0,
      };
      existing.expenses += e.amount;
      existing.netProfit = existing.revenue - existing.expenses;
      map.set(e.expense_date, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredSales, filteredExpenses]);

  const totalRev = filteredSales.reduce((acc, s) => acc + s.total_amount, 0);
  const totalExp = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['today', 'Today'],
              ['yesterday', 'Yesterday'],
              ['7d', 'Last 7 Days'],
              ['month', 'This Month'],
              ['all', 'All Time'],
              ['custom', 'Custom'],
            ] as Array<[RangePreset, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setRange(id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                range === id
                  ? 'bg-[#4F46E5] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
          {range === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="tabular-nums rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
            {(['All', 'Cash', 'UPI'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPayFilter(m)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  payFilter === m
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenExpenseModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Expense</span>
          </button>
        </div>
      </section>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Filtered Revenue ({filteredSales.length} orders)
          </div>
          <div className="tabular-nums mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatINR(totalRev)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Filtered Expenses ({filteredExpenses.length} entries)
          </div>
          <div className="tabular-nums mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatINR(totalExp)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Filtered Net Profit
          </div>
          <div
            className={`tabular-nums mt-1 text-2xl font-bold ${
              totalRev - totalExp >= 0
                ? 'text-slate-900 dark:text-white'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatINR(totalRev - totalExp)}
          </div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {(
          [
            ['sales', `Sales (${filteredSales.length})`],
            ['expenses', `Expenses (${filteredExpenses.length})`],
            ['closing', `Day-by-Day Closing (${closingRows.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSubTab(id)}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              activeSubTab === id
                ? 'border-[#4F46E5] text-[#4F46E5] dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tables */}
      {activeSubTab === 'sales' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date &amp; Time</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                      No sales match this filter.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                      <td className="tabular-nums whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {formatDateShort(s.sale_date)} · {formatTime(s.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {s.item_name}
                      </td>
                      <td className="tabular-nums px-4 py-3 text-slate-600 dark:text-slate-300">
                        ×{s.qty}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            s.payment_mode === 'UPI'
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                          }`}
                        >
                          {s.payment_mode}
                        </span>
                      </td>
                      <td className="tabular-nums px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatINR(s.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteSale(s.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                          aria-label="Delete sale"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'expenses' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Expense Title</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                      No expenses recorded for this period.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                      <td className="tabular-nums whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {formatDateShort(e.expense_date)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {e.title}
                      </td>
                      <td className="tabular-nums px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatINR(e.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(e.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                          aria-label="Delete expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'closing' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Cups</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Expenses</th>
                  <th className="px-4 py-3 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70">
                {closingRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                      No closing records for this filter.
                    </td>
                  </tr>
                ) : (
                  closingRows.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                      <td className="tabular-nums whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {formatDateShort(row.date)}
                      </td>
                      <td className="tabular-nums px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                        {row.cups}
                      </td>
                      <td className="tabular-nums px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatINR(row.revenue)}
                      </td>
                      <td className="tabular-nums px-4 py-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                        {formatINR(row.expenses)}
                      </td>
                      <td
                        className={`tabular-nums px-4 py-3 text-right font-bold ${
                          row.netProfit >= 0
                            ? 'text-slate-900 dark:text-white'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatINR(row.netProfit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
