import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeSnapshot } from "./storage";
test("corrupt storage is safe and unknown activities are discarded", () => {
  assert.deepEqual(sanitizeSnapshot(null).plan, []);
  const result = sanitizeSnapshot({
    plan: ["sh-gallery", "broken", "hz-gallery", "sh-gallery"],
    favorites: ["bad", "sh-nature"],
    entries: [null, { id: "bad", date: "wrong" }],
    teams: [
      {
        id: "a",
        activityId: "sh-market",
        date: "2026-11-14T10:00",
        members: 99,
        capacity: 4,
      },
    ],
  });
  assert.deepEqual(result.plan, ["sh-gallery"]);
  assert.deepEqual(result.favorites, ["sh-nature"]);
  assert.equal(result.entries.length, 0);
  assert.equal(result.teams[0].members, 4);
});
test("legacy records survive migration without accepting remote photo URLs", () => {
  const result = sanitizeSnapshot({
    entries: [
      {
        id: "one",
        activityId: "sh-gallery",
        date: "2026-11-14T10:00",
        text: "快乐",
        photo: "https://untrusted.example/image.jpg",
      },
    ],
    guides: [
      {
        id: "g",
        title: "周末",
        text: "路线",
        image: "https://untrusted.example/image.jpg",
      },
    ],
  });
  assert.equal(result.entries[0].text, "快乐");
  assert.equal(result.entries[0].photo, undefined);
  assert.match(
    result.guides[0].image,
    /weekend-city-guide\/images\/nature.jpg/,
  );
});

test("weather source mode survives backup sanitization and unknown modes fall back to live", () => {
  for (const weatherMode of ["live", "scenario"] as const) {
    const backup = JSON.parse(
      JSON.stringify({
        preferences: {
          city: "杭州",
          category: "展览",
          budget: 50,
          people: 2,
          weather: "下雨",
          weatherMode,
        },
      }),
    );
    const restored = sanitizeSnapshot(backup);
    assert.equal(restored.preferences?.weatherMode, weatherMode);
    assert.equal(restored.preferences?.weather, "下雨");
    assert.equal(
      sanitizeSnapshot(restored).preferences?.weatherMode,
      weatherMode,
    );
  }
  for (const weatherMode of [
    undefined,
    null,
    "automatic",
    { mode: "scenario" },
  ]) {
    assert.equal(
      sanitizeSnapshot({ preferences: { weatherMode } }).preferences
        ?.weatherMode,
      "live",
    );
  }
});

test("seven-person plans retain their size through a backup round trip", () => {
  const backup = JSON.parse(
    JSON.stringify({
      plan: ["sh-gallery", "sh-nature"],
      preferences: {
        city: "上海",
        category: "全部",
        budget: 100,
        weather: "多云",
        weatherMode: "scenario",
        people: 7,
      },
      planOptions: {
        date: "2026-11-14",
        startTime: "10:00",
        budget: 150,
        mealBudget: 30,
        transportBudget: 15,
        weather: "多云",
        people: 7,
      },
    }),
  );
  const restored = sanitizeSnapshot(backup);
  assert.equal(restored.preferences?.people, 7);
  assert.equal(restored.planOptions?.people, 7);
  assert.deepEqual(restored.plan, ["sh-gallery", "sh-nature"]);
});

test("manual team relay keeps confirmed and withdrawn versions plus the recipient identity across backup", () => {
  const member = {
    id: "member-a",
    name: "测试昵称",
    status: "withdrawn",
    revision: 2,
    updatedAt: "2026-11-10T09:00:00.000Z",
  };
  const team = {
    id: "team-a",
    activityId: "sh-gallery",
    date: "2026-12-19T10:00",
    capacity: 3,
    members: 3,
    host: true,
    joined: true,
    confirmedMembers: [member],
  };
  const saved = sanitizeSnapshot({
    teams: [
      team,
      { ...team, id: "recipient", host: false, myResponse: member },
    ],
  });
  assert.equal(saved.teams[0].members, 1);
  assert.deepEqual(saved.teams[0].confirmedMembers, [member]);
  assert.deepEqual(saved.teams[1].myResponse, member);
  assert.equal(saved.teams[1].joined, false);
  assert.deepEqual(sanitizeSnapshot(JSON.parse(JSON.stringify(saved))), saved);
});

test("corrupt relay storage is bounded, deduplicated by newest version and never overfills capacity", () => {
  const member = {
    id: "a",
    name: "测试昵称",
    status: "confirmed",
    revision: 1,
    updatedAt: "2026-11-10T09:00:00.000Z",
  };
  const saved = sanitizeSnapshot({
    teams: [
      {
        id: "team-a",
        activityId: "sh-gallery",
        date: "2026-12-19T10:00",
        capacity: 2,
        members: 12,
        host: true,
        myResponse: { bad: true },
        confirmedMembers: [
          null,
          member,
          { ...member, revision: 2, status: "withdrawn" },
          { ...member, id: "b" },
          { ...member, id: "c" },
          { ...member, id: "bad", revision: -1 },
        ],
      },
    ],
  });
  assert.equal(saved.teams[0].members, 2);
  assert.equal(saved.teams[0].myResponse, undefined);
  assert.deepEqual(
    saved.teams[0].confirmedMembers?.map((member) => [
      member.id,
      member.status,
    ]),
    [
      ["a", "withdrawn"],
      ["b", "confirmed"],
    ],
  );
});

test("legacy organizer counts without actual receipts never become confirmed attendees", () => {
  const original = {
    id: "legacy-team",
    activityId: "sh-gallery",
    date: "2026-12-19T10:00",
    capacity: 4,
    members: 3,
  };
  const saved = sanitizeSnapshot({
    teams: [
      { ...original, host: true },
      { ...original, id: "example-team", host: false },
    ],
  });
  assert.equal(saved.teams[0].members, 1);
  assert.equal(saved.teams[0].confirmedMembers, undefined);
  assert.equal(saved.teams[1].members, 3);
});
