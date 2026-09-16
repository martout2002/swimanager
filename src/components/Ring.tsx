export function Ring({ pct, color = 'var(--green)' }: { pct: number; color?: string }) {
  return (
    <div className="ring-wrap">
      <div className="ring" style={{ '--pct': pct, '--ring-color': color } as React.CSSProperties} />
      <div className="ring-hole">{pct}%</div>
    </div>
  );
}
