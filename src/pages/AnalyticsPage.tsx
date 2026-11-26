import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Banknote, Coffee, IndianRupee, Percent, Smartphone, TrendingUp } from 'lucide-react';
import type { DaySummary, ExpenseRecord, SaleRecord } from '../types';
import { addDays, formatINR, getTodayDateStr } from '../utils/format';

interface AnalyticsPageProps {
  sales: SaleRecord[];
  expenses: ExpenseRecord[];
  summariesMap: Map<string, DaySummary>;
}

const COLORS = ['#4F46E5', '#059669', '#D97706', '#E11D48', '#0EA5E9', '#8B5CF6', '#10B981', '#F59E0B'];

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  sales,
  expenses,
  summariesMap,
}) => {
  const todayStr = getTodayDateStr();

  const kpis = useMemo(() => {
    const totalRevenue = sales.reduce((a, s) => a + s.total_amount, 0);
    const totalCups = sales.reduce((a, s) => a + s.qty, 0);
    const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
    const activeDays = new Set(sales.map((s) => s.sale_date)).size;
    const avgDailyRev = activeDays > 0 ? totalRevenue / activeDays : 0;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    const cashTotal = sales
      .filter((s) => s.payment_mode === 'Cash')
      .reduce((a, s) => a + s.total_amount, 0);
    const upiTotal = sales
      .filter((s) => s.payment_mode === 'UPI')
      .reduce((a, s) => a + s.total_amount, 0);

    return {
      totalRevenue,
      totalCups,
      avgDailyRev,
      profitMargin,
      cashTotal,
      upiTotal,
    };
  }, [sales, expenses]);

  const last14Days = useMemo(() => {
    const data: Array<{ label: string; revenue: number; cups: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = addDays(todayStr, -i);
      const s = summariesMap.get(d);
      const dt = new Date(`${d}T00:00:00`);
      const label = dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      data.push({
        label,
        revenue: s?.revenue ?? 0,
        cups: s?.cups ?? 0,
      });
    }
    return data;
  }, [todayStr, summariesMap]);

  const itemMix = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; cups: number }>();
    for (const s of sales) {
      const cur = map.get(s.item_name) ?? { name: s.item_name, revenue: 0, cups: 0 };
      cur.revenue += s.total_amount;
      cur.cups += s.qty;
      map.set(s.item_name, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  const totalPay = kpis.cashTotal + kpis.upiTotal;
  const cashPct = totalPay > 0 ? Math.round((kpis.cashTotal / totalPay) * 100) : 50;
  const upiPct = totalPay > 0 ? 100 - cashPct : 50;

  return (
    <div className="space-y-6">
      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Revenue
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="tabular-nums mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatINR(kpis.totalRevenue)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Cups Sold
            </span>
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Coffee className="h-4 w-4" />
            </div>
          </div>
          <div className="tabular-nums mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {kpis.totalCups.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Avg Daily Revenue
            </span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="tabular-nums mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatINR(kpis.avgDailyRev)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Overall Profit Margin
            </span>
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="tabular-nums mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {kpis.profitMargin}%
          </div>
        </div>
      </div>

      {/* 14-Day Revenue Chart */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          14-Day Revenue Trend
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Daily gross sales over the last two weeks
        </p>

        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last14Days} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.4} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${v}`}
              />
              <Tooltip
                formatter={(value: number) => [formatINR(value), 'Revenue']}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="revenue" fill="#4F46E5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Revenue by Item + Cash vs UPI */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Revenue by Item
          </h2>
          {itemMix.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No sales data available yet.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={itemMix}
                      dataKey="revenue"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {itemMix.map((entry, idx) => (
                        <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5">
                {itemMix.slice(0, 6).map((item, idx) => {
                  const pct =
                    kpis.totalRevenue > 0
                      ? Math.round((item.revenue / kpis.totalRevenue) * 100)
                      : 0;
                  return (
                    <div key={item.name}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 truncate font-medium text-slate-700 dark:text-slate-200">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="truncate">{item.name}</span>
                        </span>
                        <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                          {formatINR(item.revenue)} ({pct}%)
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: COLORS[idx % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Cash vs UPI Split */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Cash vs UPI Split
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Payment mode distribution across all recorded sales
          </p>

          <div className="mt-6 space-y-5">
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className="bg-emerald-500 transition-all duration-300"
                style={{ width: `${cashPct}%` }}
              />
              <div
                className="bg-[#4F46E5] transition-all duration-300"
                style={{ width: `${upiPct}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Banknote className="h-4 w-4" />
                  <span>Cash ({cashPct}%)</span>
                </div>
                <div className="tabular-nums mt-1.5 text-xl font-bold text-slate-900 dark:text-white">
                  {formatINR(kpis.cashTotal)}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  <Smartphone className="h-4 w-4" />
                  <span>UPI ({upiPct}%)</span>
                </div>
                <div className="tabular-nums mt-1.5 text-xl font-bold text-slate-900 dark:text-white">
                  {formatINR(kpis.upiTotal)}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
