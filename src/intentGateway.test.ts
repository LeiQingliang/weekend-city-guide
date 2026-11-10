import test from "node:test";
import assert from "node:assert/strict";
import { defaultWeekendBrief } from "./curation";
import { intentEndpoint, modelRevision } from "./intentGateway";

test("model patches preserve prior conditions and retain unknown requirements without mutating input", () => {
  const base = defaultWeekendBrief("上海");
  const original = JSON.stringify(base);
  const result = modelRevision(base, {
    patch: { people: 3, budget: 80, indoorOnly: true },
    unresolved: ["轮椅无障碍情况需核实"],
  });
  assert.equal(result.brief.people, 3);
  assert.equal(result.brief.date, base.date);
  assert.equal(result.brief.maxDurationMinutes, base.maxDurationMinutes);
  assert.equal(result.changes.length, 3);
  assert.deepEqual(result.unresolved, ["轮椅无障碍情况需核实"]);
  assert.equal(JSON.stringify(base), original);
});
test("invalid model fields, dates, amounts and actions reject the entire patch", () => {
  const base = defaultWeekendBrief("上海");
  for (const patch of [
    { people: 13 },
    { budget: -1 },
    { date: "2026-02-30" },
    { startTime: "25:00" },
    { city: "广州" },
    { maxDurationMinutes: 35 },
    { interests: ["未知"] },
    { booking: "success" },
  ])
    assert.throws(() => modelRevision(base, { patch, unresolved: [] }));
  assert.throws(() =>
    modelRevision(base, { patch: { budget: 80 }, unresolved: "unknown" }),
  );
});
test("no actionable patch is blocked and an endpoint may never contain embedded credentials", () => {
  assert.equal(
    modelRevision(defaultWeekendBrief("上海"), {
      patch: {},
      unresolved: ["无法办理预约"],
    }).blocked,
    true,
  );
  for (const value of [
    "",
    "http://public.example/api/intent",
    "https://user:secret@example.com/api",
    "https://example.com/api?key=secret",
    "javascript:alert(1)",
  ])
    assert.equal(intentEndpoint(value), null);
  assert.equal(
    intentEndpoint("https://example.com/api/intent"),
    "https://example.com/api/intent",
  );
  assert.equal(
    intentEndpoint("http://127.0.0.1:8787/api/intent"),
    "http://127.0.0.1:8787/api/intent",
  );
});
