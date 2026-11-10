import type { WeekendBrief, WeekendInterest } from "./curation";
import type { IntentRevision } from "./intent";

const labels: Record<string, string> = {
  city: "城市",
  date: "日期",
  startTime: "首站时间",
  budget: "全天人均预算",
  people: "同行人数",
  maxDurationMinutes: "可用分钟",
  weather: "天气情景",
  mealBudget: "餐饮预留",
  transportBudget: "交通预留",
  interests: "兴趣",
  excludedInterests: "排除兴趣",
  indoorOnly: "仅室内",
};
const categories = ["展览", "市集", "户外", "演出"];
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const validDate = (value: unknown) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

/** Provider output is untrusted: reject the whole revision instead of silently dropping invalid fields. */
export function modelRevision(
  base: WeekendBrief,
  response: unknown,
): IntentRevision {
  if (
    !record(response) ||
    !record(response.patch) ||
    !Array.isArray(response.unresolved) ||
    response.unresolved.length > 32 ||
    response.unresolved.some(
      (x) => typeof x !== "string" || !x.trim() || x.length > 300,
    )
  )
    throw new Error("INVALID_MODEL_RESULT");
  const patch = response.patch;
  for (const [key, value] of Object.entries(patch)) {
    if (!Object.hasOwn(labels, key)) throw new Error("INVALID_MODEL_FIELD");
    let valid = false;
    if (key === "city")
      valid = ["上海", "杭州", "北京"].includes(value as string);
    if (key === "weather")
      valid = ["晴天", "多云", "下雨"].includes(value as string);
    if (key === "date") valid = validDate(value);
    if (key === "startTime")
      valid =
        typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
    if (["budget", "mealBudget", "transportBudget"].includes(key))
      valid =
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= (key === "budget" ? 100000 : 10000);
    if (key === "people")
      valid =
        Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 12;
    if (key === "maxDurationMinutes")
      valid =
        Number.isInteger(value) && Number(value) >= 60 && Number(value) <= 720;
    if (key === "indoorOnly") valid = typeof value === "boolean";
    if (key === "interests" || key === "excludedInterests")
      valid =
        Array.isArray(value) &&
        value.length <= 4 &&
        value.every((x) => categories.includes(x));
    if (!valid) throw new Error("INVALID_MODEL_VALUE");
  }
  const brief: WeekendBrief = {
    ...base,
    ...patch,
    interests: [...((patch.interests as WeekendInterest[]) || base.interests)],
    excludedInterests: [
      ...((patch.excludedInterests as WeekendInterest[]) ||
        base.excludedInterests ||
        []),
    ],
  };
  const display = (value: unknown) =>
    Array.isArray(value)
      ? value.join(" / ") || "不限"
      : typeof value === "boolean"
        ? value
          ? "是"
          : "否"
        : String(value ?? "未设置");
  const changes = Object.keys(patch)
    .filter(
      (key) =>
        JSON.stringify(base[key as keyof WeekendBrief]) !==
        JSON.stringify(patch[key]),
    )
    .map((key) => ({
      label: labels[key],
      before: display(base[key as keyof WeekendBrief]),
      after: display(patch[key]),
    }));
  const unresolved = [...new Set(response.unresolved as string[])];
  const blocked = !Object.keys(patch).length;
  return {
    brief,
    changes,
    unresolved:
      blocked && !unresolved.length
        ? ["没有识别出可修改的出行条件，请补充预算、人数或时间。"]
        : unresolved,
    recognized: ["需求由 DeepSeek 理解；方案仍需通过本地约束校验。"],
    blocked,
  };
}

export function intentEndpoint(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" && url.hostname === "127.0.0.1"))
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export async function requestModelRevision(
  endpoint: string,
  base: WeekendBrief,
  message: string,
  signal: AbortSignal,
): Promise<IntentRevision> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base, message }),
    signal,
    credentials: "omit",
    redirect: "error",
  });
  if (!response.ok) throw new Error("MODEL_SERVICE_UNAVAILABLE");
  const raw = await response.text();
  if (raw.length > 16000) throw new Error("MODEL_RESULT_TOO_LARGE");
  return modelRevision(base, JSON.parse(raw));
}
