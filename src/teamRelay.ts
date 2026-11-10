import { activities } from "./data";
import type { StoredTeam } from "./storage";

export type RelayStatus = "confirmed" | "withdrawn";
export type RelayMember = {
  id: string;
  name: string;
  status: RelayStatus;
  revision: number;
  updatedAt: string;
};
export type TeamReply = {
  v: 1;
  teamId: string;
  activityId: string;
  date: string;
  member: RelayMember;
};
type Failure = { ok: false; error: string };
export type RelayReview =
  | Failure
  | {
      ok: true;
      kind: "add" | "update" | "withdraw" | "duplicate";
      message: string;
      nextTeam: StoredTeam;
    };
export const MAX_REPLY_LENGTH = 4096;
const validId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const validDate = (value: unknown): value is string => {
  if (
    typeof value !== "string" ||
    value.length > 35 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(
      value,
    )
  )
    return false;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= maxDay &&
    Number.isFinite(Date.parse(value))
  );
};
const validName = (value: unknown): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.trim().length <= 20 &&
  !/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(value);

export function sanitizeRelayMember(value: unknown): RelayMember | undefined {
  if (
    !record(value) ||
    !validId(value.id) ||
    !validName(value.name) ||
    !["confirmed", "withdrawn"].includes(String(value.status)) ||
    typeof value.revision !== "number" ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 1 ||
    value.revision > 1_000_000 ||
    !validDate(value.updatedAt)
  )
    return undefined;
  return {
    id: value.id,
    name: value.name.trim(),
    status: value.status as RelayStatus,
    revision: value.revision,
    updatedAt: value.updatedAt,
  };
}

export function sanitizeRelayMembers(
  value: unknown,
  capacity = 12,
): RelayMember[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, RelayMember>();
  for (const item of value.slice(0, 100)) {
    const member = sanitizeRelayMember(item);
    if (
      member &&
      (!unique.has(member.id) ||
        unique.get(member.id)!.revision < member.revision)
    )
      unique.set(member.id, member);
  }
  let confirmed = 0;
  return [...unique.values()].filter(
    (member) => member.status === "withdrawn" || ++confirmed < capacity,
  );
}

/** Counts only the organizer and explicitly imported confirmations, never demo counts. */
export function confirmedTeamSize(team: StoredTeam): number {
  return (
    1 +
    sanitizeRelayMembers(team.confirmedMembers, team.capacity).filter(
      (member) => member.status === "confirmed",
    ).length
  );
}

export function parseTeamReply(
  input: string,
): { ok: true; reply: TeamReply } | Failure {
  if (typeof input !== "string" || input.length > MAX_REPLY_LENGTH)
    return { ok: false, error: "回执链接过长，请让朋友重新生成。" };
  try {
    const trimmed = input.trim();
    const raw = trimmed.startsWith("{")
      ? trimmed
      : new URLSearchParams(
          new URL(trimmed, "https://reply.invalid/").hash.slice(1),
        ).get("reply");
    if (!raw || raw.length > MAX_REPLY_LENGTH) throw new Error();
    const value: unknown = JSON.parse(raw);
    if (
      !record(value) ||
      value.v !== 1 ||
      !validId(value.teamId) ||
      !activities.some((a) => a.id === value.activityId) ||
      !validDate(value.date)
    )
      throw new Error();
    const member = sanitizeRelayMember(value.member);
    if (!member) throw new Error();
    return {
      ok: true,
      reply: {
        v: 1,
        teamId: value.teamId,
        activityId: String(value.activityId),
        date: value.date,
        member,
      },
    };
  } catch {
    return { ok: false, error: "这份回执无法读取，请让朋友重新生成完整链接。" };
  }
}

export function teamReplyUrl(reply: TeamReply, base: string): string {
  const url = new URL(base);
  url.search = "";
  url.hash = new URLSearchParams({ reply: JSON.stringify(reply) }).toString();
  return url.toString();
}

