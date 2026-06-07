/** Format ISO / unix timestamps for display in local time */

export function formatTimestamp(ts: string | number | undefined | null): string {
  if (ts === undefined || ts === null || ts === '') return '—';

  try {
    let d: Date;
    if (typeof ts === 'number') {
      // Unix seconds (legacy) or milliseconds
      d = ts > 1e12 ? new Date(ts) : new Date(ts * 1000);
    } else if (/^\d+(\.\d+)?$/.test(String(ts))) {
      const n = parseFloat(String(ts));
      d = n > 1e12 ? new Date(n) : new Date(n * 1000);
    } else {
      const s = String(ts).trim();
      d = new Date(s.endsWith('Z') || s.includes('+') ? s : s + 'Z');
    }
    if (isNaN(d.getTime())) return String(ts).slice(0, 19);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return String(ts).slice(0, 19);
  }
}

export function formatTimeShort(ts: string | number): string {
  const full = formatTimestamp(ts);
  const parts = full.split(', ');
  return parts.length > 1 ? parts[1] : full;
}
