import type { Activity, Category, City, Weather } from "./data";

/** Preserve selected indoor stops; add replacements only when their full cost and elapsed time fit. */
export function createRainAlternative(
  items: Activity[],
  options: PlanOptions,
  catalog: Activity[],
): Activity[] | null {
  if (!items.length) return null;
  const city = items[0].city;
  // Overrides belong to the chosen outing; a newly suggested stop starts at its catalog allowance.
  const alternativeOptions = {
    ...options,
    activityCosts: Object.fromEntries(items.map(item => [item.id, activityCostFor(item, options)])),
  };
  const next = items.filter((item) => item.city === city && item.indoor);
  const limit = buildItinerary(items, options).totalMinutes;
  if (next.length) {
    const preserved = buildItinerary(next, alternativeOptions);
    if (preserved.overBudget || preserved.overTime || preserved.openingConflicts.length) return null;
  }
  for (const item of items.filter((item) => !item.indoor)) {
    const replacement = catalog
      .filter(
        (candidate) =>
          candidate.city === city &&
          candidate.indoor &&
          !next.some((selected) => selected.id === candidate.id),
      )
      .sort((a, b) => a.price - b.price)
      .find((candidate) => {
        const result = buildItinerary([...next, candidate], alternativeOptions);
        return !result.overBudget && !result.overTime && !result.openingConflicts.length && result.totalMinutes <= limit;
      });
    if (replacement) next.push(replacement);
  }
  return next.length ? next : null;
}

export interface PlanOptions {
  date: string;
  startTime: string;
  /** Total planned cost per person, including activities, food and transport. */
  budget: number;
  people: number;
  mealBudget: number;
  transportBudget: number;
  weather: string;
  /** Optional user-adjusted per-person allowances by activity ID; never proof of payment or a live quote. */
  activityCosts?: Record<string, number>;
  /** First stop to last stop, including waits and transfers; valid integer range 60–720. */
  maxDurationMinutes?: number;
}

export interface ItineraryStop {
  activity: Activity;
  /** Local Asia/Shanghai date/time, deliberately without a misleading UTC suffix. */
  start: string;
  end: string;
  minutes: number;
  /** Estimated transfer before this stop; zero for the first stop. */
  transferMinutes: number;
  /** Waiting before entry, included in the total elapsed time. */
  waitingMinutes: number;
  waitingReason?: "opening" | "performance";
}

