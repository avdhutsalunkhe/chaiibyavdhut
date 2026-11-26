import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import { loadSqliteFromIndexedDB, saveSqliteToIndexedDB } from './indexedDb';
import { DEFAULT_MENU_ITEMS, DEFAULT_META, ensureSchemaAndSeed } from './schema';
import type {
  AppMeta,
  Category,
  DaySummary,
  DbStats,
  ExpenseRecord,
  LoanCustomer,
  LoanCustomerSummary,
  LoanTransaction,
  LoanTransactionType,
  MenuItem,
  PaymentMode,
  SaleRecord,
  ThemeMode,
} from '../types';
import { getTodayDateStr } from '../utils/format';

let SQL: SqlJsStatic | null = null;
let dbInstance: Database | null = null;

async function getSqlEngine(): Promise<SqlJsStatic> {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: () => '/sql-wasm.wasm',
    });
  }
  return SQL;
}

export async function initDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;
  const engine = await getSqlEngine();
  const savedBytes = await loadSqliteFromIndexedDB();

  if (savedBytes && savedBytes.byteLength > 0) {
    try {
      dbInstance = new engine.Database(savedBytes);
      const mutated = ensureSchemaAndSeed(dbInstance);
      if (mutated) {
        await persistDatabase();
      }
      return dbInstance;
    } catch {
      // Fallback to fresh DB if stored bytes were corrupted
      dbInstance = new engine.Database();
      ensureSchemaAndSeed(dbInstance);
      await persistDatabase();
      return dbInstance;
    }
  }

  dbInstance = new engine.Database();
  ensureSchemaAndSeed(dbInstance);
  await persistDatabase();
  return dbInstance;
}

function getDb(): Database {
  if (!dbInstance) {
    throw new Error('Database not initialized');
  }
  return dbInstance;
}

export async function persistDatabase(): Promise<void> {
  const db = getDb();
  const bytes = db.export();
  await saveSqliteToIndexedDB(bytes);
}

function rowsToObjects<T>(result: ReturnType<Database['exec']>): T[] {
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj as T;
  });
}

// --- App Meta ---

export function getAppMeta(): AppMeta {
  const db = getDb();
  const rows = rowsToObjects<{ key: string; value: string }>(
    db.exec('SELECT key, value FROM app_meta')
  );
  const map: Record<string, string> = { ...DEFAULT_META };
  for (const r of rows) {
    map[r.key] = r.value;
  }
  const target = Number(map.daily_cup_target);
  return {
    shop_name: map.shop_name || 'Chaii',
    daily_cup_target: Number.isFinite(target) && target > 0 ? target : 150,
    last_backup_at: map.last_backup_at || '',
    theme: map.theme === 'dark' ? 'dark' : 'light',
  };
}

