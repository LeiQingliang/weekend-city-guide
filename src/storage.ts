import {
  activities,
  categories,
  type City,
  type Category,
  type Weather,
} from "./data";
import { asset } from "./paths";
import {
  sanitizeRelayMember,
  sanitizeRelayMembers,
  type RelayMember,
} from "./teamRelay";
export const STORAGE_KEY = "chumenla-weekend-v1";
export type StoredTeam = {
  id: string;
  activityId: string;
  title: string;
  date: string;
  capacity: number;
  members: number;
  joined: boolean;
  host: boolean;
  meeting: string;
  note: string;
  confirmedMembers?: RelayMember[];
  myResponse?: RelayMember;
};
export type StoredEntry = {
  id: string;
  activityId: string;
  title: string;
  text: string;
  mood: string;
  date: string;
  photo?: string;
};
export type StoredGuide = {
  id: string;
  title: string;
  text: string;
  city: string;
  image: string;
  author: string;
  local?: boolean;
};
export type Preferences = {
  city: City;
  category: Category;
  budget: number;
  people: number;
  weather: Weather;
  weatherMode?: "live" | "scenario";
};
export type Snapshot = {
  version: 2;
  favorites: string[];
  plan: string[];
  teams: StoredTeam[];
  entries: StoredEntry[];
  guides: StoredGuide[];
  preferences?: Preferences;
  planOptions?: Record<string, unknown>;
};
const ids = new Set(activities.map((a) => a.id));
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max: number) =>
  typeof v === "string" ? v.slice(0, max) : "";
const validDate = (v: unknown) =>
  typeof v === "string" && v.length <= 35 && Number.isFinite(Date.parse(v));
const numeric = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.max(min, Math.min(max, v))
    : fallback;
export function sanitizeSnapshot(value: unknown): Snapshot {
  const s = record(value) ? value : {};
  const list = (key: string) =>
    Array.isArray(s[key]) ? (s[key] as unknown[]).slice(0, 200) : [];
  const cleanIds = (key: string) => [
    ...new Set(
      list(key).filter(
        (id): id is string => typeof id === "string" && ids.has(id),
      ),
    ),
  ];
  const plan = cleanIds("plan");
  const planCity = activities.find((a) => a.id === plan[0])?.city;
  const teams = list("teams")
    .filter(record)
    .filter(
      (t) =>
        ids.has(String(t.activityId)) &&
        validDate(t.date) &&
        typeof t.id === "string",
    )
    .map((t) => {
      const capacity = Math.round(numeric(t.capacity, 2, 12, 4));
      const confirmedMembers = Array.isArray(t.confirmedMembers)
        ? sanitizeRelayMembers(t.confirmedMembers, capacity)
        : undefined;
      const myResponse = sanitizeRelayMember(t.myResponse);
      return {
        id: text(t.id, 80),
        activityId: String(t.activityId),
        title: text(t.title, 60) || "周末探索小队",
        date: String(t.date),
        capacity,
        members: t.host
          ? 1 +
            (confirmedMembers || []).filter(
              (member) => member.status === "confirmed",
            ).length
          : Math.round(numeric(t.members, 1, capacity, 1)),
        joined: myResponse ? myResponse.status === "confirmed" : !!t.joined,
        host: !!t.host,
        meeting: text(t.meeting, 100),
        note: text(t.note, 500),
        confirmedMembers,
        myResponse,
      };
    });
  const entries = list("entries")
    .filter(record)
    .filter(
      (e) =>
        ids.has(String(e.activityId)) &&
        validDate(e.date) &&
        typeof e.id === "string",
    )
    .map((e) => ({
      id: text(e.id, 80),
      activityId: String(e.activityId),
      title: text(e.title, 100),
      text: text(e.text, 1200),
      mood: text(e.mood, 40),
      date: String(e.date),
      photo:
        typeof e.photo === "string" &&
        /^data:image\/(jpeg|png|webp);base64,/.test(e.photo) &&
        e.photo.length < 1500000
          ? e.photo
          : undefined,
    }));
  const guides = list("guides")
    .filter(record)
    .filter(
      (g) =>
        typeof g.id === "string" &&
        typeof g.title === "string" &&
        typeof g.text === "string",
    )
    .map((g) => ({
      id: text(g.id, 80),
      title: text(g.title, 80),
      text: text(g.text, 1200),
      city: text(g.city, 40),
      image: asset("nature.jpg"),
      author: "我",
      local: true,
    }));
  const p = record(s.preferences) ? s.preferences : null;
  const preferences = p
    ? {
        city: (["上海", "杭州", "北京"].includes(String(p.city))
          ? p.city
          : "上海") as City,
        category: (categories.includes(p.category as Category)
          ? p.category
          : "全部") as Category,
        budget: numeric(p.budget, 0, 999, 100),
        people: Math.round(numeric(p.people, 1, 12, 2)),
        weather: (["晴天", "多云", "下雨"].includes(String(p.weather))
          ? p.weather
          : "多云") as Weather,
        weatherMode: (p.weatherMode === "scenario" ? "scenario" : "live") as
          | "live"
          | "scenario",
      }
    : undefined;
  return {
    version: 2,
    favorites: cleanIds("favorites"),
    plan: plan.filter(
      (id) => activities.find((a) => a.id === id)?.city === planCity,
    ),
    teams,
    entries,
    guides,
    preferences,
    planOptions: record(s.planOptions) ? s.planOptions : undefined,
  };
}
export function downloadJSON(data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `出门啦-我的周末-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