export interface ItineraryResult {
  stops: ItineraryStop[];
  activityCost: number;
  totalPerPerson: number;
  groupTotal: number;
  /** Elapsed time, including transfers and any wait before an evening performance. */
  totalMinutes: number;
  overBudget: boolean;
  /** False for legacy plans with no valid explicit duration limit. */
  overTime: boolean;
  warnings: string[];
  /** Conflicts with published regular opening rules, not a live operating status. */
  openingConflicts: string[];
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const shanghaiDate = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const nextWeekday = (
  weekday: number,
  from = shanghaiDate(),
  followingWeek = false,
) => {
  const day = new Date(`${from}T00:00:00Z`);
  const offset = (weekday - day.getUTCDay() + 7) % 7;
  day.setUTCDate(day.getUTCDate() + offset + (followingWeek ? 7 : 0));
  return day.toISOString().slice(0, 10);
};

export const defaultPlanOptions: PlanOptions = {
  date: nextWeekday(6),
  startTime: "10:00",
  budget: 150,
  people: 2,
  mealBudget: 30,
  transportBudget: 15,
  weather: "多云",
};

const money = (value: number) =>
  Number.isFinite(value) ? Math.round(Math.max(0, value) * 100) / 100 : 0;

/** Only an own, finite amount within the editing range overrides the catalog allowance. */
export function activityCostFor(activity: Activity, options: PlanOptions): number {
  const overrides = options.activityCosts;
  const value = overrides && Object.prototype.hasOwnProperty.call(overrides, activity.id)
    ? overrides[activity.id]
    : undefined;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10_000
    ? money(value)
    : money(activity.price);
}
const validDate = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  Number.isFinite(Date.parse(`${date}T00:00:00Z`)) &&
  new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
const validTime = (time: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
const localStamp = (value: number) =>
  new Date(value).toISOString().slice(0, 16);

function durationMinutes(duration: string): number {
  const range = duration.match(
    /(\d+(?:\.\d+)?)\s*[–—~～至\-]\s*(\d+(?:\.\d+)?)\s*(小时|h|分钟|min)/i,
  );
  if (range)
    return Math.max(
      1,
      Math.round(
        ((Number(range[1]) + Number(range[2])) / 2) *
          (/小时|h/i.test(range[3]) ? 60 : 1),
      ),
    );
  const hours = duration.match(/(\d+(?:\.\d+)?)\s*(?:小时|h)/i);
  const minutes = duration.match(/(\d+(?:\.\d+)?)\s*(?:分钟|min)/i);
  const parsed =
    (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
  return parsed > 0 ? Math.round(parsed) : 120;
}

function adjustForOpening(activity: Activity, arrival: number, minutes: number): { start: number; conflict?: string } {
  const opening = activity.evidence?.opening;
  if (!opening) return { start: arrival };
  const name = activity.evidence.venueName;
  const weekday = new Date(arrival).getUTCDay();
  if (opening.closedWeekdays?.includes(weekday))
    return { start: arrival, conflict: `${name}在所选日期为常规闭馆日，请换日期或核实节假日特别开放公告。` };
  const windows = opening.weeklyHours?.filter(window => window.days.includes(weekday));
  if (!windows?.length) return { start: arrival };
  const dayStart = Math.floor(arrival / DAY) * DAY;
  const timeAt = (time: string) => dayStart + (Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))) * MINUTE;
  const fitting = windows
    .map(window => ({ start: Math.max(arrival, timeAt(window.open)), end: timeAt(window.close), lastEntry: timeAt(window.lastEntry || window.close) }))
    .filter(window => window.start < window.lastEntry && window.start + minutes * MINUTE <= window.end)
    .sort((a, b) => a.start - b.start)[0];
  if (fitting) return { start: fitting.start };
  return { start: arrival, conflict: `${name}的预计到访或游玩时长不符合常规入场、闭馆时间，请提前出发、缩短停留或更换目的地。` };
}

export function buildItinerary(
  items: Activity[],
  options: PlanOptions,
): ItineraryResult {
  const date = validDate(options.date) ? options.date : defaultPlanOptions.date;
  const startTime = validTime(options.startTime)
    ? options.startTime
    : defaultPlanOptions.startTime;
  const start = Date.parse(`${date}T${startTime}:00Z`);
  let cursor = start;
  const warnings: string[] = [];
  const openingConflicts: string[] = [];
  if (date !== options.date || startTime !== options.startTime)
    warnings.push("日期或时间格式不完整，暂按默认出发时间估算。");
  const stops = items.map((activity, index) => {
    const transferMinutes = index ? 25 : 0;
    cursor += transferMinutes * MINUTE;
    const arrival = cursor;
    let waitingReason: ItineraryStop["waitingReason"];
    if (activity.category === "演出") {
      const dayStart = Math.floor(cursor / DAY) * DAY;
      cursor = Math.max(cursor, dayStart + 19 * 60 * MINUTE);
      if (cursor > arrival) waitingReason = "performance";
    }
    const minutes = durationMinutes(activity.duration);
    const opening = adjustForOpening(activity, cursor, minutes);
    if (opening.start > cursor) waitingReason = "opening";
    cursor = opening.start;
    if (opening.conflict) openingConflicts.push(opening.conflict);
    const stop = {
      activity,
      start: localStamp(cursor),
      end: localStamp(cursor + minutes * MINUTE),
      minutes,
      transferMinutes,
      waitingMinutes: Math.round((cursor - arrival) / MINUTE),
      waitingReason,
    };
    cursor += minutes * MINUTE;
    return stop;
  });
  const activityCost = money(
    items.reduce((sum, item) => sum + activityCostFor(item, options), 0),
  );
  const totalPerPerson = items.length
    ? money(
        activityCost +
          money(options.mealBudget) +
          money(options.transportBudget),
      )
    : 0;
  const people = Number.isFinite(options.people)
    ? Math.max(1, Math.floor(options.people))
    : 1;
  const groupTotal = money(totalPerPerson * people);
  const overBudget = totalPerPerson > money(options.budget);
  const totalMinutes = items.length ? Math.round((cursor - start) / MINUTE) : 0;
  const durationLimit = typeof options.maxDurationMinutes === "number" &&
    Number.isInteger(options.maxDurationMinutes) &&
    options.maxDurationMinutes >= 60 && options.maxDurationMinutes <= 720
    ? options.maxDurationMinutes : undefined;
  const overTime = durationLimit !== undefined && totalMinutes > durationLimit;
  if (overTime)
    warnings.push(`预计行程 ${totalMinutes} 分钟，超过你设置的 ${durationLimit} 分钟可用时间 ${totalMinutes - durationLimit!} 分钟；请减少活动或调整可用时间。`);
  if (overBudget)
    warnings.push(
      `预计每人超出全天预算 ¥${money(totalPerPerson - money(options.budget))}，可减少活动，或核对并调整各项规划金额。`,
    );
  if (options.weather === "下雨" && items.some((item) => !item.indoor))
    warnings.push(
      "行程含室外活动，雨天建议更换室内备选；出发前仍需核实实际天气。",
    );
  if (new Set(items.map((item) => item.city)).size > 1)
    warnings.push(
      "行程跨城市，25 分钟转场估算不适用；请分开规划，另行核实城际交通。",
    );
  if (stops.some((stop) => stop.end.slice(0, 10) !== date))
    warnings.push("预计行程跨到次日，请减少活动、提前出发或分两天安排。");
  else if (
    stops.length &&
    Number(stops[stops.length - 1].end.slice(11, 13)) >= 22
  )
    warnings.push("预计结束较晚，请提前确认末班车与返程安排。");
  if (totalMinutes > 8 * 60)
    warnings.push(
      "行程跨度超过 8 小时，建议留出吃饭和休息时间；当前时间轴尚未自动安排用餐。",
    );
  if (items.some((item) => item.category === "演出"))
    warnings.push("演出暂按不早于 19:00 安排，仅作规划占位，请核实真实场次。");
  if (items.some((item) => item.price > 0 && item.evidence?.pricing.kind === "planning-estimate"))
    warnings.push("费用含未核验票价的规划预留，实际总额需按所选展览或演出价格调整。");
  if (items.some((item) => item.evidence?.kind === "route-inspiration"))
    warnings.push("街区探索是路线灵感，尚未确认市集场次或具体商户营业情况。");
  warnings.push(...openingConflicts);
  if (items.some((item) => item.evidence?.opening.weeklyHours?.length))
    warnings.push("开放时段按馆方常规安排估算；节假日、临时闭馆与预约要求仍需出发前核实。");
  return {
    stops,
    activityCost,
    totalPerPerson,
    groupTotal,
    totalMinutes,
    overBudget,
    overTime,
    warnings,
    openingConflicts,
  };
}

const escapeIcs = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
const icsStamp = (value: string) => value.replace(/[-:]/g, "") + "00";

/** RFC 5545 content lines are folded at 75 octets, without splitting UTF-8 code points. */
function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let chunk = "";
  let bytes = 0;
  for (const character of line) {
    const length = encoder.encode(character).length;
    if (bytes + length > 75) {
      lines.push(chunk);
      chunk = " ";
      bytes = 1;
    }
    chunk += character;
    bytes += length;
  }
  lines.push(chunk);
  return lines.join("\r\n");
}