export function makeTeamReply(
  team: StoredTeam,
  name: string,
  status: RelayStatus,
  now = new Date().toISOString(),
): { ok: true; reply: TeamReply; nextTeam: StoredTeam } | Failure {
  if (team.host)
    return { ok: false, error: "发起人已计入人数，无需给自己生成回执。" };
  if (!validName(name))
    return {
      ok: false,
      error: "请填写 1–20 字昵称，不要填写电话或其他联系方式。",
    };
  const previous = sanitizeRelayMember(team.myResponse);
  if (status === "withdrawn" && !previous)
    return { ok: false, error: "还没有需要撤回的参加回执。" };
  const member: RelayMember = {
    id: previous?.id || crypto.randomUUID(),
    name: name.trim(),
    status,
    revision: (previous?.revision || 0) + 1,
    updatedAt: now,
  };
  const parsed = parseTeamReply(
    JSON.stringify({
      v: 1,
      teamId: team.id,
      activityId: team.activityId,
      date: team.date,
      member,
    }),
  );
  if (!parsed.ok)
    return { ok: false, error: "小队信息或回执版本有误，请重新打开邀请。" };
  return {
    ok: true,
    reply: parsed.reply,
    nextTeam: { ...team, myResponse: member, joined: status === "confirmed" },
  };
}

/** Pure preview. Call again at confirmation time against the latest stored team. */
export function reviewTeamReply(
  team: StoredTeam,
  incoming: TeamReply,
): RelayReview {
  const parsed = parseTeamReply(JSON.stringify(incoming));
  if (!parsed.ok) return parsed;
  const reply = parsed.reply;
  if (!team.host)
    return {
      ok: false,
      error: "请在发起这个小队的浏览器中打开回执；此设备没有发起人记录。",
    };
  if (
    team.id !== reply.teamId ||
    team.activityId !== reply.activityId ||
    team.date !== reply.date
  )
    return {
      ok: false,
      error: "回执与这次活动或出发时间不一致，请重新发送当前邀请。",
    };
  const members = sanitizeRelayMembers(team.confirmedMembers, team.capacity);
  const previous = members.find((member) => member.id === reply.member.id);
  if (previous && previous.revision > reply.member.revision)
    return { ok: false, error: "这是一份旧回执，已保留较新的确认或撤回。" };
  if (previous && previous.revision === reply.member.revision) {
    if (
      previous.status !== reply.member.status ||
      previous.name !== reply.member.name ||
      previous.updatedAt !== reply.member.updatedAt
    )
      return { ok: false, error: "回执版本冲突，请让朋友重新生成。" };
    return {
      ok: true,
      kind: "duplicate",
      message: "这份回执已经导入，不会重复计入人数。",
      nextTeam: team,
    };
  }
  const active = members.filter(
    (member) => member.status === "confirmed",
  ).length;
  if (
    reply.member.status === "confirmed" &&
    previous?.status !== "confirmed" &&
    active + 1 >= team.capacity
  )
    return {
      ok: false,
      error: "小队已经满员，这份参加回执尚未导入。请先与朋友协调名额。",
    };
  if (!previous && members.length >= 100)
    return { ok: false, error: "这个小队的回执记录已满，请为新行程创建小队。" };
  const nextMembers = previous
    ? members.map((member) =>
        member.id === reply.member.id ? reply.member : member,
      )
    : [...members, reply.member];
  const kind =
    reply.member.status === "withdrawn"
      ? "withdraw"
      : previous
        ? "update"
        : "add";
  return {
    ok: true,
    kind,
    message:
      kind === "withdraw"
        ? "确认后撤回此人的参加名额，旧版本不会重新占位。"
        : "确认导入后，这位朋友才会计入本机名单。",
    nextTeam: {
      ...team,
      confirmedMembers: nextMembers,
      members:
        1 +
        nextMembers.filter((member) => member.status === "confirmed").length,
    },
  };
}
