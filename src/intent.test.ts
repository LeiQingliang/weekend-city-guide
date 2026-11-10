import test from "node:test";
import assert from "node:assert/strict";
import { defaultWeekendBrief, type WeekendBrief } from "./curation";
import { reviseIntent } from "./intent";

const TODAY = "2026-11-10";
const base = (): WeekendBrief => ({
  ...defaultWeekendBrief("上海"),
  date: "2026-11-14",
  interests: ["展览"],
  startTime: "10:00",
});

test("multi-turn edits preserve previous conditions and exact party size", () => {
  const a = reviseIntent(
    base(),
    "杭州，三个人，周日，下午，预算一百五十，半天",
    TODAY,
  );
  assert.equal(a.blocked, false);
  assert.equal(a.brief.city, "杭州");
  assert.equal(a.brief.people, 3);
  assert.equal(a.brief.date, "2026-11-15");
  assert.equal(a.brief.startTime, "14:00");
  assert.equal(a.brief.budget, 150);
  assert.equal(a.brief.maxDurationMinutes, 240);
  assert.deepEqual(a.unresolved, []);
  const b = reviseIntent(a.brief, "缩短到两小时，不想看展，改去市集", TODAY);
  assert.equal(b.blocked, false);
  assert.equal(b.brief.maxDurationMinutes, 120);
  assert.equal(b.brief.city, "杭州");
  assert.equal(b.brief.people, 3);
  assert.deepEqual(b.brief.interests, ["市集"]);
  assert.deepEqual(b.brief.excludedInterests, ["展览"]);
  assert.equal(b.brief.startTime, "14:00");
});

test("explicit group total divides by this turn's party size regardless of token order", () => {
  for (const text of ["总预算300元，3人", "3人，总预算300元"]) {
    const result = reviseIntent(base(), text, TODAY);
    assert.equal(result.brief.budget, 100);
    assert.equal(result.brief.people, 3);
    assert.equal(result.blocked, false);
    assert(result.recognized.some((line) => line.includes("÷ 3人")));
  }
  assert.equal(reviseIntent(base(), "预算300", TODAY).brief.budget, 300);
  assert.equal(reviseIntent(base(), "人均100元", TODAY).brief.budget, 100);
  assert.equal(
    reviseIntent(base(), "总预算100元，3人", TODAY).brief.budget,
    100 / 3,
  );
});

test("free venues do not erase food/transport budget, zero total budget must be explicit", () => {
  const input = base();
  const free = reviseIntent(input, "免费", TODAY);
  assert.equal(free.blocked, true);
  assert.deepEqual(free.brief, input);
  assert(free.unresolved.some((line) => line.includes("餐饮交通")));
  const partial = reviseIntent(input, "明天只室内，免费", TODAY);
  assert.equal(partial.blocked, false);
  assert.equal(partial.brief.budget, input.budget);
  assert.equal(partial.brief.indoorOnly, true);
  assert(partial.unresolved.length > 0);
  assert.equal(reviseIntent(input, "预算0元", TODAY).brief.budget, 0);
});

test("negation excludes interests, later explicit positive restores them", () => {
  const excluded = reviseIntent(base(), "不想看展和演出，只室内", TODAY);
  assert.deepEqual(excluded.brief.interests, []);
  assert.deepEqual(excluded.brief.excludedInterests, ["展览", "演出"]);
  assert.equal(excluded.brief.indoorOnly, true);
  const restored = reviseIntent(
    excluded.brief,
    "想去看展，室内外都可以",
    TODAY,
  );
  assert.deepEqual(restored.brief.interests, ["展览"]);
  assert.deepEqual(restored.brief.excludedInterests, ["演出"]);
  assert.equal(restored.brief.indoorOnly, false);
  const mixed = reviseIntent(base(), "想去市集不想看展", TODAY);
  assert.deepEqual(mixed.brief.interests, ["市集"]);
  assert.deepEqual(mixed.brief.excludedInterests, ["展览"]);
});

test("clock, duration, people, budget numbers remain separate", () => {
  const result = reviseIntent(
    base(),
    "北京，3人，14:30出发，玩3小时，人均80元",
    TODAY,
  );
  assert.equal(result.brief.people, 3);
  assert.equal(result.brief.startTime, "14:30");
  assert.equal(result.brief.maxDurationMinutes, 180);
  assert.equal(result.brief.budget, 80);
  assert.deepEqual(result.unresolved, []);
  for (const [text, expected] of [
    ["上午10点", "10:00"],
    ["下午两点半", "14:30"],
    ["14点", "14:00"],
    ["晚上八点", "20:00"],
  ]) {
    assert.equal(
      reviseIntent(base(), text, TODAY).brief.startTime,
      expected,
      text,
    );
  }
  const decimals = reviseIntent(base(), "三点五小时，预算一百点五", TODAY);
  assert.equal(decimals.blocked, false);
  assert.equal(decimals.brief.maxDurationMinutes, 210);
  assert.equal(decimals.brief.budget, 100.5);
  assert.equal(decimals.brief.startTime, "10:00");
});

