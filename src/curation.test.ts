import test from "node:test";
import assert from "node:assert/strict";
import { activities } from "./data";
import { defaultPlanOptions, buildItinerary } from "./planner";
import {
  defaultWeekendBrief,
  explainWeekendConstraints,
  recommendWeekendProposals,
  type WeekendBrief,
} from "./curation";

const brief = (overrides: Partial<WeekendBrief> = {}): WeekendBrief => ({
  ...defaultWeekendBrief(
    "上海",
    {
      ...defaultPlanOptions,
      date: "2026-11-14",
      startTime: "13:00",
      budget: 100,
    },
    2,
    "多云",
  ),
  interests: ["展览"],
  ...overrides,
});

test("a full outing budget includes food and transport, with equality accepted", () => {
  const input = brief({ budget: 75 });
  const proposals = recommendWeekendProposals(input);
  assert.equal(proposals[0].totalPerPerson, 75);
  assert.ok(proposals[0].activityIds.includes("sh-gallery"));
  for (const proposal of proposals) {
    const activityTotal = proposal.activityIds.reduce(
      (sum, id) => sum + activities.find((item) => item.id === id)!.price,
      0,
    );
    assert.equal(proposal.totalPerPerson, activityTotal + 30 + 15);
    assert.ok(proposal.totalPerPerson <= input.budget);
    assert.equal(proposal.options.budget, input.budget);
  }
});

test("rain excludes outdoor activities and does not invent a second fitting proposal", () => {
  const proposals = recommendWeekendProposals(brief({ weather: "下雨" }));
  assert.equal(proposals.length, 1);
  assert.deepEqual(proposals[0].activityIds, ["sh-gallery"]);
  assert.ok(
    proposals[0].activityIds.every(
      (id) => activities.find((item) => item.id === id)!.indoor,
    ),
  );
  assert.ok(
    proposals[0].reasons.some((reason) =>
      reason.includes("转场仍建议带好雨具"),
    ),
  );
});

test("available time includes transfers and excludes evening waits that cannot fit", () => {
  const input = brief({
    budget: 200,
    startTime: "13:00",
    maxDurationMinutes: 180,
  });
  const proposals = recommendWeekendProposals(input);
  assert.ok(proposals.length > 0);
  assert.ok(proposals.every((proposal) => proposal.durationMinutes <= 180));
  assert.ok(
    proposals.every((proposal) => !proposal.activityIds.includes("sh-music")),
  );
  for (const proposal of proposals) {
    const scheduled = buildItinerary(
      proposal.activityIds.map(
        (id) => activities.find((item) => item.id === id)!,
      ),
      proposal.options,
    );
    assert.equal(proposal.durationMinutes, scheduled.totalMinutes);
  }
});

test("evening preferences can include a performance when its wait and cost fit", () => {
  const proposals = recommendWeekendProposals(
    brief({
      interests: ["演出"],
      budget: 200,
      startTime: "18:00",
      maxDurationMinutes: 180,
    }),
  );
  assert.deepEqual(proposals[0].activityIds, ["sh-music"]);
  assert.equal(proposals[0].durationMinutes, 180);
  assert.equal(proposals[0].totalPerPerson, 143);
  assert.ok(
    proposals[0].tradeoffs.some((reason) => reason.includes("真实场次")),
  );
});

test("too little full budget produces an explicit empty state rather than a fake free outing", () => {
  const input = brief({ budget: 40, interests: [] });
  assert.deepEqual(recommendWeekendProposals(input), []);
  assert.ok(
    explainWeekendConstraints(input).some(
      (reason) => reason.includes("¥45") && reason.includes("超过"),
    ),
  );
  assert.deepEqual(
    recommendWeekendProposals(brief({ budget: 100, maxDurationMinutes: 60 })),
    [],
  );
  assert.ok(
    explainWeekendConstraints(brief({ maxDurationMinutes: 60 })).some(
      (reason) => reason.includes("最短"),
    ),
  );
});

test("comparison returns at most two different stop sets, not duplicate reverse routes", () => {
  const proposals = recommendWeekendProposals(
    brief({ budget: 250, maxDurationMinutes: 480 }),
  );
  assert.ok(proposals.length > 0 && proposals.length <= 2);
  const keys = proposals.map((proposal) =>
    [...proposal.activityIds].sort().join("+"),
  );
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(
    proposals.every((proposal) =>
      proposal.activityIds.every((id) =>
        activities.some((item) => item.id === id),
      ),
    ),
  );
});

test("relaxed pace limits plans to one stop and leaves the input draft unchanged", () => {
  const input = brief({ pace: "relaxed", people: 7 });
  const before = JSON.stringify(input);
  const proposals = recommendWeekendProposals(input);
  assert.ok(proposals.every((proposal) => proposal.activityIds.length === 1));
  assert.ok(proposals.every((proposal) => proposal.options.people === 7));
  assert.equal(JSON.stringify(input), before);
  proposals[0].options.budget = 999;
  assert.equal(input.budget, 100);
});

test("invalid dates and impossible numerical values do not silently produce a plan", () => {
  assert.deepEqual(
    recommendWeekendProposals(brief({ date: "2026-02-30" })),
    [],
  );
  assert.deepEqual(
    recommendWeekendProposals(brief({ budget: Number.NaN })),
    [],
  );
  assert.deepEqual(recommendWeekendProposals(brief({ people: 0 })), []);
  assert.ok(
    explainWeekendConstraints(brief({ startTime: "25:99" }))[0].includes(
      "有效",
    ),
  );
});

test("companions change the top choice when interests and constraints are otherwise tied", () => {
  const solo = recommendWeekendProposals(
    brief({ interests: [], people: 1 }),
  )[0];
  const friends = recommendWeekendProposals(
    brief({ interests: [], people: 4 }),
  )[0];
  assert.deepEqual([...solo.activityIds].sort(), ["sh-gallery", "sh-nature"]);
  assert.deepEqual([...friends.activityIds].sort(), ["sh-market", "sh-nature"]);
  assert.ok(solo.reasons.some((reason) => reason.includes("自己的节奏")));
  assert.ok(
    friends.reasons.some(
      (reason) => reason.includes("4 人同行") && reason.includes("市集"),
    ),
  );
});

test("explicit interests outrank companion preferences and the budget remains per person", () => {
  const proposals = recommendWeekendProposals(
    brief({ interests: ["展览"], people: 4, budget: 100 }),
  );
  assert.ok(proposals[0].activityIds.includes("sh-gallery"));
  assert.equal(proposals[0].totalPerPerson, 75);
  assert.equal(proposals[0].options.budget, 100);
  for (const proposal of proposals) {
    assert.ok(proposal.totalPerPerson <= 100);
    assert.ok(
      proposal.reasons.some((reason) =>
        reason.includes(`4 人参考合计 ¥${proposal.totalPerPerson * 4}`),
      ),
    );
  }
});
