export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
    >
      <span>{message}</span>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} className="shrink-0 font-medium hover:underline">
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
