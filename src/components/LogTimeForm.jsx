import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import CategorySelect from './CategorySelect';
import DurationInput from './DurationInput';
import ErrorBanner from './ErrorBanner';
import { addEntry } from '../store/entriesSlice';
import { formatDuration } from '../utils/duration';
import { todayKey } from '../utils/periods';

const LAST_CATEGORY_KEY = 'worktime:lastCategoryId';

/**
 * The main way time gets into the app: pick a category and a day, then type how
 * long it took. No timers -- entries are always recorded after the fact.
 */
export default function LogTimeForm({ categories }) {
  const dispatch = useDispatch();

  const [categoryId, setCategoryId] = useState('');
  const [entryDate, setEntryDate] = useState(todayKey());
  const [duration, setDuration] = useState({ text: '', minutes: null, error: null });
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);

  // Default to whatever was logged last -- most sessions are the same category.
  useEffect(() => {
    if (categoryId || categories.length === 0) return;
    const remembered = window.localStorage.getItem(LAST_CATEGORY_KEY);
    const exists = categories.some((category) => category.id === remembered);
    setCategoryId(exists ? remembered : categories[0].id);
  }, [categories, categoryId]);

  // Clear the "saved" confirmation after a moment.
  useEffect(() => {
    if (!saved) return undefined;
    const timer = window.setTimeout(() => setSaved(null), 4000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const canSubmit = Boolean(categoryId) && Boolean(duration.minutes) && Boolean(entryDate) && !saving;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setError(null);
    try {
      await dispatch(
        addEntry({ categoryId, entryDate, minutes: duration.minutes, note }),
      ).unwrap();

      window.localStorage.setItem(LAST_CATEGORY_KEY, categoryId);
      setSaved(duration.minutes);
      // Keep category and date: logging several sessions for one day is common.
      setDuration({ text: '', minutes: null, error: null });
      setNote('');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Could not save the entry.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="card-title">Log time</h2>

      <div className="mt-4">
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} />

        <div>
          <label className="label" htmlFor="entry-date">
            Date
          </label>
          <input
            id="entry-date"
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
          <label className="label" htmlFor="entry-note">
            Note <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="entry-note"
            type="text"
            className="input"
            placeholder="What did you work on?"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          {saving ? 'Saving...' : 'Add entry'}
        </button>
        {saved ? (
          <span className="text-sm text-emerald-600">Added {formatDuration(saved)}.</span>
        ) : null}
      </div>
    </form>
  );
}
