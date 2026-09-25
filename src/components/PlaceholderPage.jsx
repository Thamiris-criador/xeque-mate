export default function PlaceholderPage({ title, subtitle }) {
  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
        {title?.toUpperCase()}
      </h1>
      <p style={{ color: 'var(--text-muted)' }}>
        {subtitle || 'Esta área ainda está em construção.'}
      </p>
    </div>
  )
}
