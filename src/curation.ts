import { activities, type Activity, type City, type Weather } from "./data";
import {
  buildItinerary,
  defaultPlanOptions,
  type PlanOptions,
} from "./planner";

export type WeekendInterest = Activity["category"];
export interface WeekendBrief {
  city: City;
  interests: WeekendInterest[];
  indoorOnly?: boolean;
  excludedInterests?: WeekendInterest[];
  pace: "relaxed" | "balanced";
  /** Full outing budget per person, including food and transport. */
  budget: number;
  people: number;
  date: string;
  startTime: string;
  maxDurationMinutes: number;
  weather: Weather;
  mealBudget: number;
  transportBudget: number;
}

export interface WeekendProposal {
  id: string;
  title: string;
  subtitle: string;
  activityIds: string[];
  options: PlanOptions;
  reasons: string[];
  tradeoffs: string[];
  totalPerPerson: number;
  durationMinutes: number;
}

const money = (value: number) => Math.round(value * 100) / 100;
const durationLabel = (minutes: number) =>
  `${Math.floor(minutes / 60)} 小时${minutes % 60 ? ` ${minutes % 60} 分钟` : ""}`;
const validDate = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  Number.isFinite(Date.parse(`${date}T00:00:00Z`)) &&
  new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

export function defaultWeekendBrief(
  city: City,
  options: PlanOptions = defaultPlanOptions,
  people = 2,
  weather: Weather = "多云",
): WeekendBrief {
  return {
    city,
    interests: [],
    indoorOnly: false,
    excludedInterests: [],
    pace: "balanced",
    budget: Number.isFinite(options.budget) ? Math.max(0, options.budget) : 150,
    people: Math.max(1, Math.min(12, Math.round(people) || 2)),
    date: options.date,
    startTime: options.startTime,
    maxDurationMinutes: typeof options.maxDurationMinutes === "number" && Number.isInteger(options.maxDurationMinutes) && options.maxDurationMinutes >= 60 && options.maxDurationMinutes <= 720 ? options.maxDurationMinutes : 300,
    weather,
    mealBudget: 30,
    transportBudget: 15,
  };
}

const optionsFor = (brief: WeekendBrief): PlanOptions => ({
  date: brief.date,
  startTime: brief.startTime,
  budget: brief.budget,
  people: brief.people,
  mealBudget: brief.mealBudget,
  transportBudget: brief.transportBudget,
  weather: brief.weather,
  maxDurationMinutes: brief.maxDurationMinutes,
});

function isValidBrief(brief: WeekendBrief): boolean {
  return (
    ["上海", "杭州", "北京"].includes(brief.city) &&
    validDate(brief.date) &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(brief.startTime) &&
    [brief.budget, brief.mealBudget, brief.transportBudget].every(
      (value) => Number.isFinite(value) && value >= 0,
    ) &&
    Number.isInteger(brief.maxDurationMinutes) &&
    brief.maxDurationMinutes >= 60 && brief.maxDurationMinutes <= 720 &&
    (brief.indoorOnly === undefined || typeof brief.indoorOnly === "boolean") &&
    (brief.excludedInterests === undefined || (Array.isArray(brief.excludedInterests) && brief.excludedInterests.every(category => ["展览", "市集", "演出", "户外"].includes(category)))) &&
    Number.isInteger(brief.people) &&
    brief.people >= 1 &&
    brief.people <= 12 &&
    ["晴天", "多云", "下雨"].includes(brief.weather)
  );
}

interface Candidate {
  items: Activity[];
  total: number;
  duration: number;
  end: string;
  matched: number;
  rank: number;
}
const companionInterests = (people: number): WeekendInterest[] =>
  people === 1 ? ["展览", "户外"] : people >= 3 ? ["市集", "户外", "演出"] : [];

const matchesHardPreferences = (item: Activity, brief: WeekendBrief) =>
  item.city === brief.city &&
  ((brief.weather !== "下雨" && !brief.indoorOnly) || item.indoor) &&
  !(brief.excludedInterests || []).includes(item.category);

/** A product scope boundary for one-day outings, not a claim about a venue's closing time. */
const endsWithinPlanningDay = (end: string | undefined, date: string) =>
  !!end && end.slice(0, 10) === date && end <= `${date}T22:00`;

