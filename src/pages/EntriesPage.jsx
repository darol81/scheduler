import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import CategoryDot from '../components/CategoryDot';
import CategorySelect from '../components/CategorySelect';
import DurationInput from '../components/DurationInput';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import Spinner from '../components/Spinner';

import {
  clearEntriesError,
  deleteEntry,
  selectEntriesError,
  selectEntriesStatus,
  updateEntry,
} from '../store/entriesSlice';
import { filterByRange, selectEntriesWithCategory, sumMinutes } from '../store/selectors';
import { selectAllCategories } from '../store/categoriesSlice';
import { formatDuration } from '../utils/duration';
import { currentPeriodRange, formatDateKey, lastNDaysRange, todayKey } from '../utils/periods';

const PRESETS = [
  { key: 'week', label: 'This week', build: () => currentPeriodRange('weekly') },
  { key: 'month', label: 'This month', build: () => currentPeriodRange('monthly') },
  { key: 'last30', label: 'Last 30 days', build: () => lastNDaysRange(30) },
  { key: 'all', label: 'All time', build: () => ({ from: '0000-01-01', to: '9999-12-31' }) },
];

function EntryRow({ entry, categories, onSaved }) {
  const dispatch = useDispatch();
  const [editing, setEditing] = useState(false);
  const [categoryId, setCategoryId] = useState(entry.category_id);
  const [entryDate, setEntryDate] = useState(entry.entry_date);
  const [note, setNote] = useState(entry.note || '');
  const [duration, setDuration] = useState({
    text: formatDuration(entry.minutes),
    minutes: entry.minutes,
    error: null,
  });
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setCategoryId(entry.category_id);
    setEntryDate(entry.entry_date);
    setNote(entry.note || '');
    setDuration({ text: formatDuration(entry.minutes), minutes: entry.minutes, error: null });
    setEditing(true);
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!duration.minutes) return;
    setSaving(true);
    const action = await dispatch(
      updateEntry({
        id: entry.id,
        changes: {
          category_id: categoryId,
          entry_date: entryDate,
          minutes: duration.minutes,
          note,
        },
      }),
    );
    setSaving(false);
    if (!action.type.endsWith('/rejected')) {
      setEditing(false);
      if (onSaved) onSaved();
    }
  }

  function handleDelete() {
    const label = `${formatDuration(entry.minutes)} on ${formatDateKey(entry.entry_date)}`;
    if (window.confirm(`Delete this entry (${label})?`)) dispatch(deleteEntry(entry.id));
  }

  if (editing) {
    return (
      <tr className="border-t border-slate-100 bg-slate-50">
        <td colSpan={5} className="px-3 py-4">
          <form onSubmit={handleSave} className="grid gap-3 sm:grid-cols-4">
            <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} />
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={entryDate}
                max={todayKey()}
                onChange={(event) => setEntryDate(event.target.value)}
                required
              />
            </div>
            <DurationInput value={duration.text} onChange={setDuration} />
            <div>
              <label className="label">Note</label>
              <input
                type="text"
                className="input"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
            <div className="flex gap-2 sm:col-span-4">
              <button type="submit" className="btn-primary" disabled={saving || !duration.minutes}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50">
      <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-500">
        {formatDateKey(entry.entry_date)}
      </td>
      <td className="px-3 py-2 text-sm">
        <span className="flex items-center gap-2 text-slate-800">
          <CategoryDot color={entry.category ? entry.category.color : null} />
          {entry.category ? entry.category.name : 'Unknown'}
        </span>
      </td>
      <td className="px-3 py-2 text-sm text-slate-500">{entry.note}</td>
      <td className="whitespace-nowrap px-3 py-2 text-right text-sm tabular-nums text-slate-800">
        {formatDuration(entry.minutes)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right">
        <button type="button" className="btn-ghost" onClick={startEditing}>
          Edit
        </button>
        <button type="button" className="btn-ghost text-rose-600" onClick={handleDelete}>
          Delete
        </button>
      </td>
    </tr>
  );
}

export default function EntriesPage() {
  const dispatch = useDispatch();

  const allCategories = useSelector(selectAllCategories);
  const entriesWithCategory = useSelector(selectEntriesWithCategory);
  const status = useSelector(selectEntriesStatus);
  const error = useSelector(selectEntriesError);

  const [preset, setPreset] = useState('month');
  const [range, setRange] = useState(() => currentPeriodRange('monthly'));
  const [categoryId, setCategoryId] = useState('');

  function applyPreset(key) {
    setPreset(key);
    const found = PRESETS.find((item) => item.key === key);
    if (found) setRange(found.build());
  }

  function setRangeField(field, value) {
    setPreset('custom');
    setRange((current) => ({ ...current, [field]: value }));
  }

  const visible = useMemo(() => {
    const inRange = filterByRange(entriesWithCategory, range);
    return categoryId ? inRange.filter((entry) => entry.category_id === categoryId) : inRange;
  }, [entriesWithCategory, range, categoryId]);

  const total = useMemo(() => sumMinutes(visible), [visible]);

  if (status === 'loading' || status === 'idle') {
    return <Spinner label="Loading entries" />;
  }

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} onDismiss={() => dispatch(clearEntriesError())} />

      <section className="card">
        <h2 className="card-title">Filter</h2>

        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => applyPreset(item.key)}
              className={
                preset === item.key
                  ? 'rounded-full bg-indigo-600 px-3 py-1 text-sm font-medium text-white'
                  : 'rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50'
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="range-from">
              From
            </label>
            <input
              id="range-from"
              type="date"
              className="input"
              value={range.from}
              onChange={(event) => setRangeField('from', event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="range-to">
              To
            </label>
            <input
              id="range-to"
              type="date"
              className="input"
              value={range.to}
              onChange={(event) => setRangeField('to', event.target.value)}
            />
          </div>
          <CategorySelect
            categories={allCategories}
            value={categoryId}
            onChange={setCategoryId}
            includeAllOption
          />
        </div>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="card-title">
            {visible.length} {visible.length === 1 ? 'entry' : 'entries'}
          </h2>
          <p className="text-sm text-slate-600">
            Total <span className="font-semibold tabular-nums">{formatDuration(total)}</span>
          </p>
        </div>

        {visible.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Nothing in this range"
              description="Try a wider date range or a different category."
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 pb-2 font-medium">Date</th>
                  <th className="px-3 pb-2 font-medium">Category</th>
                  <th className="px-3 pb-2 font-medium">Note</th>
                  <th className="px-3 pb-2 text-right font-medium">Duration</th>
                  <th className="px-3 pb-2" />
                </tr>
              </thead>
              <tbody>
                {visible.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} categories={allCategories} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
