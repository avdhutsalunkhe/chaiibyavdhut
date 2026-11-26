import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import type { AppMeta, DbStats, ThemeMode } from '../types';
import { isBackedUpToday } from '../utils/format';
import { ConfirmModal } from '../components/ConfirmModal';

interface SettingsPageProps {
  meta: AppMeta;
  stats: DbStats;
  onUpdateMeta: (key: string, value: string) => Promise<void>;
  onDailyBackup: () => Promise<void>;
  onDownloadJson: () => void;
  onDownloadCsv: () => void;
  onImportBackupFile: (file: File) => Promise<void>;
  onClearToday: () => Promise<void>;
  onFactoryReset: () => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  meta,
  stats,
  onUpdateMeta,
  onDailyBackup,
  onDownloadJson,
  onDownloadCsv,
  onImportBackupFile,
  onClearToday,
  onFactoryReset,
}) => {
  const [shopName, setShopName] = useState(meta.shop_name);
  const [cupTarget, setCupTarget] = useState(String(meta.daily_cup_target));
  const [savingConfig, setSavingConfig] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [confirmAction, setConfirmAction] = useState<'clearToday' | 'factory' | null>(null);

  const backedUp = isBackedUpToday(meta.last_backup_at);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = Math.max(1, Number(cupTarget) || 150);
    setSavingConfig(true);
    try {
      await onUpdateMeta('shop_name', shopName.trim() || 'Chaii');
      await onUpdateMeta('daily_cup_target', String(targetNum));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingImportFile(file);
    }
    e.target.value = '';
  };

  const sizeKb = (stats.sizeBytes / 1024).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Daily Backup Center */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Daily Backup Center
              </h2>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  backedUp
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                }`}
              >
                {backedUp ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Backed up today</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-3.5 w-3.5" />
                    <span>Pending today</span>
                  </>
                )}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Last backup:{' '}
              <span className="tabular-nums font-medium text-slate-700 dark:text-slate-200">
                {meta.last_backup_at
                  ? new Date(meta.last_backup_at).toLocaleString('en-IN')
                  : 'Never backed up yet'}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onDailyBackup}
            className="inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338CA]"
          >
            <Download className="h-4 w-4" />
            <span>One-Tap Daily Backup (.sqlite)</span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={onDownloadJson}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <FileJson className="h-4 w-4 text-indigo-500" />
            <span>Download JSON Backup</span>
          </button>

          <button
            type="button"
            onClick={onDownloadCsv}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            <span>Export Sales CSV</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Upload className="h-4 w-4 text-amber-500" />
            <span>Restore (.sqlite / .json)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".sqlite,.db,.json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </section>

      {/* Stall Configuration */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Stall Configuration
        </h2>
        <form onSubmit={handleSaveConfig} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Stall Name
            </label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Daily Cup Target
            </label>
            <input
              type="number"
              min="1"
              required
              value={cupTarget}
              onChange={(e) => setCupTarget(e.target.value)}
              className="tabular-nums w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Theme Preference
            </label>
            <select
              value={meta.theme}
              onChange={(e) => onUpdateMeta('theme', e.target.value as ThemeMode)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={savingConfig}
              className="rounded-xl bg-[#4F46E5] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4338CA] disabled:opacity-60"
            >
              {savingConfig ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </section>

      {/* Storage & Maintenance */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-indigo-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            On-Device SQLite Storage &amp; Maintenance
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
            <div className="text-xs text-slate-500 dark:text-slate-400">SQLite Size</div>
            <div className="tabular-nums mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
              {sizeKb} KB
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
            <div className="text-xs text-slate-500 dark:text-slate-400">Menu Items</div>
            <div className="tabular-nums mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
              {stats.menuCount}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
            <div className="text-xs text-slate-500 dark:text-slate-400">Sales Rows</div>
            <div className="tabular-nums mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
              {stats.salesCount}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
            <div className="text-xs text-slate-500 dark:text-slate-400">Expense Rows</div>
            <div className="tabular-nums mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
              {stats.expensesCount}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setConfirmAction('clearToday')}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-950"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear Today</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmAction('factory')}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-950"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Factory Reset</span>
          </button>
        </div>
      </section>

      {/* Restore Confirmation Modal */}
      <ConfirmModal
        open={pendingImportFile !== null}
        title="Restore Database Backup?"
        description={`Importing "${pendingImportFile?.name ?? ''}" will replace all current on-device sales, expenses, and menu data in IndexedDB.`}
        confirmLabel="Restore Backup"
        variant="primary"
        onCancel={() => setPendingImportFile(null)}
        onConfirm={async () => {
          if (pendingImportFile) {
            await onImportBackupFile(pendingImportFile);
            setPendingImportFile(null);
          }
        }}
      />

      {/* Maintenance Confirmation Modal */}
      <ConfirmModal
        open={confirmAction !== null}
        title={
          confirmAction === 'clearToday'
            ? "Clear Today's Sales & Expenses?"
            : 'Factory Reset Database?'
        }
        description={
          confirmAction === 'clearToday'
            ? "All sales and expenses recorded for today's date will be permanently deleted."
            : 'This will erase ALL sales, expenses, and custom menu items and restore the initial empty state.'
        }
        confirmLabel={confirmAction === 'clearToday' ? 'Clear Today' : 'Factory Reset'}
        variant="danger"
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action === 'clearToday') await onClearToday();
          else if (action === 'factory') await onFactoryReset();
        }}
      />
    </div>
  );
};
