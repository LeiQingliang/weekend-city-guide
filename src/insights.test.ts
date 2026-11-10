import test from "node:test";
import assert from "node:assert/strict";
import {
  clearInsights,
  FEEDBACK_LABELS,
  INSIGHT_LABELS,
  INSIGHTS_CHANGE_EVENT,
  INSIGHTS_KEY,
  readInsights,
  recordFeedback,
  recordInsight,
  sanitizeInsights,
} from "./insights";

const stamp = "2026-11-10T04:00:00.000Z";
function withBrowser(
  run: (state: {
    values: Map<string, string>;
    events: Event[];
    calls: string[];
    fail: { get: boolean; set: boolean; remove: boolean };
  }) => void,
) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  const values = new Map<string, string>(),
    events: Event[] = [],
    calls: string[] = [];
  const fail = { get: false, set: false, remove: false };
  const storage = {
    getItem(key: string) {
      calls.push(`get:${key}`);
      if (fail.get) throw new Error("Storage disabled");
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      calls.push(`set:${key}`);
      if (fail.set) throw new Error("Quota exceeded");
      values.set(key, value);
    },
    removeItem(key: string) {
      calls.push(`remove:${key}`);
      if (fail.remove) throw new Error("Storage disabled");
      values.delete(key);
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: storage,
      dispatchEvent: (event: Event) => {
        events.push(event);
        return true;
      },
    },
  });
  try {
    run({ values, events, calls, fail });
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

test("sanitization keeps only known finite integer counts and discards all raw personal content", () => {
  const result = sanitizeInsights(
    {
      since: stamp,
      counts: {
        plan_adopted: 3,
        official_opened: 0,
        team_created: 2.5,
        checkin_saved: Infinity,
        guide_saved: -1,
        unknown: 42,
      },
      feedback: { fit: 2, budget: "5", interest: NaN, info: 1, secret: 42 },
      name: "Do not store me",
      location: "Private place",
      rawInput: "private text",
    },
    stamp,
  );
  assert.deepEqual(result, {
    since: stamp,
    counts: { plan_adopted: 3, official_opened: 0 },
    feedback: { fit: 2, info: 1 },
  });
  assert.equal(JSON.stringify(result).includes("private"), false);
});

test("corrupt structures or timestamps recover to an explicit empty current period", () => {
  for (const value of [
    null,
    undefined,
    [],
    "broken",
    { since: "invalid", counts: [], feedback: null },
  ])
    assert.deepEqual(sanitizeInsights(value, stamp), {
      since: stamp,
      counts: {},
      feedback: {},
    });
  assert.deepEqual(
    sanitizeInsights({ counts: Object.create({ plan_adopted: 100 }) }, stamp)
      .counts,
    {},
  );
});

test("repeated actions accumulate as action counts, preserve period and notify UI without payload", () =>
  withBrowser(({ values, events }) => {
    values.set(
      INSIGHTS_KEY,
      JSON.stringify({ since: stamp, counts: {}, feedback: {} }),
    );
    assert.equal(recordInsight("plan_adopted"), true);
    assert.equal(recordInsight("plan_adopted"), true);
    assert.equal(recordInsight("official_opened"), true);
    assert.equal(recordFeedback("fit"), true);
    assert.equal(recordFeedback("budget"), true);
    assert.deepEqual(readInsights(), {
      since: stamp,
      counts: { plan_adopted: 2, official_opened: 1 },
      feedback: { fit: 1, budget: 1 },
    });
    assert.equal(events.length, 5);
    assert(
      events.every(
        (event) => event.type === INSIGHTS_CHANGE_EVENT && !("detail" in event),
      ),
    );
  }));

test("all white-listed events and reasons are accepted; unknown runtime values touch no storage", () =>
  withBrowser(({ calls, events }) => {
    for (const event of Object.keys(INSIGHT_LABELS))
      assert.equal(recordInsight(event), true);
    for (const reason of Object.keys(FEEDBACK_LABELS))
      assert.equal(recordFeedback(reason), true);
    const previousCalls = calls.length,
      previousEvents = events.length;
    for (const unknown of [
      "purchase",
      "nickname",
      "toString",
      "__proto__",
      123,
      null,
      undefined,
      {},
      "fit",
    ])
      assert.equal(recordInsight(unknown), false);
    for (const unknown of ["plan_adopted", "other", "constructor", null, {}])
      assert.equal(recordFeedback(unknown), false);
    assert.equal(calls.length, previousCalls);
    assert.equal(events.length, previousEvents);
  }));

test("transient demo operations do not read, write, clear or signal real statistics", () =>
  withBrowser(({ values, calls, events }) => {
    const original = JSON.stringify({
      since: stamp,
      counts: { plan_shared: 7 },
      feedback: { fit: 4 },
    });
    values.set(INSIGHTS_KEY, original);
    for (const event of Object.keys(INSIGHT_LABELS))
      assert.equal(recordInsight(event, true), false);
    for (const reason of Object.keys(FEEDBACK_LABELS))
      assert.equal(recordFeedback(reason, true), false);
    assert.deepEqual(calls, []);
    assert.deepEqual(events, []);
    assert.equal(values.get(INSIGHTS_KEY), original);
  }));

test("reading malformed storage is safe and read-only; the next valid action repairs only the statistics key", () =>
  withBrowser(({ values, calls }) => {
    values.set(INSIGHTS_KEY, "{broken-json");
    values.set("chumenla-weekend-v1", "keep all plans");
    assert.deepEqual(readInsights().counts, {});
    assert.equal(values.get(INSIGHTS_KEY), "{broken-json");
    assert.equal(recordInsight("team_created"), true);
    assert.deepEqual(readInsights().counts, { team_created: 1 });
    assert.equal(values.get("chumenla-weekend-v1"), "keep all plans");
    assert(calls.every((call) => call.endsWith(INSIGHTS_KEY)));
  }));

test("quota and access failures preserve prior counts, never throw and do not emit false updates", () =>
  withBrowser(({ values, fail, events }) => {
    const original = JSON.stringify({
      since: stamp,
      counts: { plan_adopted: 2 },
      feedback: {},
    });
    values.set(INSIGHTS_KEY, original);
    fail.set = true;
    assert.equal(recordInsight("plan_adopted"), false);
    assert.equal(values.get(INSIGHTS_KEY), original);
    fail.get = true;
    assert.deepEqual(readInsights().counts, {});
    assert.equal(recordFeedback("fit"), false);
    fail.remove = true;
    assert.equal(clearInsights(), false);
    assert.deepEqual(events, []);
    assert.equal(values.get(INSIGHTS_KEY), original);
  }));

test("clearing statistics removes only its own key and notifies the subscribed UI", () =>
  withBrowser(({ values, events, calls }) => {
    values.set(
      INSIGHTS_KEY,
      JSON.stringify({
        since: stamp,
        counts: { plan_shared: 2 },
        feedback: { time: 1 },
      }),
    );
    values.set("chumenla-weekend-v1", "personal plan backup");
    values.set("unrelated", "keep me");
    assert.equal(clearInsights(), true);
    assert.equal(values.has(INSIGHTS_KEY), false);
    assert.equal(values.get("chumenla-weekend-v1"), "personal plan backup");
    assert.equal(values.get("unrelated"), "keep me");
    assert.deepEqual(calls, [`remove:${INSIGHTS_KEY}`]);
    assert.equal(events.length, 1);
  }));

test("counters stay at the safe integer limit rather than overflow into imprecise values", () =>
  withBrowser(({ values }) => {
    values.set(
      INSIGHTS_KEY,
      JSON.stringify({
        since: stamp,
        counts: { plan_shared: Number.MAX_SAFE_INTEGER },
        feedback: {},
      }),
    );
    assert.equal(recordInsight("plan_shared"), true);
    assert.equal(readInsights().counts.plan_shared, Number.MAX_SAFE_INTEGER);
  }));

test("module calls are safe without window or with a blocked localStorage getter", () => {
  assert.equal(typeof window, "undefined");
  assert.deepEqual(readInsights().counts, {});
  assert.equal(recordInsight("plan_adopted"), false);
  assert.equal(recordFeedback("fit"), false);
  assert.equal(clearInsights(), false);
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      get localStorage() {
        throw new Error("Denied");
      },
    },
  });
  try {
    assert.deepEqual(readInsights().feedback, {});
    assert.equal(recordInsight("plan_shared"), false);
    assert.equal(clearInsights(), false);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
