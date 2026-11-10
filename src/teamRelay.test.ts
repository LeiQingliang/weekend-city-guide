import test from "node:test";
import assert from "node:assert/strict";
import type { StoredTeam } from "./storage";
import { sanitizeSnapshot } from "./storage";
import {
  confirmedTeamSize,
  makeTeamReply,
  parseTeamReply,
  reviewTeamReply,
  teamReplyUrl,
  type TeamReply,
} from "./teamRelay";

const host: StoredTeam = {
  id: "test-team",
  activityId: "sh-gallery",
  title: "周末看展",
  date: "2026-12-19T10:00",
  capacity: 3,
  members: 1,
  joined: true,
  host: true,
  meeting: "正门",
  note: "",
};
const guest = (): StoredTeam => ({ ...host, host: false, joined: false });
const now = "2026-11-10T09:00:00.000Z";
function create(
  team = guest(),
  name = "测试昵称",
  status: "confirmed" | "withdrawn" = "confirmed",
) {
  const result = makeTeamReply(team, name, status, now);
  assert(result.ok, result.ok ? "" : result.error);
  return result;
}
function apply(team: StoredTeam, reply: TeamReply) {
  const result = reviewTeamReply(team, reply);
  assert(result.ok, result.ok ? "" : result.error);
  return result;
}
test("fresh recipient confirmation is a snapshot, and only explicit host import changes the roster", () => {
  const original = structuredClone(host);
  const result = create();
  assert.equal(result.nextTeam.myResponse?.name, "测试昵称");
  assert.equal(result.nextTeam.joined, true);
  assert.deepEqual(host, original);
  const preview = apply(host, result.reply);
  assert.equal(preview.kind, "add");
  assert.equal(preview.nextTeam.members, 2);
  assert.deepEqual(host, original);
});
test("reply links preserve the deployment base and survive a fresh browser JSON round trip", () => {
  const { reply } = create();
  const url = teamReplyUrl(
    reply,
    "https://leiqingliang.github.io/weekend-city-guide/?old=1#plan=old",
  );
  assert.equal(new URL(url).pathname, "/weekend-city-guide/");
  assert.equal(new URL(url).search, "");
  assert.match(new URL(url).hash, /^#reply=/);
  const parsed = parseTeamReply(url);
  assert(parsed.ok);
  assert.deepEqual(parsed.reply, reply);
  assert.deepEqual(parseTeamReply(new URL(url).hash), parsed);
  assert.deepEqual(parseTeamReply(JSON.stringify(reply)), parsed);
});
test("same receipt import is idempotent, including after storage restoration", () => {
  const result = create();
  const first = apply(host, result.reply).nextTeam;
  const restored = sanitizeSnapshot({ teams: [first] }).teams[0];
  const again = apply(restored, result.reply);
  assert.equal(again.kind, "duplicate");
  assert.equal(again.nextTeam.members, 2);
  assert.equal(again.nextTeam.confirmedMembers?.length, 1);
});
test("withdraw and reconfirm keep member identity, increment revision, and reject stale links", () => {
  const first = create();
  const imported = apply(host, first.reply).nextTeam;
  const restoredGuest = sanitizeSnapshot({ teams: [first.nextTeam] }).teams[0];
  const withdrawal = create(restoredGuest, "测试昵称", "withdrawn");
  assert.equal(withdrawal.reply.member.id, first.reply.member.id);
  assert.equal(withdrawal.reply.member.revision, 2);
  const withdrawn = apply(imported, withdrawal.reply).nextTeam;
  assert.equal(withdrawn.members, 1);
  assert.equal(reviewTeamReply(withdrawn, first.reply).ok, false);
  const reconfirmed = create(withdrawal.nextTeam);
  assert.equal(reconfirmed.reply.member.revision, 3);
  const active = apply(withdrawn, reconfirmed.reply).nextTeam;
  assert.equal(active.members, 2);
  assert.equal(reviewTeamReply(active, withdrawal.reply).ok, false);
  assert.equal(active.confirmedMembers?.length, 1);
});
test("withdrawal arriving before the original confirmation still blocks that stale confirmation", () => {
  const first = create();
  const withdrawal = create(first.nextTeam, "测试昵称", "withdrawn");
  const imported = apply(host, withdrawal.reply).nextTeam;
  assert.equal(imported.members, 1);
  assert.equal(reviewTeamReply(imported, first.reply).ok, false);
});
test("capacity is enforced for new confirmations and freed only after imported withdrawal", () => {
  const first = create();
  const second = create(guest(), "另一位测试者");
  const third = create(guest(), "第三位测试者");
  const full = apply(apply(host, first.reply).nextTeam, second.reply).nextTeam;
  assert.equal(full.members, 3);
  const blocked = reviewTeamReply(full, third.reply);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.match(blocked.error, /满员/);
  const renamed = create(first.nextTeam, "更新后的昵称");
  assert.equal(apply(full, renamed.reply).nextTeam.members, 3);
  const withdrawal = create(renamed.nextTeam, "更新后的昵称", "withdrawn");
  const available = apply(full, withdrawal.reply).nextTeam;
  assert.equal(apply(available, third.reply).nextTeam.members, 3);
});
test("receipts must match organizer, team, activity and exact departure", () => {
  const { reply } = create();
  for (const team of [
    guest(),
    { ...host, id: "other-team" },
    { ...host, activityId: "sh-market" },
    { ...host, date: "2026-12-20T10:00" },
  ]) {
    assert.equal(reviewTeamReply(team, reply).ok, false);
  }
});
test("same revision with changed content is a conflict, never a replacement", () => {
  const { reply } = create();
  const imported = apply(host, reply).nextTeam;
  for (const change of [
    { name: "different" },
    { status: "withdrawn" as const },
    { updatedAt: "2026-11-11T09:00:00.000Z" },
  ]) {
    assert.equal(
      reviewTeamReply(imported, {
        ...reply,
        member: { ...reply.member, ...change },
      }).ok,
      false,
    );
  }
});
test("malformed, oversized, unsupported and invalid calendar receipts fail safely", () => {
  const { reply } = create();
  for (const input of [
    "",
    "#reply=broken",
    "x".repeat(4097),
    "null",
    "[]",
    JSON.stringify({ ...reply, v: 2 }),
    JSON.stringify({ ...reply, date: "2026-02-31T10:00" }),
    JSON.stringify({ ...reply, activityId: "unknown" }),
    JSON.stringify({ ...reply, teamId: "../team" }),
    JSON.stringify({ ...reply, member: { ...reply.member, name: " " } }),
    JSON.stringify({ ...reply, member: { ...reply.member, revision: 0 } }),
    JSON.stringify({ ...reply, member: { ...reply.member, revision: 1.2 } }),
    JSON.stringify({
      ...reply,
      member: { ...reply.member, status: "approved" },
    }),
  ]) {
    assert.equal(parseTeamReply(input).ok, false, input.slice(0, 120));
  }
});
test("generation requires an explicit safe nickname and cannot invent a withdrawal or host response", () => {
  for (const name of ["", "  ", "名".repeat(21), "A\nB", "A\u202eB"])
    assert.equal(makeTeamReply(guest(), name, "confirmed", now).ok, false);
  assert.equal(makeTeamReply(host, "我", "confirmed", now).ok, false);
  assert.equal(makeTeamReply(guest(), "我", "withdrawn", now).ok, false);
  assert.equal(create(guest(), "  同行昵称  ").reply.member.name, "同行昵称");
});
test("legacy member numbers do not become fictitious confirmations", () => {
  const legacy = { ...host, members: 3 };
  assert.equal(confirmedTeamSize(legacy), 1);
  const next = apply(legacy, create().reply).nextTeam;
  assert.equal(next.members, 2);
  assert.equal(next.confirmedMembers?.length, 1);
});
