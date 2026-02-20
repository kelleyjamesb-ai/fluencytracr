type FreshnessChipProps = {
  lastEventAt: string | null;
  isStale: boolean;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function FreshnessChip({ lastEventAt, isStale }: FreshnessChipProps) {
  if (!lastEventAt) {
    return (
      <span className="gsd-freshness-badge gsd-freshness-unknown" title="No event data">
        No data
      </span>
    );
  }
  if (isStale) {
    return (
      <span className="gsd-freshness-badge gsd-freshness-stale" title={lastEventAt}>
        Stale · {relativeTime(lastEventAt)}
      </span>
    );
  }
  return (
    <span className="gsd-freshness-badge gsd-freshness-ok" title={lastEventAt}>
      Fresh · {relativeTime(lastEventAt)}
    </span>
  );
}