export function createCalendar(
  items: Activity[],
  options: PlanOptions,
): string {
  const itinerary = buildItinerary(items, options);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Weekend Club//City Explorer//ZH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:出门啦·我的周末",
    "X-WR-TIMEZONE:Asia/Shanghai",
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Shanghai",
    "X-LIC-LOCATION:Asia/Shanghai",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0800",
    "TZOFFSETTO:+0800",
    "TZNAME:CST",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  itinerary.stops.forEach((stop, index) => {
    const uid = `${encodeURIComponent(stop.activity.id)}-${stop.start.replace(/[^\d]/g, "")}-${index}@weekend-city-guide`;
    const description = [
      "个人周末计划 · 时间为估算，非预约或已确认场次。",
      stop.activity.subtitle,
      `活动规划 ¥${activityCostFor(stop.activity, options)} / 人；全天含餐饮交通规划 ¥${itinerary.totalPerPerson} / 人。`,
      `全天费用拆分：活动合计 ¥${itinerary.activityCost} + 餐饮 ¥${money(options.mealBudget)} + 交通 ¥${money(options.transportBudget)} / 人；人均全天预算 ¥${money(options.budget)}；同行参考合计 ¥${itinerary.groupTotal}。`,
      `完整安排：${itinerary.stops[0].start.replace("T", " ")} 至 ${itinerary.stops.at(-1)!.end.replace("T", " ")}（Asia/Shanghai），共 ${itinerary.totalMinutes} 分钟。`,
      `交通建议：${stop.activity.transport}`,
      "金额为自行规划，不代表支付或票价确认。相邻活动转场按 25 分钟估算，未计算实际导航路线；出发前核实开放时间、预约、天气与交通。",
      "时间范围为首站开始至末站结束，不含往返交通；餐饮仅预留费用，用餐时间需自行安排。",
      ...itinerary.warnings.map(warning => `计划提醒：${warning}`),
    ].join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Asia/Shanghai:${icsStamp(stop.start)}`,
      `DTEND;TZID=Asia/Shanghai:${icsStamp(stop.end)}`,
      `SUMMARY:${escapeIcs(`${itinerary.openingConflicts.length || itinerary.overTime || itinerary.overBudget ? "【需调整】" : ""}${stop.activity.title}`)}`,
      `LOCATION:${escapeIcs(`${stop.activity.city} · ${stop.activity.location}`)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      "STATUS:TENTATIVE",
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

export interface ParsedBrief {
  city?: City;
  category?: Category;
  /** Per-activity, per-person filter budget, distinct from the itinerary's total budget. */
  budget?: number;
  people?: number;
  weather?: Weather;
  date?: string;
  query?: string;
  recognized: string[];
  unrecognized?: string;
}

function chineseNumber(value: string): number {
  if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value);
  const digits: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };
  const units: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };
  let result = 0,
    digit = 0;
  for (const char of value) {
    if (char in digits) digit = digits[char];
    else if (char in units) {
      result += (digit || 1) * units[char];
      digit = 0;
    }
  }
  return result + digit;
}

/** A transparent keyword parser, not a model call or weather forecast. */
export function parseBrief(text: string, currentCity?: string): ParsedBrief {
  const value = text.trim();
  const result: ParsedBrief = { recognized: [] };
  const explicitCity = (["上海", "杭州", "北京"] as City[]).find((city) =>
    value.includes(city),
  );
  if (explicitCity) {
    result.city = explicitCity;
    result.recognized.push(`城市：${explicitCity}`);
  } else if (["上海", "杭州", "北京"].includes(currentCity || ""))
    result.city = currentCity as City;

  const normalizedWeather = value.replace(
    /(?:不|没|无|没有)(?:会)?(?:下雨|雨)/g,
    "",
  );
  if (/下雨|雨天|有雨|降雨/.test(normalizedWeather)) result.weather = "下雨";
  else if (/晴天|晴朗|天晴|大晴/.test(value)) result.weather = "晴天";
  else if (/多云|阴天/.test(value)) result.weather = "多云";
  if (result.weather)
    result.recognized.push(`天气条件：${result.weather}（需核实预报）`);

  const positiveInterests = value.replace(
    /(?:不想|不要|不去|不看|不喜欢|别去|不)(?:去|看)?(?:户外|徒步|爬山|展览|看展|演出|音乐|市集)/g,
    "",
  );
  const interests: Category[] = [];
  if (/展览|看展|美术馆|博物馆|艺术/.test(positiveInterests))
    interests.push("展览");
  if (/市集|集市|手作|逛街|小摊/.test(positiveInterests))
    interests.push("市集");
  if (/演出|音乐|live\s*house|乐队|live|演唱会/i.test(positiveInterests))
    interests.push("演出");
  if (/户外|徒步|爬山|公园|散步|滨江|西湖/.test(positiveInterests))
    interests.push("户外");
  if (interests.length) {
    result.category = interests.length === 1 ? interests[0] : "全部";
    result.recognized.push(
      interests.length === 1
        ? `偏好：${interests[0]}`
        : `多种兴趣：${interests.join("、")}，展示全部类型`,
    );
  }

  if (/预算不限|不限预算|预算不限制/.test(value)) result.budget = 999;
  else if (/免费|零预算|不花钱|(?:^|[^\d])0\s*元/.test(value))
    result.budget = 0;
  else {
    const amount = "([0-9]+(?:\\.[0-9]+)?|[一二两三四五六七八九十百千]+)";
    const budgetRange = value.match(
      new RegExp(
        `${amount}\\s*(?:到|至|[-–~～])\\s*${amount}\\s*(?:元|块|以内|以下)`,
      ),
    );
    const budget =
      value.match(
        new RegExp(
          `(?:预算|人均|每人|不超过|最多|¥|￥)\\s*(?:预算|约|不超过|最多|为|是|在)?\\s*${amount}`,
        ),
      ) ||
      value.match(
        new RegExp(`${amount}\\s*(?:(?:元|块)(?:以内|以下|左右)?|以内|以下)`),
      );
    if (budgetRange) result.budget = chineseNumber(budgetRange[2]);
    else if (budget) result.budget = chineseNumber(budget[1]);
  }
  if (result.budget !== undefined)
    result.recognized.push(
      result.budget === 999
        ? "单项活动预算：不限"
        : `单项活动人均预算：¥${result.budget} 以内（全天费用另算）`,
    );

  if (/一个人|一人|独自|自己去|solo|(?:^|[^0-9])1\s*人/i.test(value))
    result.people = 1;
  else if (/两个人|两人|二人|情侣|约会|(?:^|[^0-9])2\s*人/.test(value))
    result.people = 2;
  else if (
    /三五|(?:^|[^0-9])[3-5]\s*(?:个)?人|[三四五]\s*(?:个)?人|一群|好友|朋友们|小伙伴/.test(
      value,
    )
  )
    result.people = 4;
  if (result.people)
    result.recognized.push(
      result.people === 4 ? "同行：三五好友" : `同行：${result.people} 人`,
    );

  const literalDate = value.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (literalDate && validDate(literalDate[1])) result.date = literalDate[1];
  else if (/下(?:周|星期)(?:六|日|天)/.test(value))
    result.date = nextWeekday(
      /下(?:周|星期)六/.test(value) ? 6 : 0,
      shanghaiDate(),
      true,
    );
  else if (/(?:周|星期)(?:六|日|天)|周末/.test(value))
    result.date = nextWeekday(/(?:周|星期)(?:日|天)/.test(value) ? 0 : 6);
  if (result.date) result.recognized.push(`计划日期：${result.date}`);
  const search = value.match(
    /(?:搜索|关键词|搜一下)\s*[:：]?\s*[“"「]?([^”"」,，。；;]+)/,
  );
  if (search?.[1]) {
    result.query = search[1].trim().slice(0, 40);
    result.recognized.push(`搜索：${result.query}`);
  }
  if (!result.recognized.length)
    result.unrecognized =
      "暂时没识别到条件。试试“上海，下雨，两个人，预算 100 元，想看展”。";
  else if (/半天|一整天|全天|避开|不要|不想|室内/.test(value))
    result.unrecognized =
      "时长、排除项和室内偏好暂不自动识别，可继续用筛选和行程调整。";
  return result;
}
