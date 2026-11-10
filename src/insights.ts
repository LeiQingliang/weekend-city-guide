export const INSIGHTS_KEY = "chumenla-insights-v1";
export const INSIGHTS_CHANGE_EVENT = "chumenla-insights-change";
export const INSIGHT_LABELS = {
  plan_adopted: "采用计划",
  plan_shared: "生成行程分享",
  official_opened: "打开官方入口",
  team_created: "创建小队",
  checkin_saved: "保存打卡",
  guide_saved: "保存攻略",
} as const;
export const FEEDBACK_LABELS = {
  fit: "很适合我",
  budget: "预算不合适",
  time: "时间不合适",
  interest: "兴趣不匹配",
  info: "信息不够明确",
} as const;
export const INSIGHTS_NOTE =
  "仅统计当前浏览器累计的动作与反馈次数，不是独立用户数或转化率；不发送网络请求，不记录原始输入、昵称或地点。";
export type InsightEvent = keyof typeof INSIGHT_LABELS;
export type FeedbackReason = keyof typeof FEEDBACK_LABELS;
export interface InsightsState {
  since: string;
  counts: Partial<Record<InsightEvent, number>>;
  feedback: Partial<Record<FeedbackReason, number>>;
}
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

function sanitizeCounts<Key extends string>(
  value: unknown,
  labels: Record<Key, string>,
): Partial<Record<Key, number>> {
  const result: Partial<Record<Key, number>> = {};
  if (!record(value)) return result;
  for (const key of Object.keys(labels) as Key[]) {
    if (!Object.hasOwn(value, key)) continue;
    const count = value[key];
    if (typeof count === "number" && Number.isSafeInteger(count) && count >= 0)
      result[key] = count;
  }
  return result;
}

/** Pure whitelist sanitizer: unknown fields never reach persistent storage. */
export function sanitizeInsights(
  value: unknown,
  now = new Date().toISOString(),
): InsightsState {
  const input = record(value) ? value : {};
  const since =
    typeof input.since === "string" &&
    input.since.length <= 35 &&
    /^\d{4}-\d{2}-\d{2}T/.test(input.since) &&
    Number.isFinite(Date.parse(input.since))
      ? new Date(input.since).toISOString()
      : now;
  return {
    since,
    counts: sanitizeCounts(input.counts, INSIGHT_LABELS),
    feedback: sanitizeCounts(input.feedback, FEEDBACK_LABELS),
  };
}

function getStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
function parse(raw: string | null): InsightsState {
  try {
    return sanitizeInsights(raw ? JSON.parse(raw) : null);
  } catch {
    return sanitizeInsights(null);
  }
}
function emitChange() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(INSIGHTS_CHANGE_EVENT));
  } catch {
    /* Statistics never interrupt the main task. */
  }
}
export function readInsights(): InsightsState {
  const storage = getStorage();
  if (!storage) return sanitizeInsights(null);
  try {
    return parse(storage.getItem(INSIGHTS_KEY));
  } catch {
    return sanitizeInsights(null);
  }
}

function increment(
  group: "counts" | "feedback",
  event: unknown,
  transient: boolean,
): boolean {
  // Demo interactions must not even read the real user's statistics.
  if (transient) return false;
  const labels = group === "counts" ? INSIGHT_LABELS : FEEDBACK_LABELS;
  if (typeof event !== "string" || !Object.hasOwn(labels, event)) return false;
  const storage = getStorage();
  if (!storage) return false;
  try {
    const state = parse(storage.getItem(INSIGHTS_KEY));
    const counts = state[group] as Record<string, number>;
    counts[event] = Math.min(Number.MAX_SAFE_INTEGER, (counts[event] || 0) + 1);
    storage.setItem(INSIGHTS_KEY, JSON.stringify(state));
    emitChange();
    return true;
  } catch {
    // Quota/security failures leave existing data intact and remain observable to callers.
    return false;
  }
}
export function recordInsight(event: unknown, transient = false): boolean {
  return increment("counts", event, transient);
}
export function recordFeedback(reason: unknown, transient = false): boolean {
  return increment("feedback", reason, transient);
}
export function clearInsights(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.removeItem(INSIGHTS_KEY);
    emitChange();
    return true;
  } catch {
    return false;
  }
}
