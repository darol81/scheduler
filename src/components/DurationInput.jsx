import { useEffect, useId, useState } from 'react';
import { MAX_ENTRY_MINUTES, formatDuration, parseDuration } from '../utils/duration';

/**
 * Free-text duration field. Keeps the raw string locally, parses on every
 * keystroke, and reports minutes (or null when the text is not yet valid) up to
 * the parent -- so the parent never has to know the notation.
 */
export default function DurationInput({
  value,
  onChange,
  label = 'Duration',
  placeholder = 'e.g. 1h 20min',
  maxMinutes = MAX_ENTRY_MINUTES,
  autoFocus = false,
  required = true,
  id,
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [text, setText] = useState(value || '');

  // Let the parent reset the field (e.g. after a successful save).
  useEffect(() => {
    setText(value || '');
  }, [value]);

  const trimmed = text.trim();
  const result = trimmed === '' ? null : parseDuration(trimmed, { maxMinutes });
  const minutes = result && result.minutes ? result.minutes : null;
  const error = result && result.error ? result.error : null;

  function handleChange(event) {
    const next = event.target.value;
    setText(next);
    const parsed = next.trim() === '' ? null : parseDuration(next, { maxMinutes });
    onChange({
      text: next,
      minutes: parsed && parsed.minutes ? parsed.minutes : null,
      error: parsed && parsed.error ? parsed.error : null,
    });
  }

  return (
    <div>
      {label ? (
        <label className="label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        type="text"
        inputMode="text"
        className={error ? 'input input-error' : 'input'}
        placeholder={placeholder}
        value={text}
        onChange={handleChange}
        autoFocus={autoFocus}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={`${inputId}-hint`}
      />
      <p id={`${inputId}-hint`} className={error ? 'hint-error' : 'hint'}>
        {error || (minutes ? `= ${formatDuration(minutes)}` : 'Type 1h 20min, 90min, 90 or 1,5h')}
      </p>
    </div>
  );
}
