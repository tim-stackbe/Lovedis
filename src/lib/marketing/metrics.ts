const DAY = 86_400_000;

export interface PostLike {
  publishedAt: Date;
  postType: string | null;
  impressions: number;
  clicks: number;
  reactions: number;
  comments: number;
  reposts: number;
  follows: number;
}

export interface FollowerDayLike {
  day: Date;
  organic: number;
  sponsored: number;
}

export interface Window {
  from: Date;
  to: Date;
}

/** The last `days` days up to `now`, and the same span right before it. */
export function windows(now: Date, days = 30): { current: Window; previous: Window } {
  const to = now;
  const from = new Date(now.getTime() - days * DAY);
  return { current: { from, to }, previous: { from: new Date(from.getTime() - days * DAY), to: from } };
}

export function inWindow(d: Date, w: Window): boolean {
  return d.getTime() > w.from.getTime() && d.getTime() <= w.to.getTime();
}

export function interactions(p: PostLike): number {
  return p.clicks + p.reactions + p.comments + p.reposts + p.follows;
}

/** LinkedIn's definition: interactions / impressions, weighted over all posts. */
export function engagementRate(posts: PostLike[]): number | null {
  const impressions = posts.reduce((s, p) => s + p.impressions, 0);
  if (impressions === 0) return null;
  return posts.reduce((s, p) => s + interactions(p), 0) / impressions;
}

export function newFollowers(days: FollowerDayLike[], w: Window): number {
  return days.filter((d) => inWindow(d.day, w)).reduce((s, d) => s + d.organic + d.sponsored, 0);
}

/** Relative change; null when there is nothing to compare against. */
export function change(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

export interface FormatRow {
  format: string;
  posts: number;
  impressions: number;
  rate: number | null;
}

export function formatBreakdown(posts: PostLike[]): FormatRow[] {
  const groups = new Map<string, PostLike[]>();
  for (const p of posts) {
    const key = p.postType?.trim() || "Unbekannt";
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups.entries()]
    .map(([format, list]) => ({
      format,
      posts: list.length,
      impressions: list.reduce((s, p) => s + p.impressions, 0),
      rate: engagementRate(list),
    }))
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
}

/** Monday 00:00 UTC of the week containing `d`. */
export function weekStart(d: Date): Date {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const offset = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - offset * DAY);
}

/** ISO 8601 calendar week number. */
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / DAY + 1) / 7);
}

export interface WeekPoint {
  week: string;
  impressions: number;
  interactions: number;
  newFollowers: number;
  posts: number;
}

/** Last `weeks` calendar weeks, oldest first, by publication week of each post. */
export function weeklySeries(posts: PostLike[], followers: FollowerDayLike[], now: Date, weeks = 12): WeekPoint[] {
  const last = weekStart(now);
  const points: WeekPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(last.getTime() - i * 7 * DAY);
    const end = new Date(start.getTime() + 7 * DAY);
    const inWeek = (d: Date) => d.getTime() >= start.getTime() && d.getTime() < end.getTime();
    const wp = posts.filter((p) => inWeek(p.publishedAt));
    points.push({
      week: `KW ${isoWeek(start)}`,
      impressions: wp.reduce((s, p) => s + p.impressions, 0),
      interactions: wp.reduce((s, p) => s + interactions(p), 0),
      newFollowers: followers.filter((f) => inWeek(f.day)).reduce((s, f) => s + f.organic + f.sponsored, 0),
      posts: wp.length,
    });
  }
  return points;
}
