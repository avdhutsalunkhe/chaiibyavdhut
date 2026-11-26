import React, { useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  ListOrdered,
  Moon,
  Search,
  Settings,
  Store,
  Sun,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import type { AppMeta, DaySummary, NavTab } from '../types';
import { formatINR, isBackedUpToday } from '../utils/format';

interface LayoutProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  meta: AppMeta;
  todaySummary: DaySummary;
  onToggleTheme: () => void;
  onOpenCommandPalette: () => void;
  onDailyBackup: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{ id: NavTab; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'today', label: 'Today (POS)', shortLabel: 'POS', icon: Store },
  { id: 'calendar', label: 'Sales Calendar', shortLabel: 'Calendar', icon: CalendarDays },
  { id: 'ledger', label: 'Sales & Expenses', shortLabel: 'Ledger', icon: ListOrdered },
  { id: 'analytics', label: 'Analytics', shortLabel: 'Analytics', icon: BarChart3 },
  { id: 'loans', label: 'Loan Accounts', shortLabel: 'Loans', icon: Wallet },
  { id: 'menu', label: 'Menu & Prices', shortLabel: 'Menu', icon: UtensilsCrossed },
  { id: 'settings', label: 'Backup & Settings', shortLabel: 'Settings', icon: Settings },
];

export const Layout: React.FC<LayoutProps> = ({
  activeTab,
  onSelectTab,
  meta,
  todaySummary,
  onToggleTheme,
  onOpenCommandPalette,
  onDailyBackup,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const backedUp = isBackedUpToday(meta.last_backup_at);
  const goalPct = Math.min(
    100,
    Math.round((todaySummary.cups / Math.max(1, meta.daily_cup_target)) * 100)
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 dark:bg-[#0F172A] dark:text-slate-100">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-[#0F172A]/95">
        <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-6">
          {/* Brand Logo: Red background with "as" text + Chaii */}
          <button
            type="button"
            onClick={() => onSelectTab('today')}
            className="flex min-w-0 items-center gap-3 text-left"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-base font-extrabold tracking-tight text-white shadow-sm">
              as
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-bold leading-tight text-slate-900 dark:text-slate-100">
                {meta.shop_name}
              </div>
              <div className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Offline POS PWA
              </div>
            </div>
          </button>

          {/* Center Search / Command Palette */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="hidden max-w-md flex-1 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 md:flex dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">Search items, dates, actions...</span>
            </span>
            <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
              Ctrl+K
            </kbd>
          </button>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Live Today Quick Pill */}
            <div className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 sm:flex dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <span className="text-slate-500 dark:text-slate-400">Today:</span>
              <span className="tabular-nums">{todaySummary.cups} Cups</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatINR(todaySummary.revenue)}
              </span>
            </div>

            {/* Mobile Search */}
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 md:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Toggle theme"
              title={meta.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {meta.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Quick Daily Backup Button */}
            <button
              type="button"
              onClick={onDailyBackup}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              title={backedUp ? 'Backed up today — click to download again' : 'Backup pending today'}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  backedUp ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Backup</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col justify-between overflow-y-auto border-r border-slate-200 bg-white transition-all duration-200 lg:flex dark:border-slate-800 dark:bg-[#0F172A] ${
            collapsed ? 'w-20' : 'w-64'
          }`}
        >
          <nav className="space-y-1 p-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-[#4F46E5] text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-[#F1F5F9] dark:hover:bg-slate-800'
                  } ${collapsed ? 'justify-center px-2' : ''}`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-white' : 'text-slate-500 dark:text-[#94A3B8]'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Bottom Sidebar Status Widgets */}
          <div className="space-y-3 border-t border-slate-200 p-3 dark:border-slate-800">
            {!collapsed && (
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700/80 dark:bg-slate-800/80">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-[#F1F5F9]">
                    <span>Today&apos;s Goal</span>
                    <span className="tabular-nums text-indigo-600 dark:text-indigo-400">
                      {goalPct}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-[#4F46E5] transition-all duration-300"
                      style={{ width: `${goalPct}%` }}
                    />
                  </div>
                  <div className="tabular-nums mt-1.5 text-[11px] text-slate-600 dark:text-[#94A3B8]">
                    {todaySummary.cups} / {meta.daily_cup_target} cups
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onDailyBackup}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-800/80 dark:hover:bg-slate-800"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-700 dark:text-[#F1F5F9]">
                      Daily Backup
                    </div>
                    <div className="truncate text-[11px] text-slate-600 dark:text-[#94A3B8]">
                      {backedUp ? 'Backed up today' : 'Pending today'}
                    </div>
                  </div>
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      backedUp ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#94A3B8] dark:hover:bg-slate-700"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1 px-4 py-5 pb-24 lg:px-8 lg:py-6 lg:pb-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Fixed Bottom Nav (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-7 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-[#0F172A]/95">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition ${
                active
                  ? 'text-[#4F46E5] dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