export async function setMetaValue(key: string, value: string): Promise<void> {
  const db = getDb();
  db.run(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
  await persistDatabase();
}

export async function setThemeMeta(theme: ThemeMode): Promise<void> {
  await setMetaValue('theme', theme);
}

// --- Menu Items ---

export function getMenuItems(activeOnly = false): MenuItem[] {
  const db = getDb();
  const sql = activeOnly
    ? 'SELECT id, name, price, category, is_active, sort_order FROM menu_items WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
    : 'SELECT id, name, price, category, is_active, sort_order FROM menu_items ORDER BY sort_order ASC, id ASC';
  return rowsToObjects<MenuItem>(db.exec(sql));
}

export async function addMenuItem(
  name: string,
  price: number,
  category: Category
): Promise<void> {
  const db = getDb();
  const maxRes = db.exec('SELECT COALESCE(MAX(sort_order), 0) FROM menu_items');
  const nextOrder = Number(maxRes[0]?.values[0]?.[0] ?? 0) + 1;
  db.run(
    'INSERT INTO menu_items (name, price, category, is_active, sort_order) VALUES (?, ?, ?, 1, ?)',
    [name.trim(), price, category, nextOrder]
  );
  await persistDatabase();
}

export async function updateMenuItem(
  id: number,
  fields: Partial<Pick<MenuItem, 'name' | 'price' | 'category' | 'is_active' | 'sort_order'>>
): Promise<void> {
  const db = getDb();
  const sets: string[] = [];
  const params: (string | number)[] = [];
  if (fields.name !== undefined) {
    sets.push('name = ?');
    params.push(fields.name.trim());
  }
  if (fields.price !== undefined) {
    sets.push('price = ?');
    params.push(fields.price);
  }
  if (fields.category !== undefined) {
    sets.push('category = ?');
    params.push(fields.category);
  }
  if (fields.is_active !== undefined) {
    sets.push('is_active = ?');
    params.push(fields.is_active);
  }
  if (fields.sort_order !== undefined) {
    sets.push('sort_order = ?');
    params.push(fields.sort_order);
  }
  if (!sets.length) return;
  params.push(id);
  db.run(`UPDATE menu_items SET ${sets.join(', ')} WHERE id = ?`, params);
  await persistDatabase();
}

export async function swapMenuOrder(idA: number, orderA: number, idB: number, orderB: number): Promise<void> {
  const db = getDb();
  db.run('UPDATE menu_items SET sort_order = ? WHERE id = ?', [orderB, idA]);
  db.run('UPDATE menu_items SET sort_order = ? WHERE id = ?', [orderA, idB]);
  await persistDatabase();
}

export async function deleteMenuItem(id: number): Promise<void> {
  const db = getDb();
  db.run('DELETE FROM menu_items WHERE id = ?', [id]);
  await persistDatabase();
}

// --- Sales ---

export async function recordSale(params: {
  item_id: number | null;
  item_name: string;
  qty: number;
  unit_price: number;
  payment_mode: PaymentMode;
  sale_date: string;
}): Promise<number> {
  const db = getDb();
  const total = Math.round(params.qty * params.unit_price * 100) / 100;
  const nowIso = new Date().toISOString();
  db.run(
    `INSERT INTO sales (item_id, item_name, qty, unit_price, total_amount, payment_mode, sale_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.item_id,
      params.item_name,
      params.qty,
      params.unit_price,
      total,
      params.payment_mode,
      params.sale_date,
      nowIso,
    ]
  );
  const idRes = db.exec('SELECT last_insert_rowid()');
  const insertedId = Number(idRes[0]?.values[0]?.[0] ?? 0);
  await persistDatabase();
  return insertedId;
}

export async function deleteSale(id: number): Promise<void> {
  const db = getDb();
  db.run('DELETE FROM sales WHERE id = ?', [id]);
  await persistDatabase();
}

export function getSales(options?: {
  startDate?: string;
  endDate?: string;
  paymentMode?: PaymentMode | 'All';
}): SaleRecord[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: string[] = [];

  if (options?.startDate) {
    clauses.push('sale_date >= ?');
    params.push(options.startDate);
  }
  if (options?.endDate) {
    clauses.push('sale_date <= ?');
    params.push(options.endDate);
  }
  if (options?.paymentMode && options.paymentMode !== 'All') {
    clauses.push('payment_mode = ?');
    params.push(options.paymentMode);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return rowsToObjects<SaleRecord>(
    db.exec(
      `SELECT id, item_id, item_name, qty, unit_price, total_amount, payment_mode, sale_date, created_at
       FROM sales ${where} ORDER BY sale_date DESC, id DESC`,
      params
    )
  );
}

// --- Expenses ---

export async function recordExpense(params: {
  title: string;
  amount: number;
  expense_date: string;
}): Promise<number> {
  const db = getDb();
  const nowIso = new Date().toISOString();
  db.run(
    'INSERT INTO expenses (title, amount, expense_date, created_at) VALUES (?, ?, ?, ?)',
    [params.title.trim(), params.amount, params.expense_date, nowIso]
  );
  const idRes = db.exec('SELECT last_insert_rowid()');
  const insertedId = Number(idRes[0]?.values[0]?.[0] ?? 0);
  await persistDatabase();
  return insertedId;
}

export async function deleteExpense(id: number): Promise<void> {
  const db = getDb();
  db.run('DELETE FROM expenses WHERE id = ?', [id]);
  await persistDatabase();
}

export function getExpenses(options?: {
  startDate?: string;
  endDate?: string;
}): ExpenseRecord[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: string[] = [];
  if (options?.startDate) {
    clauses.push('expense_date >= ?');
    params.push(options.startDate);
  }
  if (options?.endDate) {
    clauses.push('expense_date <= ?');
    params.push(options.endDate);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return rowsToObjects<ExpenseRecord>(
    db.exec(
      `SELECT id, title, amount, expense_date, created_at FROM expenses ${where} ORDER BY expense_date DESC, id DESC`,
      params
    )
  );
}

// --- Aggregations ---

export function getDaySummary(dateStr: string): DaySummary {
  const db = getDb();
  const salesRes = db.exec(
    `SELECT
       COALESCE(SUM(qty), 0) AS cups,
       COALESCE(SUM(total_amount), 0) AS revenue,
       COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN total_amount ELSE 0 END), 0) AS cashRevenue,
       COALESCE(SUM(CASE WHEN payment_mode = 'UPI' THEN total_amount ELSE 0 END), 0) AS upiRevenue
     FROM sales WHERE sale_date = ?`,
    [dateStr]
  );
  const expRes = db.exec(
    'SELECT COALESCE(SUM(amount), 0) AS expenses FROM expenses WHERE expense_date = ?',
    [dateStr]
  );
  const sRow = salesRes[0]?.values[0] ?? [0, 0, 0, 0];
  const cups = Number(sRow[0] ?? 0);
  const revenue = Number(sRow[1] ?? 0);
  const cashRevenue = Number(sRow[2] ?? 0);
  const upiRevenue = Number(sRow[3] ?? 0);
  const expenses = Number(expRes[0]?.values[0]?.[0] ?? 0);

  return {
    date: dateStr,
    cups,
    revenue,
    expenses,
    netProfit: revenue - expenses,
    cashRevenue,
    upiRevenue,
  };
}

export function getDailySummariesMap(startDate?: string, endDate?: string): Map<string, DaySummary> {
  const db = getDb();
  const sClauses: string[] = [];
  const sParams: string[] = [];
  if (startDate) {
    sClauses.push('sale_date >= ?');
    sParams.push(startDate);
  }
  if (endDate) {
    sClauses.push('sale_date <= ?');
    sParams.push(endDate);
  }
  const sWhere = sClauses.length ? `WHERE ${sClauses.join(' AND ')}` : '';

  const salesRows = rowsToObjects<{
    date: string;
    cups: number;
    revenue: number;
    cashRevenue: number;
    upiRevenue: number;
  }>(
    db.exec(
      `SELECT
         sale_date AS date,
         COALESCE(SUM(qty), 0) AS cups,
         COALESCE(SUM(total_amount), 0) AS revenue,
         COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN total_amount ELSE 0 END), 0) AS cashRevenue,
         COALESCE(SUM(CASE WHEN payment_mode = 'UPI' THEN total_amount ELSE 0 END), 0) AS upiRevenue
       FROM sales ${sWhere} GROUP BY sale_date`,
      sParams
    )
  );

  const eClauses: string[] = [];
  const eParams: string[] = [];
  if (startDate) {
    eClauses.push('expense_date >= ?');
    eParams.push(startDate);
  }
  if (endDate) {
    eClauses.push('expense_date <= ?');
    eParams.push(endDate);
  }
  const eWhere = eClauses.length ? `WHERE ${eClauses.join(' AND ')}` : '';
  const expRows = rowsToObjects<{ date: string; expenses: number }>(
    db.exec(
      `SELECT expense_date AS date, COALESCE(SUM(amount), 0) AS expenses FROM expenses ${eWhere} GROUP BY expense_date`,
      eParams
    )
  );

  const map = new Map<string, DaySummary>();
  for (const s of salesRows) {
    map.set(s.date, {
      date: s.date,
      cups: Number(s.cups),
      revenue: Number(s.revenue),
      expenses: 0,
      netProfit: Number(s.revenue),
      cashRevenue: Number(s.cashRevenue),
      upiRevenue: Number(s.upiRevenue),
    });
  }
  for (const e of expRows) {
    const existing = map.get(e.date);
    if (existing) {
      existing.expenses = Number(e.expenses);
      existing.netProfit = existing.revenue - existing.expenses;
    } else {
      map.set(e.date, {
        date: e.date,
        cups: 0,
        revenue: 0,
        expenses: Number(e.expenses),
        netProfit: -Number(e.expenses),
        cashRevenue: 0,
        upiRevenue: 0,
      });
    }
  }
  return map;
}

export function getItemSoldCountsForDate(dateStr: string): Map<number, number> {
  const db = getDb();
  const rows = rowsToObjects<{ item_id: number; cups: number }>(
    db.exec(
      'SELECT item_id, COALESCE(SUM(qty), 0) AS cups FROM sales WHERE sale_date = ? AND item_id IS NOT NULL GROUP BY item_id',
      [dateStr]
    )
  );
  const map = new Map<number, number>();
  for (const r of rows) {
    map.set(Number(r.item_id), Number(r.cups));
  }
  return map;
}

// --- Backups, Exports & Maintenance ---

export function exportSqliteBytes(): Uint8Array {
  return getDb().export();
}

export function exportJsonBackup(): string {
  const db = getDb();
  const payload = {
    app: 'Chaii',
    version: 2,
    exported_at: new Date().toISOString(),
    menu_items: getMenuItems(false),
    sales: getSales(),
    expenses: getExpenses(),
    loan_customers: getLoanCustomers(),
    loan_transactions: getLoanTransactions(),
    app_meta: rowsToObjects<{ key: string; value: string }>(
      db.exec('SELECT key, value FROM app_meta')
    ),
  };
  return JSON.stringify(payload, null, 2);
}

export function exportSalesCsv(): string {
  const sales = getSales();
  const header = ['ID', 'Date', 'Time', 'Item', 'Qty', 'Unit Price (INR)', 'Total (INR)', 'Payment Mode'];
  const escape = (v: string | number) => {
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [header.join(',')];
  for (const s of sales) {
    lines.push(
      [
        s.id,
        s.sale_date,
        s.created_at,
        s.item_name,
        s.qty,
        s.unit_price,
        s.total_amount,
        s.payment_mode,
      ]
        .map(escape)
        .join(',')
    );
  }
  return lines.join('\n');
}

export async function importSqliteBytes(bytes: Uint8Array): Promise<void> {
  const engine = await getSqlEngine();
  const candidate = new engine.Database(bytes);
  // Validate required tables exist
  const tablesRes = candidate.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('menu_items', 'sales', 'expenses', 'app_meta')"
  );
  const found = new Set((tablesRes[0]?.values ?? []).map((r) => String(r[0])));
  if (!found.has('menu_items') || !found.has('sales') || !found.has('expenses')) {
    candidate.close();
    throw new Error('Invalid SQLite backup: missing required Chaii POS tables.');
  }
  ensureSchemaAndSeed(candidate);
  if (dbInstance) {
    dbInstance.close();
  }
  dbInstance = candidate;
  await persistDatabase();
}

export async function importJsonBackup(jsonText: string): Promise<void> {
  const parsed = JSON.parse(jsonText);
  if (
    !parsed ||
    !Array.isArray(parsed.menu_items) ||
    !Array.isArray(parsed.sales) ||
    !Array.isArray(parsed.expenses)
  ) {
    throw new Error('Invalid JSON backup structure.');
  }

  const engine = await getSqlEngine();
  const nextDb = new engine.Database();
  ensureSchemaAndSeed(nextDb);

  // Clear seeded defaults before restoring
  nextDb.run('DELETE FROM menu_items');
  nextDb.run('DELETE FROM sales');
  nextDb.run('DELETE FROM expenses');
  nextDb.run('DELETE FROM app_meta');

  const menuStmt = nextDb.prepare(
    'INSERT INTO menu_items (id, name, price, category, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const m of parsed.menu_items) {
    menuStmt.run([
      Number(m.id),
      String(m.name),
      Number(m.price),
      String(m.category || 'Tea'),
      Number(m.is_active ?? 1),
      Number(m.sort_order ?? 0),
    ]);
  }
  menuStmt.free();

  const salesStmt = nextDb.prepare(
    'INSERT INTO sales (id, item_id, item_name, qty, unit_price, total_amount, payment_mode, sale_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const s of parsed.sales) {
    salesStmt.run([
      Number(s.id),
      s.item_id != null ? Number(s.item_id) : null,
      String(s.item_name),
      Number(s.qty),
      Number(s.unit_price),
      Number(s.total_amount),
      String(s.payment_mode || 'Cash'),
      String(s.sale_date),
      String(s.created_at || new Date().toISOString()),
    ]);
  }
  salesStmt.free();

  const expStmt = nextDb.prepare(
    'INSERT INTO expenses (id, title, amount, expense_date, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  for (const e of parsed.expenses) {
    expStmt.run([
      Number(e.id),
      String(e.title),
      Number(e.amount),
      String(e.expense_date),
      String(e.created_at || new Date().toISOString()),
    ]);
  }
  expStmt.free();

  if (Array.isArray(parsed.loan_customers)) {
    const custStmt = nextDb.prepare(
      'INSERT INTO loan_customers (id, name, phone, created_at) VALUES (?, ?, ?, ?)'
    );
    for (const c of parsed.loan_customers) {
      custStmt.run([
        Number(c.id),
        String(c.name),
        String(c.phone || ''),
        String(c.created_at || new Date().toISOString()),
      ]);
    }
    custStmt.free();
  }

  if (Array.isArray(parsed.loan_transactions)) {
    const txStmt = nextDb.prepare(
      'INSERT INTO loan_transactions (id, customer_id, type, amount, payment_mode, note, tx_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const t of parsed.loan_transactions) {
      txStmt.run([
        Number(t.id),
        Number(t.customer_id),
        String(t.type || 'credit'),
        Number(t.amount),
        String(t.payment_mode || 'Cash'),
        String(t.note || ''),
        String(t.tx_date),
        String(t.created_at || new Date().toISOString()),
      ]);
    }
    txStmt.free();
  }

  if (Array.isArray(parsed.app_meta)) {
    const metaStmt = nextDb.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?)');
    for (const row of parsed.app_meta) {
      if (row.key) {
        metaStmt.run([String(row.key), String(row.value ?? '')]);
      }
    }
    metaStmt.free();
  }
  ensureSchemaAndSeed(nextDb);

  if (dbInstance) {
    dbInstance.close();
  }
  dbInstance = nextDb;
  await persistDatabase();
}

export async function clearTodayData(): Promise<void> {
  const db = getDb();
  const today = getTodayDateStr();
  db.run('DELETE FROM sales WHERE sale_date = ?', [today]);
  db.run('DELETE FROM expenses WHERE expense_date = ?', [today]);
  await persistDatabase();
}

export async function factoryReset(): Promise<void> {
  const engine = await getSqlEngine();
  const freshDb = new engine.Database();
  ensureSchemaAndSeed(freshDb);
  // Reset menu to default
  freshDb.run('DELETE FROM menu_items');
  const stmt = freshDb.prepare(
    'INSERT INTO menu_items (name, price, category, is_active, sort_order) VALUES (?, ?, ?, 1, ?)'
  );
  for (const item of DEFAULT_MENU_ITEMS) {
    stmt.run([item.name, item.price, item.category, item.sort_order]);
  }
  stmt.free();

  if (dbInstance) {
    dbInstance.close();
  }
  dbInstance = freshDb;
  await persistDatabase();
}

export function getDbStats(): DbStats {
  const db = getDb();
  const bytes = db.export();
  const countOf = (table: string) => {
    const res = db.exec(`SELECT COUNT(*) FROM ${table}`);
    return Number(res[0]?.values[0]?.[0] ?? 0);
  };
  return {
    sizeBytes: bytes.byteLength,
    menuCount: countOf('menu_items'),
    salesCount: countOf('sales'),
    expensesCount: countOf('expenses'),
    metaCount: countOf('app_meta'),
  };
}

// --- Loan / Khata Accounts ---

export function getLoanCustomers(): LoanCustomer[] {
  const db = getDb();
  return rowsToObjects<LoanCustomer>(
    db.exec('SELECT id, name, phone, created_at FROM loan_customers ORDER BY name COLLATE NOCASE ASC')
  );
}

export function getLoanTransactions(customerId?: number): LoanTransaction[] {
  const db = getDb();
  if (customerId !== undefined) {
    return rowsToObjects<LoanTransaction>(
      db.exec(
        'SELECT id, customer_id, type, amount, payment_mode, note, tx_date, created_at FROM loan_transactions WHERE customer_id = ? ORDER BY tx_date DESC, id DESC',
        [customerId]
      )
    );
  }
  return rowsToObjects<LoanTransaction>(
    db.exec(
      'SELECT id, customer_id, type, amount, payment_mode, note, tx_date, created_at FROM loan_transactions ORDER BY tx_date DESC, id DESC'
    )
  );
}

export function getLoanCustomerSummaries(): LoanCustomerSummary[] {
  const db = getDb();
  const rows = rowsToObjects<{
    id: number;
    name: string;
    phone: string;
    created_at: string;
    total_credit: number;
    total_paid: number;
    last_tx_date: string | null;
    tx_count: number;
  }>(
    db.exec(`
      SELECT
        c.id,
        c.name,
        c.phone,
        c.created_at,
        COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END), 0) AS total_credit,
        COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount ELSE 0 END), 0) AS total_paid,
        MAX(t.tx_date) AS last_tx_date,
        COUNT(t.id) AS tx_count
      FROM loan_customers c
      LEFT JOIN loan_transactions t ON t.customer_id = c.id
      GROUP BY c.id
      ORDER BY (COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount ELSE 0 END), 0)) DESC,
               c.name COLLATE NOCASE ASC
    `)
  );

  return rows.map((r) => {
    const totalCredit = Number(r.total_credit ?? 0);
    const totalPaid = Number(r.total_paid ?? 0);
    return {
      id: Number(r.id),
      name: String(r.name),
      phone: String(r.phone ?? ''),
      created_at: String(r.created_at),
      total_credit: totalCredit,
      total_paid: totalPaid,
      balance: Math.max(0, Math.round((totalCredit - totalPaid) * 100) / 100),
      last_tx_date: r.last_tx_date ? String(r.last_tx_date) : '',
      tx_count: Number(r.tx_count ?? 0),
    };
  });
}

export async function createLoanCustomer(name: string, phone = ''): Promise<number> {
  const db = getDb();
  const nowIso = new Date().toISOString();
  db.run('INSERT INTO loan_customers (name, phone, created_at) VALUES (?, ?, ?)', [
    name.trim(),
    phone.trim(),
    nowIso,
  ]);
  const idRes = db.exec('SELECT last_insert_rowid()');
  const id = Number(idRes[0]?.values[0]?.[0] ?? 0);
  await persistDatabase();
  return id;
}

export async function deleteLoanCustomer(customerId: number): Promise<void> {
  const db = getDb();
  db.run('DELETE FROM loan_transactions WHERE customer_id = ?', [customerId]);
  db.run('DELETE FROM loan_customers WHERE id = ?', [customerId]);
  await persistDatabase();
}

export async function recordLoanTransaction(params: {
  customer_id: number;
  type: LoanTransactionType;
  amount: number;
  payment_mode?: PaymentMode;
  note?: string;
  tx_date?: string;
}): Promise<number> {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const txDate = params.tx_date || getTodayDateStr();
  db.run(
    'INSERT INTO loan_transactions (customer_id, type, amount, payment_mode, note, tx_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      params.customer_id,
      params.type,
      Math.round(params.amount * 100) / 100,
      params.payment_mode || 'Cash',
      (params.note || '').trim(),
      txDate,
      nowIso,
    ]
  );
  const idRes = db.exec('SELECT last_insert_rowid()');
  const id = Number(idRes[0]?.values[0]?.[0] ?? 0);
  await persistDatabase();
  return id;
}

export async function deleteLoanTransaction(txId: number): Promise<void> {
  const db = getDb();
  db.run('DELETE FROM loan_transactions WHERE id = ?', [txId]);
  await persistDatabase();
}