function candidatesFor(brief: WeekendBrief): Candidate[] {
  if (!isValidBrief(brief)) return [];
  const pool = activities.filter(item => matchesHardPreferences(item, brief));
  const options = optionsFor(brief);
  const routes: Activity[][] = pool.map((item) => [item]);
  if (brief.pace === "balanced")
    for (let first = 0; first < pool.length; first++)
      for (let second = first + 1; second < pool.length; second++) {
        routes.push([pool[first], pool[second]], [pool[second], pool[first]]);
      }
  const unique = new Map<string, Candidate>();
  for (const items of routes) {
    const itinerary = buildItinerary(items, options);
    if (
      itinerary.overBudget ||
      itinerary.overTime ||
      itinerary.openingConflicts.length > 0 ||
      !endsWithinPlanningDay(itinerary.stops.at(-1)?.end, brief.date)
    )
      continue;
    const matched = items.filter((item) =>
      brief.interests.includes(item.category),
    ).length;
    const distinctMatched = new Set(
      items
        .filter((item) => brief.interests.includes(item.category))
        .map((item) => item.category),
    ).size;
    // Companion preference only nudges otherwise similar choices; explicit interests stay higher priority.
    // This is an experience preference, never a claim about ticket inventory or venue capacity.
    const companionFit = items.filter((item) =>
      companionInterests(brief.people).includes(item.category),
    ).length;
    const candidate = {
      items,
      total: itinerary.totalPerPerson,
      duration: itinerary.totalMinutes,
      end: itinerary.stops.at(-1)!.end,
      matched,
      rank:
        distinctMatched * 100 +
        matched * 20 +
        companionFit * 8 +
        (brief.pace === "balanced" ? items.length * 18 : 0) +
        new Set(items.map((item) => item.category)).size * 3,
    };
    const key = items
      .map((item) => item.id)
      .sort()
      .join("+");
    const existing = unique.get(key);
    // Opposite orders are one outing; retain the order that avoids unnecessary waiting.
    if (!existing || candidate.duration < existing.duration)
      unique.set(key, candidate);
  }
  return [...unique.values()].sort(
    (a, b) =>
      b.rank - a.rank ||
      a.total - b.total ||
      a.duration - b.duration ||
      a.items[0].id.localeCompare(b.items[0].id),
  );
}

function toProposal(
  candidate: Candidate,
  brief: WeekendBrief,
  index: number,
  first?: Candidate,
): WeekendProposal {
  const interestMatches = [
    ...new Set(
      candidate.items
        .filter((item) => brief.interests.includes(item.category))
        .map((item) => item.category),
    ),
  ];
  const savings = first ? money(first.total - candidate.total) : 0;
  const allIndoor = candidate.items.every((item) => item.indoor);
  const companionMatches = [
    ...new Set(
      candidate.items
        .filter((item) =>
          companionInterests(brief.people).includes(item.category),
        )
        .map((item) => item.category),
    ),
  ];
  const companionReason =
    brief.people === 1
      ? companionMatches.length
        ? `一个人出发，安排${companionMatches.join("、")}，按自己的节奏停留`
        : "一个人出发，先照顾你想体验的兴趣"
      : brief.people >= 3 && companionMatches.length
        ? `${brief.people} 人同行，安排可以一起体验的${companionMatches.join("、")}`
        : `${brief.people} 人同行，共用一份路线与时间安排`;
  const actionLabel = (item: Activity) => item.category === "市集"
    ? item.evidence.kind === "route-inspiration" ? "逛逛街区" : "逛个市场"
    : { 展览: "看一场展", 户外: "去散个步", 演出: "听一场现场" }[item.category];
  const routeTitle =
    candidate.items.length === 1
      ? candidate.items[0].title
      : `${actionLabel(candidate.items[0])}，再${actionLabel(candidate.items[1])}`;
  const title =
    index === 0
      ? routeTitle
      : savings > 0
        ? "少花一点，多留点余地"
        : first && candidate.duration < first.duration
          ? "少赶一点，轻松一点"
          : "换个方向，也不错";
  const reasons = [
    interestMatches.length
      ? `包含你想体验的${interestMatches.join("、")}`
      : brief.interests.length
        ? "预算与时间优先，这份方案暂未覆盖所选兴趣"
        : "按你的预算与时间，组合城市里的小惊喜",
    `规划人均 ¥${candidate.total}，含餐饮 ¥${brief.mealBudget} + 交通 ¥${brief.transportBudget}，按预留金额还余 ¥${money(brief.budget - candidate.total)}`,
    `${companionReason}；${brief.people} 人参考合计 ¥${money(candidate.total * brief.people)}`,
    `约 ${durationLabel(candidate.duration)}，预计 ${candidate.end.slice(11)} 结束，在你的可用时间内`,
    brief.weather === "下雨"
      ? "活动都在室内，转场仍建议带好雨具"
      : brief.indoorOnly
        ? "按你的要求只安排室内地点，转场仍需留意天气"
      : allIndoor
        ? "以室内活动为主，天气变化也有余地"
        : `${brief.weather}情景下，给户外散步留一点时间`,
  ];
  const tradeoffs = [];
  if (brief.excludedInterests?.length)
    tradeoffs.push(`按你的要求不安排${[...new Set(brief.excludedInterests)].join("、")}，仅比较剩余类型`);
  if (index > 0 && first) {
    if (savings > 0)
      tradeoffs.push(
        `比首选每人少花 ¥${savings}${candidate.items.length < first.items.length ? `，少安排 ${first.items.length - candidate.items.length} 站` : ""}`,
      );
    else if (candidate.duration < first.duration)
      tradeoffs.push(
        `比首选少安排 ${durationLabel(first.duration - candidate.duration)}，留给自由活动`,
      );
    else tradeoffs.push("换一种活动体验；费用与时长未必比首选更少");
  }
  if (brief.interests.length && interestMatches.length < brief.interests.length)
    tradeoffs.push(
      `尚未覆盖：${brief.interests.filter((interest) => !interestMatches.includes(interest)).join("、")}`,
    );
  if (candidate.items.length > 1)
    tradeoffs.push("站间预留 25 分钟，实际交通时间需出发前核实");
  if (candidate.items.some((item) => item.category === "演出"))
    tradeoffs.push("演出按 19:00 后估排，需另行确认真实场次与票务");
  if (candidate.items.some((item) => item.price > 0 && item.evidence.pricing.kind === "planning-estimate"))
    tradeoffs.push("含未核验票价的规划预留，实际花费需以官方当期价格复算");
  if (candidate.items.some((item) => item.evidence.kind === "route-inspiration"))
    tradeoffs.push("街区真实，但未确认市集场次；可先逛街区，再按公告安排活动");
  if (!tradeoffs.length)
    tradeoffs.push("只安排一处目的地；餐饮已预留费用，用餐时间由你决定");
  return {
    id: `weekend-${candidate.items.map((item) => item.id).join("-")}`,
    title,
    subtitle: candidate.items.map((item) => item.title).join(" → "),
    activityIds: candidate.items.map((item) => item.id),
    options: optionsFor(brief),
    reasons,
    tradeoffs,
    totalPerPerson: candidate.total,
    durationMinutes: candidate.duration,
  };
}

