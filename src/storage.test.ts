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
