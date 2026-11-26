import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Category, MenuItem } from '../types';
import { formatINR } from '../utils/format';
import { ConfirmModal } from '../components/ConfirmModal';

interface MenuPageProps {
  menuItems: MenuItem[];
  onAdd: (name: string, price: number, category: Category) => Promise<void>;
  onUpdate: (
    id: number,
    fields: Partial<Pick<MenuItem, 'name' | 'price' | 'category' | 'is_active'>>
  ) => Promise<void>;
  onSwapOrder: (a: MenuItem, b: MenuItem) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const CATEGORIES: Category[] = ['Tea', 'Coffee', 'Snacks'];

export const MenuPage: React.FC<MenuPageProps> = ({
  menuItems,
  onAdd,
  onUpdate,
  onSwapOrder,
  onDelete,
}) => {
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCat, setNewCat] = useState<Category>('Tea');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCat, setEditCat] = useState<Category>('Tea');

  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = Number(newPrice);
    if (!newName.trim() || !Number.isFinite(p) || p <= 0) return;
    await onAdd(newName.trim(), p, newCat);
    setNewName('');
    setNewPrice('');
    setNewCat('Tea');
  };

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice(String(item.price));
    setEditCat(item.category);
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    const p = Number(editPrice);
    if (!editName.trim() || !Number.isFinite(p) || p <= 0) return;
    await onUpdate(editingId, {
      name: editName.trim(),
      price: p,
      category: editCat,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Add New Item */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Add Menu Item
        </h2>
        <form onSubmit={handleAdd} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Item name (e.g., Kulhad Chai)"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none sm:col-span-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <div className="flex gap-2">
            <input
              type="number"
              required
              min="1"
              step="any"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Price ₹"
              className="tabular-nums w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
            <select
              value={newCat}
              onChange={(e) => setNewCat(e.target.value as Category)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4338CA]"
          >
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </button>
        </form>
      </section>

      {/* Menu Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Menu &amp; Prices ({menuItems.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Inactive items are hidden from the POS quick-tap grid
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Item Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70">
              {menuItems.map((item, idx) => {
                const isEditing = editingId === item.id;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => onSwapOrder(item, menuItems[idx - 1])}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === menuItems.length - 1}
                          onClick={() => onSwapOrder(item, menuItems[idx + 1])}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-lg border border-indigo-400 bg-white px-2.5 py-1 text-sm dark:bg-slate-900"
                        />
                      ) : (
                        item.name
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editCat}
                          onChange={(e) => setEditCat(e.target.value as Category)}
                          className="rounded-lg border border-indigo-400 bg-white px-2 py-1 text-xs dark:bg-slate-900"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {item.category}
                        </span>
                      )}
                    </td>

                    <td className="tabular-nums px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="tabular-nums w-24 rounded-lg border border-indigo-400 bg-white px-2.5 py-1 text-sm dark:bg-slate-900"
                        />
                      ) : (
                        formatINR(item.price)
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdate(item.id, { is_active: item.is_active === 1 ? 0 : 1 })
                        }
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${
                          item.is_active === 1
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {item.is_active === 1 ? 'Active' : 'Hidden'}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={saveEdit}
                              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                              aria-label="Save"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                              aria-label="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-700 dark:hover:text-indigo-400"
                              aria-label="Edit item"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                              aria-label="Delete item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete Menu Item?"
        description={`Remove "${deleteTarget?.name ?? ''}" from the menu? Past sales records will remain intact in your ledger.`}
        confirmLabel="Delete Item"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await onDelete(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};