/** At most two distinct stop sets. Hard constraints are never relaxed without a new brief. */
export function recommendWeekendProposals(
  brief: WeekendBrief,
): WeekendProposal[] {
  const candidates = candidatesFor(brief);
  if (!candidates.length) return [];
  const first = candidates[0];
  const remaining = candidates.slice(1);
  const second = [...remaining].sort(
    (a, b) => a.total - b.total || a.duration - b.duration || b.rank - a.rank,
  )[0];
  return [
    toProposal(first, brief, 0),
    ...(second ? [toProposal(second, brief, 1, first)] : []),
  ];
}

export function explainWeekendConstraints(brief: WeekendBrief): string[] {
  if (!isValidBrief(brief))
    return ["请填写有效的城市、日期、时间、人数和非负预算，再看看周末的可能。"];
  const preferencePool = activities.filter(item => matchesHardPreferences(item, brief));
  if (!preferencePool.length) return [
    "按当前城市、室内要求和排除类型，没有可选目的地；请调整偏好，不会自动放宽你的条件。",
    ...(brief.excludedInterests?.length ? [`已排除：${[...new Set(brief.excludedInterests)].join("、")}。`] : []),
  ];
  const openPool = preferencePool.filter(item => !buildItinerary([item], optionsFor(brief)).openingConflicts.length);
  if (!openPool.length) return [
    "按已知常规开放安排，当前日期或出发时间没有可完整游玩的目的地；请换一天、提前出发，或核实场馆特别开放公告。",
    ...(brief.weather === "下雨" ? ["雨天仍排除室外地点，不用室外活动填补空缺。"] : []),
  ];
  const pool = openPool.filter(item => endsWithinPlanningDay(buildItinerary([item], optionsFor(brief)).stops.at(-1)?.end, brief.date));
  if (!pool.length) return [
    "当前开始时间没有能在所选日期 22:00 前结束的方案；请提前开始。本工具规划当天的周末出游，这不是对场所营业时间的判断。",
    ...(brief.weather === "下雨" ? ["雨天仍只考虑室内地点。"] : []),
  ];
  const minimumCost =
    Math.min(...pool.map((item) => item.price)) +
    brief.mealBudget +
    brief.transportBudget;
  const reasons: string[] = [];
  if (openPool.length < preferencePool.length)
    reasons.push("已排除常规闭馆日、错过入场时间或无法在闭馆前完成的场馆。");
  if (pool.length < openPool.length)
    reasons.push("一天出游方案须在所选日期 22:00 前结束；已排除跨日或更晚结束的安排，这不代表场所已关闭。");
  if (brief.budget < brief.mealBudget + brief.transportBudget)
    reasons.push(
      `餐饮与交通已预留 ¥${brief.mealBudget + brief.transportBudget}/人，超过了当前全天预算 ¥${brief.budget}。`,
    );
  else if (brief.budget < minimumCost)
    reasons.push(
      `在当前${brief.weather}条件下，最低规划预留加上餐饮、交通为 ¥${minimumCost}/人；票价仍以官方公告为准。`,
    );
  const shortest = Math.min(
    ...pool.map(
      (item) => buildItinerary([item], optionsFor(brief)).totalMinutes,
    ),
  );
  if (shortest > brief.maxDurationMinutes)
    reasons.push(
      `当前出发时段最短也需要约 ${durationLabel(shortest)}，超出你留下的 ${durationLabel(brief.maxDurationMinutes)}。`,
    );
  if (brief.weather === "下雨")
    reasons.push("已排除室外活动，宁可少推荐，也不忽略雨天条件。");
  if (!reasons.length)
    reasons.push(
      "暂时没有同时满足总预算与可用时间的组合。可以只调整一项条件，再比较一次。",
    );
  return reasons;
}
