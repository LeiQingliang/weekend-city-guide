import test from "node:test";
import assert from "node:assert/strict";
import {
  buildItinerary,
  createCalendar,
  createRainAlternative,
  parseBrief,
  type PlanOptions,
} from "./planner";
import type { Activity } from "./data";

const options: PlanOptions = {
  date: "2026-11-14",
  startTime: "10:00",
  budget: 150,
  people: 2,
  mealBudget: 30,
  transportBudget: 15,
  weather: "多云",
};
const activity = (overrides: Partial<Activity> = {}): Activity => ({
  id: "test-gallery",
  city: "上海",
  title: "周末看展",
  subtitle: "慢慢看看",
  category: "展览",
  indoor: true,
  price: 30,
  duration: "2–3 小时",
  location: "示例场馆",
  transport: "地铁后步行",
  time: "周六 14:00",
  image: "/test.jpg",
  tags: ["艺术"],
  description: "示例",
  tips: [],
  route: [],
  capacity: 4,
  joined: 1,
  ...overrides,
});

test("rain alternative preserves indoor choices without adding an over-budget replacement", () => {
  const gallery = activity(),
    walk = activity({
      id: "walk",
      category: "户外",
      indoor: false,
      price: 0,
      duration: "2 小时",
    }),
    show = activity({ id: "show", category: "演出", price: 98 });
  const next = createRainAlternative(
    [gallery, walk],
    { ...options, budget: 100 },
    [gallery, walk, show],
  );
  assert.deepEqual(
    next?.map((a) => a.id),
    [gallery.id],
  );
  assert.equal(buildItinerary(next!, options).totalPerPerson, 75);
});
test("rain alternative avoids evening waits without relaxing budget or original duration", () => {
  const walk = activity({
      id: "walk",
      category: "户外",
      indoor: false,
      price: 0,
      duration: "3 小时",
    }),
    gallery = activity(),
    show = activity({ id: "show", category: "演出", price: 98 });
  assert.deepEqual(
    createRainAlternative([walk], { ...options, budget: 200 }, [
      show,
      gallery,
    ])?.map((a) => a.id),
    [gallery.id],
  );
  assert.equal(
    createRainAlternative([walk], { ...options, budget: 50 }, [gallery, show]),
    null,
  );
  assert.equal(
    createRainAlternative(
      [{ ...walk, duration: "2 小时" }],
      { ...options, budget: 200 },
      [gallery, show],
    ),
    null,
  );
});

test("empty itinerary has no phantom meal or transport cost", () => {
  const result = buildItinerary([], options);
  assert.equal(result.totalPerPerson, 0);
  assert.equal(result.groupTotal, 0);
  assert.equal(result.activityCost, 0);
  assert.equal(result.totalMinutes, 0);
  assert.deepEqual(result.stops, []);
  assert.equal(result.overBudget, false);
});

test("duration ranges use midpoint and only consecutive stops incur a transfer", () => {
  const result = buildItinerary(
    [
      activity(),
      activity({ id: "walk", duration: "2 小时 · 约 4 km", price: 0 }),
    ],
    options,
  );
  assert.deepEqual(
    result.stops.map((stop) => stop.minutes),
    [150, 120],
  );
  assert.deepEqual(
    result.stops.map((stop) => stop.transferMinutes),
    [0, 25],
  );
  assert.equal(result.stops[0].start, "2026-11-14T10:00");
  assert.equal(result.stops[0].end, "2026-11-14T12:30");
  assert.equal(result.stops[1].start, "2026-11-14T12:55");
  assert.equal(result.stops[1].end, "2026-11-14T14:55");
  assert.equal(result.totalMinutes, 295);
});

test("minute ranges and mixed hour/minute durations are parsed without mistaking distance for time", () => {
  const result = buildItinerary(
    [
      activity({ duration: "30–60 分钟 · 2 km" }),
      activity({ id: "other", duration: "1 小时 30 分钟" }),
    ],
    options,
  );
  assert.deepEqual(
    result.stops.map((stop) => stop.minutes),
    [45, 90],
  );
});

test("total budget includes meals and transport per person, equality is within budget", () => {
  const result = buildItinerary([activity()], {
    ...options,
    budget: 75,
    people: 3,
  });
  assert.equal(result.activityCost, 30);
  assert.equal(result.totalPerPerson, 75);
  assert.equal(result.groupTotal, 225);
  assert.equal(result.overBudget, false);
  const over = buildItinerary([activity()], { ...options, budget: 74 });
  assert.equal(over.overBudget, true);
  assert.ok(
    over.warnings.some((warning) => warning.includes("超出全天预算 ¥1")),
  );
});

test("zero activity price does not claim the entire outing is free", () => {
  const result = buildItinerary([activity({ price: 0 })], {
    ...options,
    budget: 0,
  });
  assert.equal(result.activityCost, 0);
  assert.equal(result.totalPerPerson, 45);
  assert.equal(result.overBudget, true);
});

test("negative and nonfinite costs cannot produce negative totals", () => {
  const result = buildItinerary([activity({ price: -20 })], {
    ...options,
    mealBudget: -5,
    transportBudget: Number.NaN,
    people: 0,
  });
  assert.equal(result.totalPerPerson, 0);
  assert.equal(result.groupTotal, 0);
  const decimals = buildItinerary(
    [activity({ price: 0.1 }), activity({ id: "two", price: 0.2 })],
    { ...options, mealBudget: 0, transportBudget: 0, people: 3 },
  );
  assert.equal(decimals.totalPerPerson, 0.3);
  assert.equal(decimals.groupTotal, 0.9);
});