test("Shanghai-relative dates include correct weekend and year rollover", () => {
  assert.equal(
    reviseIntent(base(), "明天", "2026-12-31").brief.date,
    "2027-01-01",
  );
  assert.equal(reviseIntent(base(), "周六", TODAY).brief.date, "2026-11-14");
  assert.equal(reviseIntent(base(), "下周日", TODAY).brief.date, "2026-11-22");
  assert.equal(
    reviseIntent(base(), "周六", "2026-11-14").brief.date,
    "2026-11-14",
  );
  assert.equal(
    reviseIntent(base(), "2026-11-20", TODAY).brief.date,
    "2026-11-20",
  );
});

test("unsupported access, travel, queue and return constraints remain unresolved", () => {
  const result = reviseIntent(
    base(),
    "杭州，少走路，无障碍，带狗，不排队，地铁30分钟，18点前回学校",
    TODAY,
  );
  assert.equal(result.blocked, false);
  assert.equal(result.brief.city, "杭州");
  assert.equal(result.brief.startTime, "10:00");
  assert.equal(result.brief.maxDurationMinutes, base().maxDurationMinutes);
  for (const word of ["步行", "无障碍", "宠物", "排队", "交通耗时", "返程"])
    assert(
      result.unresolved.some((line) => line.includes(word)),
      word,
    );
  const deadline = reviseIntent(base(), "周六，下午6点前回学校", TODAY);
  assert.equal(deadline.brief.startTime, "10:00");
  assert(deadline.unresolved.some((line) => line.includes("返程")));
});

test("invalid fields reject the entire turn instead of quietly clamping", () => {
  const input = base();
  for (const text of [
    "杭州，13人",
    "杭州，0人",
    "杭州，2.5人",
    "杭州，预算-1",
    "杭州，预算100001",
    "杭州，半小时",
    "杭州，13小时",
    "杭州，30分钟",
    "杭州，25:00",
    "杭州，14:90",
    "杭州，2026-02-30",
    "杭州，2026-01-01",
    "杭州，总预算300，人均100",
    "杭州，预算一百五",
  ]) {
    const result = reviseIntent(input, text, TODAY);
    assert.equal(result.blocked, true, text);
    assert.deepEqual(result.brief, input, text);
    assert.deepEqual(result.changes, [], text);
    assert(result.unresolved.length > 0, text);
  }
});

test("valid numerical endpoints and decimal duration remain usable", () => {
  assert.equal(reviseIntent(base(), "1人，预算0，1小时", TODAY).blocked, false);
  const result = reviseIntent(base(), "12人，预算100000，12小时", TODAY);
  assert.equal(result.blocked, false);
  assert.equal(result.brief.people, 12);
  assert.equal(result.brief.maxDurationMinutes, 720);
  assert.equal(
    reviseIntent(base(), "1.5小时", TODAY).brief.maxDurationMinutes,
    90,
  );
});

test("unknown sentences and unsupported real-world actions do not mutate drafts", () => {
  for (const text of [
    "",
    "给我灵魂的自由",
    "广州",
    "帮我退款",
    "预算100然后帮我下单",
    "请帮我联系商家",
    "替我订票",
  ]) {
    const input = base(),
      result = reviseIntent(input, text, TODAY);
    assert.equal(result.blocked, true, text);
    assert.deepEqual(result.brief, input, text);
    assert(result.unresolved.length > 0, text);
  }
});

test("recognition of unchanged supported constraints is still successful", () => {
  const result = reviseIntent(base(), "上海", TODAY);
  assert.equal(result.blocked, false);
  assert.deepEqual(result.changes, []);
  assert.deepEqual(result.unresolved, []);
});

test("results and changes are independent of the caller's mutable objects", () => {
  const input = base(),
    before = structuredClone(input);
  Object.freeze(input.interests);
  Object.freeze(input);
  const result = reviseIntent(input, "3人，不想看展，市集，预算100", TODAY);
  assert.equal(result.blocked, false);
  assert.deepEqual(input, before);
  assert.notEqual(result.brief, input);
  assert.notEqual(result.brief.interests, input.interests);
  assert(
    result.changes.some(
      (change) =>
        change.label === "同行人数" &&
        change.before === "2人" &&
        change.after === "3人",
    ),
  );
  result.brief.interests.push("演出");
  assert.deepEqual(input, before);
});
