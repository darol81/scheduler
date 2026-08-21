export default function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-slate-500">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  )
}
