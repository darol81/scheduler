import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import CategoryDot from '../components/CategoryDot';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import Spinner from '../components/Spinner';

import {
  addCategory,
  clearCategoriesError,
  deleteCategory,
  selectCategoriesError,
  selectCategoriesStatus,
  setCategoryArchived,
  updateCategory,
} from '../store/categoriesSlice';
import {
  groupMinutesByCategory,
  selectActiveCategories,
  selectArchivedCategories,
} from '../store/selectors';
import { selectAllEntries } from '../store/entriesSlice';
import { CATEGORY_COLORS, suggestColor } from '../lib/palette';
import { formatDuration } from '../utils/duration';

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CATEGORY_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={`Use colour ${color}`}
          aria-pressed={value === color}
          className={
            value === color
              ? 'h-7 w-7 rounded-full ring-2 ring-slate-900 ring-offset-2'
              : 'h-7 w-7 rounded-full ring-1 ring-slate-200 transition hover:ring-slate-400'
          }
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function CategoryRow({ category, minutes, onSave, onArchive, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
  const [busy, setBusy] = useState(false);

  function startEditing() {
    setName(category.name);
    setColor(category.color);
    setEditing(true);
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const ok = await onSave({ name, color });
    setBusy(false);
    if (ok) setEditing(false);
  }

  if (editing) {
    return (
      <li className="py-4">
        <form onSubmit={handleSave} className="space-y-3">
          <input
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Category name"
            required
            autoFocus
          />
          <ColorPicker value={color} onChange={setColor} />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>
              {busy ? 'Saving...' : 'Save'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <span className="flex items-center gap-3">
        <CategoryDot color={category.color} size={12} />
        <span className="font-medium text-slate-800">{category.name}</span>
        {category.archived ? (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Archived</span>
        ) : null}
      </span>

      <span className="flex items-center gap-2">
        <span className="mr-2 text-sm tabular-nums text-slate-500">
          {formatDuration(minutes)} logged
        </span>
        <button type="button" className="btn-ghost" onClick={startEditing}>
          Edit
        </button>
        <button type="button" className="btn-ghost" onClick={onArchive}>
          {category.archived ? 'Restore' : 'Archive'}
        </button>
        {minutes === 0 ? (
          <button type="button" className="btn-ghost text-rose-600" onClick={onDelete}>
            Delete
          </button>
        ) : null}
      </span>
    </li>
  );
}

export default function CategoriesPage() {
  const dispatch = useDispatch();

  const active = useSelector(selectActiveCategories);
  const archived = useSelector(selectArchivedCategories);
  const status = useSelector(selectCategoriesStatus);
  const error = useSelector(selectCategoriesError);
  const entries = useSelector(selectAllEntries);

  const minutesByCategory = useMemo(() => groupMinutesByCategory(entries), [entries]);

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(null);
  const [adding, setAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const color = newColor || suggestColor(active.concat(archived));

  async function handleAdd(event) {
    event.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    const action = await dispatch(addCategory({ name: newName, color }));
    setAdding(false);
    if (!action.type.endsWith('/rejected')) {
      setNewName('');
      setNewColor(null);
    }
  }

  async function handleSave(id, changes) {
    const action = await dispatch(updateCategory({ id, changes }));
    return !action.type.endsWith('/rejected');
  }

  function handleArchive(category) {
    dispatch(setCategoryArchived({ id: category.id, archived: !category.archived }));
  }

  function handleDelete(category) {
    const confirmed = window.confirm(`Delete the category "${category.name}"? This cannot be undone.`);
    if (confirmed) dispatch(deleteCategory(category.id));
  }

  if (status === 'loading' || status === 'idle') {
    return <Spinner label="Loading categories" />;
  }

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} onDismiss={() => dispatch(clearCategoriesError())} />

      <form onSubmit={handleAdd} className="card">
        <h2 className="card-title">New category</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="new-category">
              Name
            </label>
            <input
              id="new-category"
              className="input"
              placeholder="Teaching, Studying, Admin..."
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={adding || !newName.trim()}>
            {adding ? 'Adding...' : 'Add category'}
          </button>
        </div>
        <div className="mt-4">
          <span className="label">Colour</span>
          <ColorPicker value={color} onChange={setNewColor} />
        </div>
      </form>

      <section className="card">
        <h2 className="card-title">Categories</h2>
        {active.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No categories yet"
              description="Add one above to start splitting your time up."
            />
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {active.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                minutes={minutesByCategory[category.id] || 0}
                onSave={(changes) => handleSave(category.id, changes)}
                onArchive={() => handleArchive(category)}
                onDelete={() => handleDelete(category)}
              />
            ))}
          </ul>
        )}
      </section>

      {archived.length > 0 ? (
        <section className="card">
          <button
            type="button"
            className="card-title hover:text-slate-700"
            onClick={() => setShowArchived((value) => !value)}
          >
            {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
          </button>
          {showArchived ? (
            <ul className="mt-2 divide-y divide-slate-100">
              {archived.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  minutes={minutesByCategory[category.id] || 0}
                  onSave={(changes) => handleSave(category.id, changes)}
                  onArchive={() => handleArchive(category)}
                  onDelete={() => handleDelete(category)}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              Archived categories stay attached to their old entries but no longer show up when
              logging time.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
