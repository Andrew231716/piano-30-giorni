export function PageLoading({ label = 'Caricamento…' }: { label?: string }) {
  return (
    <div className="panel fade-in" role="status" aria-live="polite">
      <p className="muted">{label}</p>
    </div>
  )
}
