export type DayBucket = { label: string; date: string; count: number };

/** Buckets ISO timestamps into daily counts for the last `days` days (oldest first). */
export function bucketByDay(timestamps: string[], days: number): DayBucket[] {
  const buckets: DayBucket[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.push({
      label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      date: d.toISOString().slice(0, 10),
      count: 0,
    });
  }

  const byDate = new Map(buckets.map((b) => [b.date, b]));
  for (const ts of timestamps) {
    const key = new Date(ts).toISOString().slice(0, 10);
    const bucket = byDate.get(key);
    if (bucket) bucket.count += 1;
  }

  return buckets;
}