test("performances start no earlier than 19:00 and waiting is counted honestly", () => {
  const result = buildItinerary(
    [activity({ category: "演出", duration: "2 小时" })],
    options,
  );
  assert.equal(result.stops[0].start, "2026-11-14T19:00");
  assert.equal(result.stops[0].end, "2026-11-14T21:00");
  assert.equal(result.totalMinutes, 660);
  assert.ok(result.warnings.some((warning) => warning.includes("真实场次")));
  const late = buildItinerary(
    [activity({ category: "演出", duration: "2 小时" })],
    { ...options, startTime: "20:30" },
  );
  assert.equal(late.stops[0].start, "2026-11-14T20:30");
});

test("calendar dates roll over midnight and year boundaries", () => {
  const result = buildItinerary([activity({ duration: "2 小时" })], {
    ...options,
    date: "2026-12-31",
    startTime: "23:30",
  });
  assert.equal(result.stops[0].end, "2027-01-01T01:30");
  assert.ok(result.warnings.some((warning) => warning.includes("跨到次日")));
  const calendar = createCalendar([activity({ duration: "2 小时" })], {
    ...options,
    date: "2026-12-31",
    startTime: "23:30",
  });
  assert.match(calendar, /DTSTART;TZID=Asia\/Shanghai:20261231T233000/);
  assert.match(calendar, /DTEND;TZID=Asia\/Shanghai:20270101T013000/);
  assert.match(calendar, /STATUS:TENTATIVE/);
});

test("calendar escapes delimiters and newlines, folds UTF-8 lines to 75 octets", () => {
  const calendar = createCalendar(
    [
      activity({
        title: "看展,听歌;周末\\计划\n下一行",
        location: "上海".repeat(60),
      }),
    ],
    options,
  );
  const unfolded = calendar.replace(/\r\n /g, "");
  assert.ok(unfolded.includes("SUMMARY:看展\\,听歌\\;周末\\\\计划\\n下一行"));
  assert.ok(unfolded.includes(`LOCATION:上海 · ${"上海".repeat(60)}`));
  assert.ok(unfolded.includes("TZID:Asia/Shanghai"));
  for (const line of calendar.split("\r\n"))
    assert.ok(Buffer.byteLength(line, "utf8") <= 75, `Too long: ${line}`);
  assert.ok(calendar.endsWith("END:VCALENDAR\r\n"));
});

test("empty calendar stays valid and contains no events", () => {
  const calendar = createCalendar([], options);
  assert.ok(calendar.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(!calendar.includes("BEGIN:VEVENT"));
});

test("rain and cross-city plans are warned about without silently removing chosen items", () => {
  const result = buildItinerary(
    [activity({ indoor: false }), activity({ id: "hangzhou", city: "杭州" })],
    { ...options, weather: "下雨" },
  );
  assert.equal(result.stops.length, 2);
  assert.ok(result.warnings.some((warning) => warning.includes("室外活动")));
  assert.ok(result.warnings.some((warning) => warning.includes("跨城市")));
});

test("incomplete date and time fall back safely with an explicit warning", () => {
  const result = buildItinerary([activity()], {
    ...options,
    date: "2026-02-30",
    startTime: "25:80",
  });
  assert.match(result.stops[0].start, /^\d{4}-\d{2}-\d{2}T10:00$/);
  assert.ok(result.warnings.some((warning) => warning.includes("格式不完整")));
});

test("brief parser extracts city, rain, couple, budget and exhibition without claiming a model call", () => {
  const result = parseBrief("上海下雨，两个人预算100元，想看展");
  assert.equal(result.city, "上海");
  assert.equal(result.weather, "下雨");
  assert.equal(result.people, 2);
  assert.equal(result.budget, 100);
  assert.equal(result.category, "展览");
  assert.ok(
    result.recognized.some((item) => item.includes("单项活动人均预算")),
  );
});

test("brief parser handles free outings, Chinese amounts, ranges and solo travel", () => {
  const free = parseBrief("杭州，一个人想免费散步");
  assert.equal(free.budget, 0);
  assert.equal(free.people, 1);
  assert.equal(free.category, "户外");
  assert.equal(
    parseBrief("北京三五好友，预算一百五十元看音乐现场").budget,
    150,
  );
  assert.equal(parseBrief("北京三五好友，预算一百五十元看音乐现场").people, 4);
  assert.equal(parseBrief("预算50到100元逛市集").budget, 100);
  assert.equal(parseBrief("预算不限，听演出").budget, 999);
  assert.equal(parseBrief("100以内看展").budget, 100);
  assert.equal(parseBrief("预算100元").budget, 100);
  assert.equal(parseBrief("预算100元，但只想参加免费活动").budget, 0);
});

test("brief parser avoids turning negated rain or outdoors into preferences", () => {
  const result = parseBrief("不下雨，不想去户外，想看展", "上海");
  assert.equal(result.weather, undefined);
  assert.equal(result.category, "展览");
  assert.equal(result.city, "上海");
  assert.equal(parseBrief("12人一起出发").people, undefined);
});

test("brief parser preserves explicit dates and reports unsupported requests", () => {
  assert.equal(parseBrief("2026-11-22 上海散步").date, "2026-11-22");
  const unknown = parseBrief("给我一种奇妙的心情");
  assert.deepEqual(unknown.recognized, []);
  assert.ok(unknown.unrecognized);
  assert.equal(parseBrief("搜索：江边日落").query, "江边日落");
});
