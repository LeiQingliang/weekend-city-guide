import type { WeekendBrief, WeekendInterest } from "./curation";

export interface IntentRevision {
  brief: WeekendBrief;
  changes: { label: string; before: string; after: string }[];
  recognized: string[];
  unresolved: string[];
  blocked: boolean;
}

const NUMBER = "-?(?:\\d+(?:\\.\\d+)?|[零〇一二两三四五六七八九十百千万点]+)";
const NUMBER_OR_HALF = `(?:${NUMBER}|半)`;
const categories: [WeekendInterest, RegExp][] = [
  ["展览", /展览|看展|艺术展|美术馆|博物馆/g],
  ["市集", /市集|集市|逛吃/g],
  ["演出", /演出|音乐会|音乐现场|live\s*house/gi],
  ["户外", /户外|徒步|散步|公园/g],
];
const clone = (brief: WeekendBrief): WeekendBrief => ({
  ...brief,
  interests: [...brief.interests],
  ...(brief.excludedInterests
    ? { excludedInterests: [...brief.excludedInterests] }
    : {}),
});
const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const shanghaiToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
function number(value: string): number {
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if (value === "半") return 0.5;
  if (value.startsWith("-")) return -number(value.slice(1));
  const digit: Record<string, number> = {
    零: 0,
    〇: 0,
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
  const [whole, fraction] = value.split("点");
  if (fraction !== undefined) {
    if (!fraction || [...fraction].some((char) => digit[char] === undefined))
      return NaN;
    return (
      number(whole) +
      Number(`0.${[...fraction].map((char) => digit[char]).join("")}`)
    );
  }
  if (!/[十百千万]/.test(whole))
    return Number([...whole].map((char) => digit[char] ?? "?").join(""));
  // Avoid guessing colloquial abbreviated amounts such as “一百五” (105 or 150).
  if (/[百千万][一二两三四五六七八九]$/.test(whole)) return NaN;
  let total = 0,
    section = 0,
    current = 0;
  for (const char of whole) {
    if (digit[char] !== undefined) current = digit[char];
    else if (char === "万") {
      total += (section + current || 1) * 10000;
      section = 0;
      current = 0;
    } else {
      section += (current || 1) * ({ 十: 10, 百: 100, 千: 1000 }[char] ?? NaN);
      current = 0;
    }
  }
  return total + section + current;
}
function futureDate(today: string, delta: number): string {
  return new Date(Date.parse(`${today}T00:00:00Z`) + delta * 86400000)
    .toISOString()
    .slice(0, 10);
}

/** Deterministic local draft editing. Recognition is never a booking, model call, or promise. */
export function reviseIntent(
  base: WeekendBrief,
  text: string,
  today = shanghaiToday(),
): IntentRevision {
  const original = clone(base),
    brief = clone(base);
  const recognized: string[] = [],
    unresolved: string[] = [];
  let invalid = false;
  const input = typeof text === "string" ? text.trim() : "";
  const consumed: [number, number][] = [];
  const claim = (match: RegExpMatchArray | RegExpExecArray) => {
    if (match.index !== undefined)
      consumed.push([match.index, match.index + match[0].length]);
  };
  const all = (pattern: RegExp) => [...input.matchAll(pattern)];
  const note = (value: string) => {
    if (!recognized.includes(value)) recognized.push(value);
  };
  const missing = (value: string) => {
    if (!unresolved.includes(value)) unresolved.push(value);
  };
  const reject = (value: string) => {
    invalid = true;
    missing(value);
  };
  const finish = (): IntentRevision => {
    const blocked = invalid || !recognized.length;
    const target = blocked ? original : brief;
    const changes: IntentRevision["changes"] = [];
    const add = (label: string, before: string, after: string) => {
      if (before !== after) changes.push({ label, before, after });
    };
    if (!blocked) {
      add("城市", base.city, target.city);
      add("全天人均预算", `¥${base.budget}`, `¥${target.budget}`);
      add("同行人数", `${base.people}人`, `${target.people}人`);
      add(
        "可用时长",
        `${base.maxDurationMinutes}分钟`,
        `${target.maxDurationMinutes}分钟`,
      );
      add("出发日期", base.date, target.date);
      add("出发时间", base.startTime, target.startTime);
      add("天气情景", base.weather, target.weather);
      add(
        "偏好",
        base.interests.join("、") || "不限",
        target.interests.join("、") || "不限",
      );
      add(
        "排除活动",
        (base.excludedInterests || []).join("、") || "无",
        (target.excludedInterests || []).join("、") || "无",
      );
      add(
        "场所限制",
        base.indoorOnly ? "只室内" : "室内外均可",
        target.indoorOnly ? "只室内" : "室内外均可",
      );
      add(
        "节奏",
        base.pace === "relaxed" ? "轻松" : "均衡",
        target.pace === "relaxed" ? "轻松" : "均衡",
      );
    }
    if (!recognized.length && !unresolved.length)
      missing(
        input
          ? "这句话暂时无法转换为规划条件，请补充城市、日期、人数、预算或兴趣。"
          : "请先输入想调整的条件。",
      );
    return { brief: target, changes, recognized, unresolved, blocked };
  };
  if (!input) return finish();
  if (input.length > 1000) {
    reject("一次最多处理1000字，请拆分条件。");
    return finish();
  }
  if (!validDate(today)) {
    reject("参考日期无效，无法解释相对日期。");
    return finish();
  }
  if (
    /(?:帮我|替我|直接|现在|立即)?(?:退款|退票|下单|付款|支付|买票|购票|订票|联系商家|联系场馆|预约成功|帮我预约)/.test(
      input,
    )
  ) {
    reject(
      "当前只能修改规划草稿，不能退款、下单、付款、购票、代为预约或联系商家。请前往官方渠道自行办理。",
    );
    return finish();
  }
  // Mask unsupported deadlines before parsing clock numbers: a return deadline is not a departure time.
  const unsupported: [RegExp, string][] = [
    [
      /(?:少走路|少步行|不要走太多|不想走太多|不爬坡)/g,
      "步行距离与体力负担尚未核算，不能保证少走路。",
    ],
    [/(?:无障碍|轮椅|婴儿车)/g, "无障碍通行条件尚未核实，请向场馆确认。"],
    [/(?:宠物|带狗|带猫)/g, "宠物准入尚未核实，请向场馆确认。"],
    [
      /(?:不排队|少排队|免排队|排队)/g,
      "实时排队情况不可用，不能保证排队时长。",
    ],
    [
      /(?:地铁|公交|步行|开车|打车|交通)[^，,。；;]{0,10}(?:分钟|min)/gi,
      "交通耗时尚未核算，不能保证通勤时限。",
    ],
    [
      new RegExp(
        `(?:(?:上午|早上|下午|晚上|中午)\\s*)?(?:${NUMBER})(?:[:：]\\d{1,2}|点(?:半|${NUMBER}分?)?)(?:前|之前)[^，,。；;]{0,12}(?:回学校|返校|回家|返回|到家|结束)|(?:回学校|返校|回家|返回|到家)[^，,。；;]{0,10}(?:之前|以前)`,
        "g",
      ),
      "返程截止时间未计入路线，不能保证指定时刻前返校或到家。",
    ],
    [
      /(?:免费|不花钱|零消费)/g,
      "免费可能只指场馆门票，不能把全天餐饮交通预算自动改为0；请明确全天人均预算。",
    ],
  ];
  let supported = input;
  for (const [pattern, message] of unsupported)
    for (const match of all(pattern)) {
      claim(match);
      missing(message);
      const at = match.index!;
      supported =
        supported.slice(0, at) +
        " ".repeat(match[0].length) +
        supported.slice(at + match[0].length);
    }
  const matches = (pattern: RegExp) => [...supported.matchAll(pattern)];
  for (const match of matches(/上海|杭州|北京/g)) {
    claim(match);
    brief.city = match[0] as WeekendBrief["city"];
    note(`城市：${brief.city}`);
  }
  for (const match of matches(
    /广州|深圳|成都|重庆|南京|苏州|武汉|西安|长沙|天津/g,
  )) {
    claim(match);
    missing(`暂不支持${match[0]}，目前仅覆盖上海、杭州、北京。`);
  }
  for (const match of matches(
    new RegExp(
      `(${NUMBER})\\s*(?:个)?人(?:同行|一起|出发)?|(?:人数|同行人数)\\s*(?:改成|改为|调整为|为|是|到|=)?\\s*(${NUMBER})`,
      "g",
    ),
  )) {
    claim(match);
    const value = number(match[1] || match[2]);
    if (!Number.isInteger(value) || value < 1 || value > 12)
      reject("同行人数须为1–12之间的整数，这轮没有应用修改。");
    else {
      brief.people = value;
      note(`同行人数：${value}人`);
    }
  }
  if (/(?:一个人|独自|自己一个人)/.test(supported)) {
    brief.people = 1;
    note("同行人数：1人");
    for (const match of matches(/一个人|独自|自己一个人/g)) claim(match);
  }
  const budgets = matches(
    new RegExp(
      `(?:(人均|每人|全天人均|总|合计|一共|全员)\\s*)?预算\\s*(?:改成|改为|调整为|控制在|不超过|最多|为|是|到|[:：=])?\\s*(${NUMBER})\\s*(?:元|块|人民币)?|(?:人均|每人)\\s*(${NUMBER})\\s*(?:元|块)?|(?:总共|合计|一共)\\s*(${NUMBER})\\s*(?:元|块)`,
      "g",
    ),
  );
  const budgetScopes = new Set<string>();
  for (const match of budgets) {
    claim(match);
    const total = /^(?:总|合计|一共|全员)/.test(match[0]);
    const value = number(match[2] || match[3] || match[4]);
    const perPerson = total ? value / brief.people : value;
    budgetScopes.add(total ? "total" : "person");
    if (
      !Number.isFinite(value) ||
      value < 0 ||
      !Number.isFinite(perPerson) ||
      perPerson > 100000
    )
      reject("全天人均预算须为0–100000之间的明确金额，这轮没有应用修改。");
    else {
      brief.budget = perPerson;
      note(
        total
          ? `全天总预算¥${value} ÷ ${brief.people}人 = 人均¥${perPerson}`
          : `全天人均预算：¥${value}（含餐饮交通）`,
      );
    }
  }
  if (budgetScopes.size > 1)
    reject("同一句同时出现总预算和人均预算，请保留一种口径后重试。");
  for (const match of matches(
    new RegExp(
      `(${NUMBER_OR_HALF})\\s*(?:个)?(?:小时|h)(?:以内|内)?|(${NUMBER})\\s*分钟|半天`,
      "gi",
    ),
  )) {
    claim(match);
    const value =
      match[0] === "半天"
        ? 240
        : match[2]
          ? number(match[2])
          : number(match[1]) * 60;
    if (!Number.isInteger(value) || value < 60 || value > 720)
      reject("可用时长须为60–720分钟，这轮没有应用修改。");
    else {
      brief.maxDurationMinutes = value;
      note(
        `可用时长：${value}分钟${match[0] === "半天" ? "（半天按4小时解释）" : ""}`,
      );
    }
  }
  for (const match of matches(
    /\d{4}-\d{1,2}-\d{1,2}|今天|明天|后天|(?:下周|本周|这周|周|星期)[一二三四五六日天]/g,
  )) {
    claim(match);
    let date = match[0];
    if (date === "今天" || date === "明天" || date === "后天")
      date = futureDate(today, date === "今天" ? 0 : date === "明天" ? 1 : 2);
    else if (!/^\d/.test(date)) {
      const day = "日一二三四五六".indexOf(date.at(-1)!.replace("天", "日"));
      const current = new Date(`${today}T00:00:00Z`).getUTCDay();
      let delta = (day - current + 7) % 7;
      if (date.startsWith("下周"))
        delta = ((day + 6) % 7) + 7 - ((current + 6) % 7);
      if (date.startsWith("本周") || date.startsWith("这周"))
        delta = ((day + 6) % 7) - ((current + 6) % 7);
      date = futureDate(today, delta);
    }
    if (!validDate(date) || date < today)
      reject("出发日期无效或早于今天，这轮没有应用修改。");
    else {
      brief.date = date;
      note(`出发日期：${date}（上海日期）`);
    }
  }
  const clock = new RegExp(
    `(?:(上午|早上|下午|晚上|中午)\\s*)?(${NUMBER})\\s*(?:[:：](\\d{1,2})|点(?:(${NUMBER})分?|半)?)(?![前后])`,
    "g",
  );
  let explicitClock = false;
  for (const match of matches(clock)) {
    // “三点五小时” or “预算一百点五” contains a decimal, not a departure clock.
    if (
      consumed.some(
        ([start, end]) => match.index! >= start && match.index! < end,
      )
    )
      continue;
    claim(match);
    explicitClock = true;
    let hour = number(match[2]);
    const minute = match[3]
      ? Number(match[3])
      : match[0].endsWith("半")
        ? 30
        : match[4]
          ? number(match[4])
          : 0;
    if (["下午", "晚上"].includes(match[1]) && hour >= 1 && hour < 12)
      hour += 12;
    if (match[1] === "中午" && hour >= 1 && hour <= 2) hour += 12;
    if (
      !Number.isInteger(hour) ||
      hour < 0 ||
      hour > 23 ||
      !Number.isInteger(minute) ||
      minute < 0 ||
      minute > 59 ||
      (["上午", "早上"].includes(match[1]) && hour > 12)
    )
      reject("出发时间无效，请使用00:00–23:59的明确时间。");
    else {
      brief.startTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      note(`出发时间：${brief.startTime}`);
    }
  }
  if (!explicitClock)
    for (const match of matches(/下午|上午|早上|晚上|中午/g)) {
      claim(match);
      brief.startTime = {
        下午: "14:00",
        上午: "10:00",
        早上: "09:00",
        晚上: "19:00",
        中午: "12:00",
      }[match[0] as "下午"];
      note(`出发时间：${brief.startTime}（${match[0]}的默认解释，可再调整）`);
    }
  for (const match of matches(/晴天|多云|雨天|下雨/g)) {
    const preceding = supported.slice(
      Math.max(0, match.index! - 3),
      match.index,
    );
    claim(match);
    if (/(?:不|别|不要|不想)$/.test(preceding)) {
      missing("无法保证实际天气，请明确要模拟的晴天、多云或下雨情景。");
      continue;
    }
    brief.weather =
      match[0] === "雨天" ? "下雨" : (match[0] as WeekendBrief["weather"]);
    note(`天气情景：${brief.weather}`);
  }
  for (const match of matches(/室内外都可以|取消只室内(?:限制)?|不限室内外/g)) {
    claim(match);
    brief.indoorOnly = false;
    note("场所限制：室内外均可");
  }
  for (const match of matches(
    /(?:只(?:想去|要|去)?室内|仅室内|只在室内|不要户外|不想去户外|避开户外)/g,
  )) {
    if (supported.slice(Math.max(0, match.index! - 2), match.index) === "取消")
      continue;
    claim(match);
    brief.indoorOnly = true;
    note("场所限制：只室内");
  }
  const excluded = new Set<WeekendInterest>(brief.excludedInterests || []),
    preferred = new Set<WeekendInterest>(brief.interests);
  // Negation covers coordinated interests within its clause; a new positive clause resets it.
  const clauses = supported.split(
    /[，,。；;\n]|但是|但|改去|改成|更想|只想|(?<!不)想去|(?=不想|不要|不看|不去|不喜欢|不考虑|避开|别去|别看)/,
  );
  let offset = 0;
  for (const clause of clauses) {
    const at = supported.indexOf(clause, offset);
    offset = at + clause.length;
    const negative =
      /不想|不要|不看|不去|不喜欢|不考虑|排除|避开|别去|别看/.test(clause);
    const cancel = /取消排除|不再排除/.test(clause);
    for (const [category, pattern] of categories)
      if (
        new RegExp(pattern.source, pattern.flags.replace("g", "")).test(clause)
      ) {
        consumed.push([at, at + clause.length]);
        if (negative && !cancel) {
          preferred.delete(category);
          excluded.add(category);
          note(`排除：${category}`);
        } else {
          excluded.delete(category);
          preferred.add(category);
          note(`偏好：${category}`);
        }
      }
  }
  brief.interests = [...preferred];
  brief.excludedInterests = [...excluded];
  for (const match of matches(
    /轻松一点|轻松点|慢慢逛|悠闲|紧凑一点|丰富一点/g,
  )) {
    claim(match);
    brief.pace = /紧凑|丰富/.test(match[0]) ? "balanced" : "relaxed";
    note(`节奏：${brief.pace === "relaxed" ? "轻松" : "均衡"}`);
  }
  // Do not turn a partly understood utterance into a claim that every requirement was handled.
  const rest = input
    .split("")
    .map((char, index) =>
      consumed.some(([start, end]) => index >= start && index < end)
        ? " "
        : char,
    )
    .join("")
    .replace(
      /请|帮我|我们|我|想|希望|可以|能否|能不能|改为|改成|调整为|缩短到|延长到|控制在|不超过|最多|以内|左右|出发|安排|计划|去|玩|在|到|为|是|的|了|吧|再|和|与|及|也|要|个|只|一起|周末|这个|本次|这次|(?:[\s，,。；;：:！!？?、])/g,
      "",
    )
    .trim();
  if (rest)
    missing(`尚未理解或支持：“${rest.slice(0, 80)}”。请拆开表达或手动调整。`);
  return finish();
}
