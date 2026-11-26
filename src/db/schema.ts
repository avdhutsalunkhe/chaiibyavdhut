import type { Database } from 'sql.js';
import type { Category } from '../types';

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  category TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER,
  item_name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_amount REAL NOT NULL,
  payment_mode TEXT NOT NULL,
  sale_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  expense_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS loan_customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS loan_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'Cash',
  note TEXT NOT NULL DEFAULT '',
  tx_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

export const DEFAULT_MENU_ITEMS: Array<{ name: string; price: number; category: Category; sort_order: number }> = [
  { name: 'Cutting Chai', price: 10, category: 'Tea', sort_order: 1 },
  { name: 'Full Chai', price: 20, category: 'Tea', sort_order: 2 },
  { name: 'Special Masala Chai', price: 25, category: 'Tea', sort_order: 3 },
  { name: 'Ginger Chai', price: 15, category: 'Tea', sort_order: 4 },
  { name: 'Black / Lemon Tea', price: 15, category: 'Tea', sort_order: 5 },
  { name: 'Hot Coffee', price: 25, category: 'Coffee', sort_order: 6 },
  { name: 'Bun Maska', price: 20, category: 'Snacks', sort_order: 7 },
  { name: 'Biscuit / Khari', price: 10, category: 'Snacks', sort_order: 8 },
];

export const DEFAULT_META: Record<string, string> = {
  shop_name: 'Chaii',
  daily_cup_target: '150',
  last_backup_at: '',
  theme: 'light',
};

export function ensureSchemaAndSeed(db: Database): boolean {
  db.run(CREATE_TABLES_SQL);

  let mutated = false;

  const menuCountRes = db.exec('SELECT COUNT(*) FROM menu_items');
  const menuCount = Number(menuCountRes[0]?.values[0]?.[0] ?? 0);
  if (menuCount === 0) {
    const stmt = db.prepare(
      'INSERT INTO menu_items (name, price, category, is_active, sort_order) VALUES (?, ?, ?, 1, ?)'
    );
    for (const item of DEFAULT_MENU_ITEMS) {
      stmt.run([item.name, item.price, item.category, item.sort_order]);
    }
    stmt.free();
    mutated = true;
  }

  for (const [key, value] of Object.entries(DEFAULT_META)) {
    const existing = db.exec('SELECT value FROM app_meta WHERE key = ?', [key]);
    if (!existing.length || !existing[0].values.length) {
      db.run('INSERT INTO app_meta (key, value) VALUES (?, ?)', [key, value]);
      mutated = true;
    }
  }

  return mutated;
}
