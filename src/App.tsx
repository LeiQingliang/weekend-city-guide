import { asset, siteUrl } from "./paths";
import Itinerary from "./components/Itinerary";
import Explorer from "./components/Explorer";
import ActivityDetails from "./components/ActivityDetails";
import ShareQr from "./components/ShareQr";
import { TeamRelay, TeamReplyPreview } from "./components/TeamRelay";
import { parseTeamReply, reviewTeamReply, type TeamReply } from "./teamRelay";
import type { StoredTeam } from "./storage";
import { recordInsight } from "./insights";
import WeatherPanel from "./components/WeatherPanel";
import { BriefComposer } from "./components/Experience";
import {
  ProposalPreview,
} from "./components/DiscoveryEdition";
import WeekendStudio from "./components/WeekendStudio";
import ProductGuide, { DemoJourneyBar } from "./components/ReviewerGuide";
import type { WeekendProposal, WeekendInterest } from "./curation";
import {
  buildItinerary,
  createRainAlternative,
  defaultPlanOptions,
  parseBrief,
  type PlanOptions,
} from "./planner";
import { sanitizeSnapshot, downloadJSON } from "./storage";
import { isDateString } from "./weather";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Bookmark,
  Check,
  Clock3,
  CloudSun,
  CloudRain,
  Compass,
  Footprints,
  Heart,
  MapPin,
  Map,
  Plus,
  Search,
  Send,
  Sparkles,
  Sun,
  Ticket,
  Users,
  X,
  Leaf,
  SlidersHorizontal,
  CalendarDays,
  Camera,
  Copy,
  BookOpen,
  Navigation,
  Trash2,
  Route,
  Coffee,
  ShoppingBag,
  Music,
} from "lucide-react";
import {
  activities,
  categories,
  recommend,
  type Activity,
  type City,
  type Category,
  type Weather,
} from "./data";

type View = "discover" | "itinerary" | "teams" | "journal" | "guides";
type Team = StoredTeam;
type Entry = {
  id: string;
  activityId: string;
  title: string;
  text: string;
  mood: string;
  date: string;
  photo?: string;
};
type Guide = {
  id: string;
  title: string;
  text: string;
  city: string;
  image: string;
  author: string;
  local?: boolean;
};
type Persisted = {
  favorites: string[];
  plan: string[];
  teams: Team[];
  entries: Entry[];
  guides: Guide[];
  preferences?: {
    city: City;
    category: Category;
    budget: number;
    weather: Weather;
    weatherMode?: "live" | "scenario";
    people: number;
  };
  planOptions?: PlanOptions;
};
const STORE = "chumenla-weekend-v1";
const nav = [
  { id: "discover", name: "发现周末", icon: Compass },
  { id: "itinerary", name: "周末计划", icon: Route },
  { id: "teams", name: "找个搭子", icon: Users },
  { id: "journal", name: "我的足迹", icon: Footprints },
  { id: "guides", name: "灵感攻略", icon: BookOpen },
] as const;
const guideSeeds: Guide[] = [
  {
    id: "g1",
    title: "把周末还给自己：一份低预算漫游清单",
    text: "不赶景点，只留一点时间给自己。\n\n09:30 找一家街角面包店，早餐预算 ¥20。\n10:30 走进一间免费开放的公共展馆，出发前确认开放时间。\n13:00 沿着河岸慢慢走，找一张长椅休息。\n15:00 用相机记录今天遇见的三种颜色。\n\n预算参考：餐饮 ¥50 + 交通 ¥10。带上水杯和充电宝，让行程留一点空白。",
    city: "城市通用",
    image: asset("nature.jpg"),
    author: "周末编辑部",
  },
  {
    id: "g2",
    title: "下雨也没关系，室内周末同样好玩",
    text: "雨天不用取消周末，把目的地换到室内。\n\n第一站：美术馆。提前查看官方开放和预约信息，给自己留 2 小时。\n第二站：街区书店。挑一本一直想读的书，找个窗边座位。\n第三站：室内音乐现场。确认演出场次、票价和退改规则。\n\n带好雨具，预留换乘时间。预算有限时，只选美术馆和书店，也能拥有一个完整的下午。",
    city: "城市通用",
    image: asset("gallery.jpg"),
    author: "周末编辑部",
  },
  {
    id: "g3",
    title: "第一次和新搭子出门，怎么不尴尬？",
    text: "选一个有共同兴趣的活动，比单纯约见面更轻松。\n\n① 先说清时间、集合地点和人均预算。\n② 初次见面选择白天、公共场所和方便到达的位置。\n③ 不强制拍照，不随意分享他人的个人信息。\n④ 费用各自支付，临时退出提前说明。\n⑤ 留下共同完成的小目标：找到一家喜欢的店，或拍到一张满意的照片。\n\n把邀请发给朋友，请对方生成参加回执发回。发起人确认导入后，名单才会更新；变更计划请另行通知。",
    city: "出发小贴士",
    image: asset("market.jpg"),
    author: "周末编辑部",
  },
];
const weekend = () => {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T10:00`;
};
const formatDate = (s: string) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? s
    : d.toLocaleString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};
const price = (n: number) => (n === 0 ? "免费" : `¥${n}`);
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function Empty({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: () => void;
}) {
  return (
    <div className="empty">
      <Compass size={40} />
      <h3>{title}</h3>
      <p>{detail}</p>
      {action && (
        <button className="primary" onClick={action}>
          去发现周末 <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}

function cleanOptions(input: unknown): PlanOptions {
  const x = (
    input && typeof input === "object" ? input : {}
  ) as Partial<PlanOptions>;
  const num = (v: unknown, f: number, min = 0, max = 10000) =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.min(max, Math.max(min, v))
      : f;
  return {
    ...defaultPlanOptions,
    date:
      typeof x.date === "string" && isDateString(x.date)
        ? x.date
        : defaultPlanOptions.date,
    startTime:
      typeof x.startTime === "string" &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(x.startTime)
        ? x.startTime
        : "10:00",
    budget: num(x.budget, 150),
    people: Math.round(num(x.people, 2, 1, 12)),
    mealBudget: num(x.mealBudget, 30),
    transportBudget: num(x.transportBudget, 15),
    activityCosts: x.activityCosts && typeof x.activityCosts === "object" && !Array.isArray(x.activityCosts)
      ? Object.fromEntries(Object.entries(x.activityCosts).filter(([id, value]) => activities.some(a => a.id === id) && typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10000))
      : {},
    weather: ["晴天", "多云", "下雨"].includes(String(x.weather))
      ? String(x.weather)
      : "多云",
  };
}
export default function Home() {
  const [view, setView] = useState<View>("discover"),
    [city, setCity] = useState<City>("上海"),
    [category, setCategory] = useState<Category>("全部"),
    [budget, setBudget] = useState(100),
    [weather, setWeather] = useState<Weather>("多云"),
    [people, setPeople] = useState<number>(2),
    [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]),
    [plan, setPlan] = useState<string[]>([]),
    [teams, setTeams] = useState<Team[]>([]),
    [entries, setEntries] = useState<Entry[]>([]),
    [guides, setGuides] = useState<Guide[]>([]),
    [ready, setReady] = useState(false);
  const [detail, setDetail] = useState<Activity | null>(null),
    [modal, setModal] = useState<
      "team" | "checkin" | "guide" | "plan" | "about" | "studio" | null
    >(null),
    [guideDetail, setGuideDetail] = useState<Guide | null>(null),
    [teamDetail, setTeamDetail] = useState<Team | null>(null),
    [toast, setToast] = useState(""),
    [onlySaved, setOnlySaved] = useState(false),
    [formActivity, setFormActivity] = useState(""),
    [formError, setFormError] = useState(""),
    [photo, setPhoto] = useState("");
  const [shareCard, setShareCard] = useState<{
    title: string;
    text: string;
    url: string;
  } | null>(null);
  const [planOptions, setPlanOptions] = useState<PlanOptions>({
    ...defaultPlanOptions,
  });
  const [recognized, setRecognized] = useState<string[]>([]),
    [scenarioRequest, setScenarioRequest] = useState(0);
  const [weatherMode, setWeatherMode] = useState<"live" | "scenario">("live");
  const [sharedPlan, setSharedPlan] = useState<{
    ids: string[];
    options: PlanOptions;
  } | null>(null);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    text: string;
    action: () => void;
  } | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [guideDraft, setGuideDraft] = useState<{
    title: string;
    text: string;
  } | null>(null);
  const [proposalPreview, setProposalPreview] =
    useState<WeekendProposal | null>(null);
  const [demo, setDemo] = useState(false);
  const [weatherSummary, setWeatherSummary] = useState("");
  const [teamReply, setTeamReply] = useState<TeamReply | null>(null);
  const [studioInspiration, setStudioInspiration] = useState<{ city?: City; weather?: Weather; interests?: WeekendInterest[] } | null>(null);
  const [demoStep, setDemoStep] = useState(0);
  const demoSnapshot = useRef<
    (Persisted & { view: View; query: string; onlySaved: boolean }) | null
  >(null);
  const backupInput = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    dialogRef = useRef<HTMLDivElement>(null);
  const notice = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3200);
  };
  useEffect(() => {
    let saved: Partial<Persisted> = {};
    try {
      const stored = localStorage.getItem(STORE);
      saved = stored
        ? (sanitizeSnapshot(
            JSON.parse(stored),
          ) as unknown as Partial<Persisted>)
        : {};
    } catch {}
    if (saved.preferences) {
      setCity(saved.preferences.city);
      setCategory(saved.preferences.category);
      setBudget(saved.preferences.budget);
      setWeather(saved.preferences.weather);
      setPeople(saved.preferences.people);
      setWeatherMode(saved.preferences.weatherMode || "live");
    }
    if (saved.planOptions) {
      const options = cleanOptions(saved.planOptions);
      setPlanOptions(options);
      setPeople(options.people);
    }
    setFavorites(Array.isArray(saved.favorites) ? saved.favorites : []);
    setPlan(Array.isArray(saved.plan) ? saved.plan : []);
    setEntries(Array.isArray(saved.entries) ? saved.entries : []);
    setGuides(Array.isArray(saved.guides) ? saved.guides : []);
    const seeds: Team[] = activities
      .filter((a) => a.category !== "户外")
      .map((a, i) => ({
        id: `t${i}`,
        activityId: a.id,
        title: [
          "周末一起看展，慢慢逛",
          "找几个搭子，一起逛吃",
          "把好心情留给音乐",
        ][i % 3],
        date: weekend(),
        capacity: 4,
        members: (i % 3) + 1,
        joined: false,
        host: false,
        meeting: a.location + "入口处",
        note: "轻松出发，费用自理，欢迎第一次参加的朋友。",
      }));
    let nextTeams = Array.isArray(saved.teams) ? saved.teams : seeds;
    const params = new URLSearchParams(
      location.hash.length > 1 ? location.hash.slice(1) : location.search,
    );
    if (params.has("plan")) {
      try {
        const incoming = JSON.parse(params.get("plan")!);
        const clean = sanitizeSnapshot({ plan: incoming.ids });
        if (clean.plan.length) {
          setSharedPlan({
            ids: clean.plan,
            options: cleanOptions(incoming.options),
          });
          setView("itinerary");
        } else notice("这份行程链接已失效，请让朋友重新分享");
      } catch {
        notice("这份行程链接无法读取，请让朋友重新分享");
      }
    }
    if (params.has("reply")) {
      const parsed = parseTeamReply(params.get("reply")!);
      if (parsed.ok) { setTeamReply(parsed.reply); setView("teams"); }
      else notice(parsed.error);
    }
    if (params.has("invite")) {
      try {
        const t = JSON.parse(params.get("invite")!);
        if (
          typeof t.id === "string" &&
          typeof t.title === "string" &&
          typeof t.date === "string" &&
          Number.isFinite(Date.parse(t.date)) &&
          typeof t.meeting === "string" &&
          typeof t.note === "string" &&
          Number.isInteger(t.capacity) &&
          t.capacity >= 2 &&
          t.capacity <= 12 &&
          activities.some((a) => a.id === t.activityId)
        ) {
          const invite: Team = {
            id: t.id,
            activityId: t.activityId,
            title: t.title.slice(0, 60),
            date: t.date,
            capacity: t.capacity,
            members: 1,
            joined: false,
            host: false,
            meeting: t.meeting.slice(0, 100),
            note: t.note.slice(0, 500),
          };
          const existing = nextTeams.find((x) => x.id === invite.id);
          if (!existing) nextTeams = [invite, ...nextTeams];
          setTeamDetail(existing || invite);
          setCity(activities.find((a) => a.id === t.activityId)!.city);
          setView("teams");
        }
      } catch {}
    }
    if (params.has("guide")) {
      try {
        const g = JSON.parse(params.get("guide")!);
        if (typeof g.title === "string" && typeof g.text === "string")
          setGuideDetail({
            id: "shared",
            title: g.title.slice(0, 80),
            text: g.text.slice(0, 1200),
            city: "朋友分享",
            image: asset("nature.jpg"),
            author: "周末探索者",
          });
      } catch {}
    }
    setTeams(nextTeams);
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready && !demo)
      try {
        localStorage.setItem(
          STORE,
          JSON.stringify({
            version: 2,
            favorites,
            plan,
            teams,
            entries,
            guides,
            preferences: {
              city,
              category,
              budget,
              weather,
              weatherMode,
              people,
            },
            planOptions,
          }),
        );
        setStorageError(false);
      } catch {
        setStorageError(true);
      }
  }, [
    favorites,
    plan,
    teams,
    entries,
    guides,
    ready,
    demo,
    city,
    category,
    budget,
    weather,
    weatherMode,
    people,
    planOptions,
  ]);
  useEffect(() => {
    if (ready) setPlanOptions((prev) => ({ ...prev, people }));
  }, [people, ready]);
  useEffect(() => {
    const incoming = () => {
      if (/(?:invite|guide|plan|reply)=/.test(location.hash)) location.reload();
    };
    window.addEventListener("hashchange", incoming);
    return () => window.removeEventListener("hashchange", incoming);
  }, []);
  const overlay = !!(
    detail ||
    modal ||
    guideDetail ||
    teamDetail ||
    shareCard ||
    sharedPlan ||
    teamReply ||
    proposalPreview ||
    confirmation
  );
  const close = () => {
    setDetail(null);
    setModal(null);
    setGuideDetail(null);
    setTeamDetail(null);
    setShareCard(null);
    setFormError("");
    setPhoto("");
    setSharedPlan(null);
    setTeamReply(null);
    setConfirmation(null);
    setEditingGuide(null);
    setGuideDraft(null);
    setProposalPreview(null);
    if (/(?:invite|guide|plan|reply)=/.test(location.hash))
      history.replaceState(null, "", siteUrl());
  };
  useEffect(() => {
    if (!overlay) return;
    const previous = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => dialogRef.current?.focus(), 10);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const items = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialogRef.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [overlay]);
  const results = useMemo(
    () =>
      onlySaved
        ? activities
            .filter((a) => favorites.includes(a.id))
            .map((a) => ({
              ...a,
              score: 0,
              reasons: [
                "已收藏，等一个想出发的周末",
                a.city + " · " + a.category,
              ],
            }))
        : recommend(activities, {
            city,
            category,
            budget,
            weather,
            people,
            query,
          }),
    [city, category, budget, weather, people, query, onlySaved, favorites],
  );
  const planned = plan
      .map((id) => activities.find((a) => a.id === id))
      .filter(Boolean) as Activity[],
    plannedTotal = planned.reduce((sum, a) => sum + a.price, 0);
  const switchView = (v: View) => {
    if (v === "itinerary" && planned.length) {
      setCity(planned[0].city);
      setWeather(planOptions.weather as Weather);
    }
    setView(v);
    setOnlySaved(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const toggleFavorite = (id: string) =>
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const addPlan = (a: Activity) => {
    if (plan.includes(a.id)) {
      notice("这个活动已经在你的周末里啦");
      return;
    }
    if (planned.length && planned[0].city !== a.city) {
      notice("请先清空当前行程，再规划另一座城市");
      return;
    }
    setPlan([...plan, a.id]);
    if (!plan.length) setPlanOptions((p) => ({ ...p, weather }));
    const estimate = buildItinerary([...planned, a], planOptions);
    notice(
      estimate.overBudget
        ? "已加入计划；总费用超出预算，去周末计划调整一下"
        : "已加入周末计划，可以安排时间与预算了",
    );
  };
  const openForm = (kind: "team" | "checkin" | "guide", a?: Activity) => {
    close();
    setFormActivity(
      a?.id ||
        planned[0]?.id ||
        activities.find((x) => x.city === city)?.id ||
        activities[0].id,
    );
    setModal(kind);
  };
  const planSummary = buildItinerary(planned, planOptions);
  const applyWeather = (next: Weather, forCity: City = city) => {
    setWeather(next);
    const planCity = activities.find((a) => a.id === plan[0])?.city;
    if (!planCity || planCity === forCity)
      setPlanOptions((p) => ({ ...p, weather: next }));
  };
  const setScenario = (next: Weather, forCity: City = city) => {
    applyWeather(next, forCity);
    setWeatherMode("scenario");
    setScenarioRequest((n) => n + 1);
  };
  const changePlanOptions = (next: PlanOptions) => {
    const normalized = cleanOptions(next);
    setPlanOptions(normalized);
    setPeople(normalized.people);
    if (normalized.weather !== weather)
      setScenario(normalized.weather as Weather);
  };
  const exportRecords = () =>
    downloadJSON({
      version: 2,
      exportedAt: new Date().toISOString(),
      favorites,
      plan,
      teams,
      entries,
      guides,
      preferences: { city, category, budget, weather, weatherMode, people },
      planOptions,
    });
  const restoreRecords = async (file?: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      notice("备份文件超过8 MB，请选择较小的文件");
      return;
    }
    try {
      const raw = JSON.parse(await file.text());
      if (
        !raw ||
        typeof raw !== "object" ||
        !["favorites", "entries", "guides", "plan"].some((key) =>
          Array.isArray(raw[key]),
        )
      )
        throw new Error();
      const restored = sanitizeSnapshot(raw);
      setConfirmation({
        title: "恢复这份周末备份？",
        text: `将替换本机的收藏、计划、${restored.entries.length} 条打卡与 ${restored.guides.length} 篇攻略。建议先导出当前记录。`,
        action: () => {
          setFavorites(restored.favorites);
          setPlan(restored.plan);
          setTeams(restored.teams);
          setEntries(restored.entries);
          setGuides(restored.guides);
          const options = cleanOptions(
            restored.planOptions || {
              ...defaultPlanOptions,
              ...restored.preferences,
            },
          );
          setPlanOptions(options);
          setPeople(options.people);
          setWeather(options.weather as Weather);
          setWeatherMode(restored.preferences?.weatherMode || "scenario");
          if (restored.preferences) {
            setCity(restored.preferences.city);
            setCategory(restored.preferences.category);
            setBudget(restored.preferences.budget);
          }
          if (restored.plan.length)
            setCity(activities.find((a) => a.id === restored.plan[0])!.city);
          notice("备份已恢复到当前设备");
        },
      });
      setModal(null);
    } catch {
      notice("备份格式无法识别，请选择出门啦导出的 JSON 文件");
    }
  };
  const applyBrief = (text: string) => {
    const result = parseBrief(text, city);
    if (result.city) setCity(result.city as City);
    if (result.category) setCategory(result.category as Category);
    if (result.budget !== undefined) {
      setBudget(result.budget);
    }
    if (result.people) setPeople(result.people as 1 | 2 | 4);
    if (result.weather)
      setScenario(result.weather as Weather, (result.city || city) as City);
    if (result.date) setPlanOptions((p) => ({ ...p, date: result.date! }));
    setQuery(result.query || "");
    setOnlySaved(false);
    setRecognized(
      result.recognized.length
        ? result.recognized
        : ["试试补充城市、金额、人数或天气"],
    );
  };
  const createQuickPlan = () => {
    if (
      planOptions.mealBudget + planOptions.transportBudget >
      planOptions.budget
    ) {
      notice("餐饮与交通预留已超过全天预算，请先到周末计划调整费用");
      return;
    }
    const available = recommend(activities, {
      city,
      category,
      budget,
      weather,
      people,
      query,
    });
    const allowance = Math.max(
      0,
      planOptions.budget - planOptions.mealBudget - planOptions.transportBudget,
    );
    let spent = 0;
    const picked: Activity[] = [];
    for (const a of available) {
      const estimate = buildItinerary([...picked, a], { ...planOptions, weather, people });
      if (
        a.category !== "演出" &&
        picked.length < 2 &&
        spent + a.price <= allowance &&
        !estimate.overBudget &&
        estimate.openingConflicts.length === 0 &&
        estimate.totalMinutes <= 300
      ) {
        picked.push(a);
        spent += a.price;
      }
    }
    if (!picked.length) {
      notice("当前预算、开放时间或半日时长没有合适组合，试试定制并调整条件");
      return;
    }
    const action = () => {
      setPlan(picked.map((a) => a.id));
      setPlanOptions((p) => ({ ...p, weather, people }));
      setView("itinerary");
      window.scrollTo({ top: 0, behavior: "smooth" });
      notice("已安排一份半日计划，时间和费用都可以继续调整");
    };
    if (plan.length)
      setConfirmation({
        title: "用这份灵感更新周末计划？",
        text: `将换成 ${picked.map((a) => a.title).join("、")}。原计划会被替换，已收藏和打卡不受影响。`,
        action,
      });
    else action();
  };
  const sharePlan = () => {
    if (!planned.length) return;
    recordInsight("plan_shared", demo);
    const url = new URL(siteUrl());
    url.hash = new URLSearchParams({
      plan: JSON.stringify({ ids: plan, options: planOptions }),
    }).toString();
    setShareCard({
      title: "把这份周末计划发给朋友",
      text: `${planned[0].city} · ${planOptions.date} · ${planned.length} 个活动\n参考总费用 ¥${planSummary.totalPerPerson}/人（含餐饮、交通预留）\n打开链接可查看并载入同一份计划。`,
      url: url.toString(),
    });
  };
  const movePlan = (id: string, direction: -1 | 1) =>
    setPlan((current) => {
      const i = current.indexOf(id);
      if (i < 0 || i + direction < 0 || i + direction >= current.length)
        return current;
      const next = [...current];
      [next[i], next[i + direction]] = [next[i + direction], next[i]];
      return next;
    });
  const swapRain = () => {
    const alternative = createRainAlternative(planned, planOptions, activities);
    if (!alternative) {
      notice("当前预算或时长没有合适的室内方案，可在定制中调整条件");
      return;
    }
    const nextOptions = { ...planOptions, activityCosts: Object.fromEntries(Object.entries(planOptions.activityCosts || {}).filter(([id]) => plan.includes(id) && alternative.some(a => a.id === id))) };
    const summary = buildItinerary(alternative, nextOptions);
    setConfirmation({
      title: "换成这份雨天备用计划？",
      text: `改为${alternative.map((a) => a.title).join("、")}。含餐饮交通参考 ¥${summary.totalPerPerson}/人，约 ${(summary.totalMinutes / 60).toFixed(1)} 小时。保留已有室内活动；没有合适替代的户外站点会减少，不强行增加消费。`,
      action: () => {
        setPlan(alternative.map((a) => a.id));
        setPlanOptions(nextOptions);
        notice("已更新雨天计划，预算和时间都重新算好了");
      },
    });
  };
  const reset = () => {
    setCategory("全部");
    setBudget(999);
    setQuery("");
    setOnlySaved(false);
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notice("已复制，可以发给朋友了");
    } catch {
      notice("请长按或选中下方内容复制");
    }
  };
  const shareTeam = (t: Team) => {
    const url = new URL(siteUrl());
    url.hash = new URLSearchParams({
      invite: JSON.stringify({
        id: t.id,
        activityId: t.activityId,
        title: t.title,
        date: t.date,
        capacity: t.capacity,
        meeting: t.meeting,
        note: t.note,
      }),
    }).toString();
    close();
    setShareCard({
      title: "把周末邀请发给朋友",
      text: `${t.title}\n${formatDate(t.date)} · ${t.meeting}\n邀请上限 ${t.capacity} 人 · 费用自理\n朋友确认后可生成回执发回，发起人导入后更新名单。`,
      url: url.toString(),
    });
  };
  const shareGuide = (g: Guide) => {
    const url = new URL(siteUrl());
    url.hash = new URLSearchParams({
      guide: JSON.stringify({
        title: g.title.slice(0, 80),
        text: g.text.slice(0, 1200),
      }),
    }).toString();
    close();
    setShareCard({
      title: "好攻略，值得一起分享",
      text: g.title,
      url: url.toString(),
    });
  };
  const submitTeam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      date = String(f.get("date"));
    if (new Date(date).getTime() < Date.now()) {
      setFormError("请选择未来的出发时间");
      return;
    }
    const t: Team = {
      id: uid(),
      activityId: formActivity,
      title: String(f.get("title")).trim(),
      date,
      capacity: Number(f.get("capacity")),
      members: 1,
      joined: true,
      host: true,
      meeting: String(f.get("meeting")).trim(),
      note: String(f.get("note")).trim(),
    };
    if (!t.title || !t.meeting) {
      setFormError("请填写队伍名称和集合地点");
      return;
    }
    setTeams([t, ...teams]);
    recordInsight("team_created", demo);
    setCity(activities.find((a) => a.id === formActivity)!.city);
    close();
    setView("teams");
    setTeamDetail(t);
    notice("你的周末小队已创建，邀请卡可以分享啦");
  };
  const submitEntry = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      a = activities.find((x) => x.id === formActivity)!;
    const entry: Entry = {
      id: uid(),
      activityId: a.id,
      title: a.title,
      text: String(f.get("text")).trim(),
      mood: String(f.get("mood")),
      date: new Date().toISOString(),
      photo,
    };
    if (!entry.text) {
      setFormError("写下一句话，留住今天的心情");
      return;
    }
    setEntries([entry, ...entries]);
    recordInsight("checkin_saved", demo);
    if (demo) setDemoStep(4);
    close();
    setView("journal");
    notice("打卡成功，又收藏了一段周末时光");
  };
  const submitGuide = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      title = String(f.get("title")).trim(),
      text = String(f.get("text")).trim();
    if (!title || text.length < 10) {
      setFormError("请填写标题，并至少写 10 个字的攻略");
      return;
    }
    const updated: Guide = {
      id: editingGuide?.id || uid(),
      title,
      text,
      city,
      image: asset("nature.jpg"),
      author: "我",
      local: true,
    };
    if (!editingGuide) recordInsight("guide_saved", demo);
    setGuides(
      editingGuide
        ? guides.map((g) => (g.id === editingGuide.id ? updated : g))
        : [updated, ...guides],
    );
    close();
    setView("guides");
    notice("攻略已保存，可生成链接分享给朋友");
  };
  const openStudio = () => {
    close();
    setStudioInspiration(null);
    setModal("studio");
  };
  const adoptProposal = (proposal: WeekendProposal) => {
    const action = () => {
      recordInsight("plan_adopted", demo);
      setPlan(proposal.activityIds);
      setPlanOptions(cleanOptions(proposal.options));
      setCity(activities.find((a) => a.id === proposal.activityIds[0])!.city);
      setPeople(proposal.options.people);
      setWeather(proposal.options.weather as Weather);
      setWeatherMode("scenario");
      setScenarioRequest((n) => n + 1);
      setOnlySaved(false);
      setView("itinerary");
      if (demo) setDemoStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      notice("周末提案已成为你的计划，时间、预算和顺序都可以调整");
    };
    close();
    if (plan.length && !demo)
      setConfirmation({
        title: "采用这份新的周末提案？",
        text: "将替换当前行程。你的收藏、打卡和攻略会保留。",
        action,
      });
    else action();
  };
  const startDemo = () => {
    if (!ready) return;
    if (demo) {
      openStudio();
      return;
    }
    demoSnapshot.current = {
      favorites,
      plan,
      teams,
      entries,
      guides,
      preferences: { city, category, budget, weather, weatherMode, people },
      planOptions,
      view,
      query,
      onlySaved,
    };
    close();
    setDemo(true);
    setDemoStep(0);
    setCity("上海");
    setCategory("全部");
    setBudget(100);
    setPeople(2);
    setWeather("晴天");
    setWeatherMode("scenario");
    setScenarioRequest((n) => n + 1);
    setPlan(["sh-gallery", "sh-nature"]);
    setPlanOptions({
      ...defaultPlanOptions,
      budget: 100,
      people: 2,
      weather: "晴天",
    });
    setQuery("");
    setOnlySaved(false);
    setView("itinerary");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const exitDemo = () => {
    const saved = demoSnapshot.current;
    close();
    if (saved) {
      setFavorites(saved.favorites);
      setPlan(saved.plan);
      setTeams(saved.teams);
      setEntries(saved.entries);
      setGuides(saved.guides);
      const p = saved.preferences!;
      setCity(p.city);
      setCategory(p.category);
      setBudget(p.budget);
      setWeather(p.weather);
      setPeople(p.people);
      setWeatherMode(p.weatherMode || "live");
      setPlanOptions(saved.planOptions!);
      setView(saved.view);
      setQuery(saved.query);
      setOnlySaved(saved.onlySaved);
    }
    setDemo(false);
    setDemoStep(0);
    demoSnapshot.current = null;
    notice("已退出体验，原有记录完整保留");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const uploadPhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("请选择图片文件");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError("请选择 5 MB 以内的照片");
      return;
    }
    const img = new Image(),
      url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas"),
        scale = Math.min(1, 1200 / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas
        .getContext("2d")!
        .drawImage(img, 0, 0, canvas.width, canvas.height);
      setPhoto(canvas.toDataURL("image/jpeg", 0.7));
      URL.revokeObjectURL(url);
      setFormError("");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setFormError("照片无法读取，请换一张");
    };
    img.src = url;
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="header">
        <div className="nav-wrap">
          <button
            className="brand"
            onClick={() => switchView("discover")}
            aria-label="出门啦首页"
          >
            <span className="brand-icon">
              <Navigation size={24} fill="currentColor" />
            </span>
            <span>
              出门啦<span className="brand-en">WEEKEND CLUB</span>
            </span>
          </button>
          <nav aria-label="主导航">
            {nav.map((n) => (
              <button
                key={n.id}
                className={view === n.id ? "nav-item active" : "nav-item"}
                aria-current={view === n.id ? "page" : undefined}
                onClick={() => switchView(n.id)}
              >
                <n.icon size={17} />
                {n.name}
                {n.id === "journal" && entries.length > 0 && (
                  <i>{entries.length}</i>
                )}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="reviewer-entry"
              onClick={() => setModal("about")}
            >
              <Compass size={15} />
              产品与运营
            </button>
            <label className="city-select">
              <MapPin size={16} />
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value as City);
                  if (view === "itinerary") {
                    setView("discover");
                    setOnlySaved(false);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                aria-label="选择城市"
              >
                <option>上海</option>
                <option>杭州</option>
                <option>北京</option>
              </select>
            </label>
            <button
              className="my-weekend"
              aria-label="我的周末"
              onClick={() => switchView("itinerary")}
            >
              <CalendarDays size={16} />
              <span className="my-weekend-text">我的周末</span>{plan.length > 0 && <b>{plan.length}</b>}
            </button>
          </div>
        </div>
      </header>
      <main className={`main${view === "discover" && plan.length ? " has-explorer-dock" : ""}`} id="main-content" tabIndex={-1}>
        {demo && (
          <DemoJourneyBar
            step={demoStep}
            onDecision={() => {
              setDemoStep(0);
              openStudio();
            }}
            onRain={() => {
              if (!planned.length) {
                openStudio();
                return;
              }
              close();
              const planCity = planned[0].city;
              setCity(planCity);
              setScenario("下雨", planCity);
              setView("itinerary");
              setDemoStep(1);
            }}
            onShare={() => {
              if (!planned.length) {
                openStudio();
                return;
              }
              close();
              setDemoStep(2);
              sharePlan();
            }}
            onCheckin={() => {
              setDemoStep(3);
              openForm("checkin", planned[0]);
            }}
            onExit={exitDemo}
          />
        )}
        {storageError && (
          <div className="storage-alert" role="alert">
            本机储存空间不足，最新修改还未保存。
            <button onClick={exportRecords}>先导出备份</button>
            ，再减少照片后重试。
          </div>
        )}
        {view === "itinerary" && (
          <Itinerary
            items={planned}
            options={planOptions}
            transient={demo}
            onOfficialOpen={() => recordInsight("official_opened", demo)}
            onOptionsChange={changePlanOptions}
            onRemove={(id) => setPlan(plan.filter((x) => x !== id))}
            onMove={movePlan}
            onExplore={() => switchView("discover")}
            onCustomize={openStudio}
            onShare={sharePlan}
            onTeam={(a) => openForm("team", a)}
            onCheckin={(a) => openForm("checkin", a)}
            onDetail={setDetail}
            onClear={() =>
              setConfirmation({
                title: "清空周末计划？",
                text: "仅清空当前计划，收藏、打卡和攻略都会保留。",
                action: () => setPlan([]),
              })
            }
            onRainSwap={swapRain}
          />
        )}
        <input
          ref={backupInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            void restoreRecords(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {view === "discover" && <Explorer
          city={city} category={category} budget={budget} weather={weather} people={people}
          query={query} onlySaved={onlySaved} favorites={favorites} plan={plan} options={planOptions}
          results={results} weatherSummary={weatherSummary}
          onCategory={(value) => { setCategory(value); setOnlySaved(false); }}
          onBudget={(value) => { setBudget(value); setOnlySaved(false); }}
          onWeather={setScenario} onQuery={setQuery} onSaved={() => setOnlySaved(!onlySaved)}
          onFavorite={toggleFavorite} onAdd={addPlan} onRemove={(id) => setPlan(plan.filter(p => p !== id))}
          onDetail={setDetail} onCustomize={openStudio} onTour={startDemo} onPreview={setProposalPreview}
          onPlan={() => switchView("itinerary")} onReset={reset}
          tools={<><BriefComposer onApply={applyBrief} recognized={recognized} onQuickPlan={createQuickPlan}/>
            {ready && <WeatherPanel city={city} date={planOptions.date} scenario={weather}
              scenarioRequest={scenarioRequest} mode={weatherMode} onModeChange={setWeatherMode}
              onWeatherChange={(next) => applyWeather(next)} onDateChange={(date) => setPlanOptions(p => ({...p,date}))}
              onSummaryChange={setWeatherSummary}/>}</>}
        />}
        {view === "teams" && (
          <>
            <PageHeading
              eyebrow="FIND YOUR WEEKEND PEOPLE"
              title="好玩的事，一起出发。"
              subtitle="从一个共同爱好开始，遇见同频的周末搭子。"
              action="发起一个小队"
              onAction={() => openForm("team")}
            />
            <div className="section-notice">
              <Users size={17} />
              <span>
                创建小队并分享邀请，朋友确认后把回执发回；导入回执，名单才会更新。示例小队仅用于了解流程。
              </span>
            </div>
            <div className="teams-grid">
              {teams
                .filter(
                  (t) =>
                    activities.find((a) => a.id === t.activityId)?.city ===
                    city,
                )
                .map((t) => {
                  const a = activities.find((x) => x.id === t.activityId)!;
                  return (
                    <article className="team-card" key={t.id}>
                      <div className="team-cover">
                        <img src={a.image} alt="活动氛围配图" />
                        <span className="image-category">
                          {t.host
                            ? "我发起的"
                            : /^t\d+$/.test(t.id)
                              ? "示例小队"
                              : t.myResponse?.status === "confirmed"
                                ? "已生成参加回执"
                                : t.myResponse?.status === "withdrawn" ? "已生成撤回回执" : "收到的邀请"}
                        </span>
                        <span className="team-count">
                          <Users size={14} />
                          {t.members} / {t.capacity} 人
                        </span>
                      </div>
                      <div className="team-body">
                        <span className="kicker">
                          {a.category} · {a.city}
                        </span>
                        <h3>{t.title}</h3>
                        <p>
                          <CalendarDays size={15} />
                          {formatDate(t.date)}
                        </p>
                        <p>
                          <MapPin size={15} />
                          {t.meeting}
                        </p>
                        <div className="team-footer">
                          <span>
                            <i className="avatar">{t.host ? "我" : "友"}</i>
                            {t.host ? "我发起的队伍" : /^t\d+$/.test(t.id) ? "示例探索小队" : "朋友发来的邀请"}
                          </span>
                          <button
                            className="outline"
                            onClick={() => setTeamDetail(t)}
                          >
                            看看小队 <ArrowUpRight size={14} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>
            {!teams.some(
              (t) =>
                activities.find((a) => a.id === t.activityId)?.city === city,
            ) && (
              <Empty
                title="这座城市的第一个小队，等你发起"
                detail="挑一个喜欢的活动，让这次出发多一个同行的人。"
              />
            )}
            <section className="gentle-note">
              <Leaf size={21} />
              <div>
                <h3>轻松同行，也照顾好自己</h3>
                <p>
                  初次见面选择白天和公共场所，提前确认预算与集合点。尊重每个人的节奏，临时退出记得说明。
                </p>
              </div>
            </section>
          </>
        )}
        {view === "journal" && (
          <>
            <PageHeading
              eyebrow="COLLECT MOMENTS, NOT THINGS"
              title="走过的路，都算数。"
              subtitle="把平凡的周末，存成属于自己的城市记忆。"
              action="记录一次打卡"
              onAction={() => openForm("checkin")}
            />
            <div className="journal-stats">
              <div>
                <strong>{entries.length.toString().padStart(2, "0")}</strong>
                <span>次周末打卡</span>
              </div>
              <div>
                <strong>
                  {new Set(
                    entries.map(
                      (e) =>
                        activities.find((a) => a.id === e.activityId)?.city,
                    ),
                  ).size
                    .toString()
                    .padStart(2, "0")}
                </strong>
                <span>座探索城市</span>
              </div>
              <div>
                <strong>{favorites.length.toString().padStart(2, "0")}</strong>
                <span>个心动收藏</span>
              </div>
              <div className="stats-motto">
                <Footprints size={36} />
                <p>
                  不赶路
                  <br />
                  去感受路。
                </p>
              </div>
            </div>
            {entries.length ? (
              <div className="journal-grid">
                {entries.map((e) => {
                  const a = activities.find((a) => a.id === e.activityId);
                  return (
                    <article className="journal-card" key={e.id}>
                      <img
                        src={e.photo || a?.image || asset("nature.jpg")}
                        alt={e.photo ? "我的打卡照片" : "活动氛围配图"}
                      />
                      <div>
                        <span className="kicker">
                          {formatDate(e.date)} · {e.mood}
                        </span>
                        <h3>{e.title}</h3>
                        <p className="pre-line">{e.text}</p>
                        <div className="journal-actions">
                          <span>
                            <MapPin size={13} />
                            {a?.city}
                          </span>
                          <button
                            className="journal-to-guide"
                            onClick={() => {
                              openForm("guide", a);
                              if (a) setCity(a.city);
                              setGuideDraft({
                                title:
                                  `${a?.city || city}周末｜${e.title}`.slice(
                                    0,
                                    60,
                                  ),
                                text: `这次的周末体验${e.text.length > 900 ? "（打卡节选）" : ""}\n${e.text.slice(0,900)}\n\n地点与交通\n${a?.location || "待补充"}\n${a?.transport || "待补充"}\n\n花费记录\n活动规划预留：¥${a?.price || 0}。我的实际花费：待补充。\n\n给下一位出发的人\n补充你的预约提醒、推荐时段或避坑建议。`,
                              });
                            }}
                          >
                            <BookOpen size={14} />
                            整理成攻略
                          </button>
                          <button
                            onClick={() => {
                              setConfirmation({
                                title: "删除这段周末记录？",
                                text: "照片和文字会从当前设备删除，其他打卡会保留。",
                                action: () => {
                                  setEntries(
                                    entries.filter((x) => x.id !== e.id),
                                  );
                                  notice("已删除这条打卡");
                                },
                              });
                            }}
                            aria-label={`删除${e.title}打卡`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <Empty
                title="你的第一段周末故事，从这里开始"
                detail="去看一场展、散一次步，然后写下今天最喜欢的瞬间。"
                action={() => switchView("discover")}
              />
            )}
            <p className="data-note">
              打卡、照片及收藏保存在当前浏览器。清除浏览器数据会删除这些记录。
            </p>
          </>
        )}
        {view === "guides" && (
          <>
            <PageHeading
              eyebrow="A LITTLE INSPIRATION GOES A LONG WAY"
              title="借一点灵感，过自己的周末。"
              subtitle="真实感受、实用路线，还有不必花很多钱的快乐。"
              action="写一篇攻略"
              onAction={() => openForm("guide")}
            />
            <div className="guide-grid">
              {[...guides, ...guideSeeds].map((g) => (
                <article className="guide-card" key={g.id}>
                  <button
                    className="guide-image"
                    onClick={() => setGuideDetail(g)}
                  >
                    <img src={g.image} alt="攻略氛围配图" />
                    <span>{g.local ? "我的攻略" : "编辑精选"}</span>
                  </button>
                  <div className="guide-body">
                    <span className="kicker">{g.city}</span>
                    <button
                      className="guide-title"
                      onClick={() => setGuideDetail(g)}
                    >
                      <h3>{g.title}</h3>
                    </button>
                    <p>{g.text.split("\n")[0]}</p>
                    <div className="guide-footer">
                      <span>
                        <i className="avatar">{g.local ? "我" : "编"}</i>
                        {g.author}
                      </span>
                      <button
                        onClick={() => shareGuide(g)}
                        aria-label={`分享${g.title}`}
                      >
                        <Send size={17} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="section-notice">
              <BookOpen size={17} />
              <span>
                你写的攻略保存在本机；通过分享链接，朋友可以直接打开阅读。
              </span>
            </div>
          </>
        )}
        <footer>
          <button
            className="brand footer-brand"
            onClick={() => switchView("discover")}
          >
            <Navigation size={18} />
            <span>出门啦</span>
          </button>
          <p>周末很短，快乐可以很长。</p>
          <div className="footer-links">
            <button onClick={exportRecords}>备份记录</button>
            <button onClick={() => backupInput.current?.click()}>
              恢复备份
            </button>
            <button onClick={() => setModal("about")}>
              作品说明 <ArrowUpRight size={14} />
            </button>
          </div>
        </footer>
      </main>

      {overlay && (
        <div
          className="overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className={`dialog ${detail ? "activity-dialog" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              detail?.title ||
              guideDetail?.title ||
              teamDetail?.title ||
              shareCard?.title ||
              "周末探索窗口"
            }
            tabIndex={-1}
            ref={dialogRef}
          >
            <div className="dialog-toolbar">
              <span>
                出门啦 /{" "}
                {detail
                  ? "活动详情"
                  : teamDetail
                    ? "同行小队"
                    : guideDetail
                      ? "灵感攻略"
                      : sharedPlan
                        ? "朋友的周末"
                        : "周末探索"}
              </span>
              <button
                className="dialog-close"
                aria-label="关闭窗口"
                onClick={close}
              >
                <X size={20} />
              </button>
            </div>
            {detail && <ActivityDetails activity={detail} people={people} selected={plan.includes(detail.id)} onAdd={() => addPlan(detail)} onTeam={() => openForm("team", detail)}/>}
            {teamReply && <TeamReplyPreview team={teams.find(t => t.id === teamReply.teamId)} reply={teamReply} onCancel={close} onConfirm={(incoming) => {
              const target=teams.find(t=>t.id===incoming.teamId);
              if (!target) { notice("请在发起这个小队的浏览器中打开回执"); return; }
              const review=reviewTeamReply(target,incoming);
              if (!review.ok) { notice(review.error); return; }
              setTeams(current=>current.map(t=>t.id===target.id ? review.nextTeam : t));
              close(); setTeamDetail(review.nextTeam); setView("teams"); notice(review.message);
            }}/>}
            {teamDetail &&
              (() => {
                const a = activities.find(
                  (x) => x.id === teamDetail.activityId,
                )!;
                return (
                  <div className="dialog-content">
                    <span className="kicker">BETTER TOGETHER · 邀请制小队</span>
                    <h2>{teamDetail.title}</h2>
                    <p className="dialog-description">
                      {a.title} · {a.city}
                    </p>
                    <div className="team-members">
                      <Users size={25} />
                      <div>
                        <b>
                          {teamDetail.members} / {teamDetail.capacity} 人
                        </b>
                        <p>
                          {teamDetail.capacity - teamDetail.members > 0
                            ? `还差 ${teamDetail.capacity - teamDetail.members} 位周末搭子`
                            : "小队满员啦"}
                        </p>
                      </div>
                    </div>
                    <div className="team-info">
                      <p>
                        <CalendarDays size={18} />
                        <span>{formatDate(teamDetail.date)}</span>
                      </p>
                      <p>
                        <MapPin size={18} />
                        <span>{teamDetail.meeting}</span>
                      </p>
                      <p>
                        <Ticket size={18} />
                        <span>活动参考 {price(a.price)} / 人，费用自理</span>
                      </p>
                    </div>
                    <div className="tips">
                      <b>队长想说</b>
                      <p>
                        {teamDetail.note || "轻松出发，一起发现城市的小惊喜。"}
                      </p>
                    </div>
                    <p className="data-note">
                      邀请与回执通过链接传递。朋友确认后把回执发回，发起人导入后更新名单；不提供实时同步。
                    </p>
                    <div className="dialog-actions">
                      <button
                        className="outline"
                        onClick={() => shareTeam(teamDetail)}
                      >
                        <Send size={16} />
                        分享邀请
                      </button>
                      {teamDetail.host ? (
                        <button
                          className="primary"
                          onClick={() => openForm("checkin", a)}
                        >
                          <Camera size={16} />
                          出发打卡
                        </button>
                      ) : null}
                    </div>
                    <TeamRelay team={teamDetail} example={/^t\d+$/.test(teamDetail.id)} baseUrl={siteUrl()} onChange={(next) => { setTeams(current => current.map(t => t.id === next.id ? next : t)); setTeamDetail(next); }} />
                    {teamDetail.host && (
                      <button
                        className="text-danger"
                        onClick={() => {
                          const target = teamDetail;
                          close();
                          setConfirmation({
                            title: "解散这个本机小队？",
                            text: "已发出的邀请卡是信息快照，不会自动失效。请自行通知朋友计划已变更。",
                            action: () => {
                              setTeams(teams.filter((t) => t.id !== target.id));
                              notice("已解散本机小队");
                            },
                          });
                        }}
                      >
                        解散这个小队
                      </button>
                    )}
                  </div>
                );
              })()}
            {guideDetail && (
              <div className="dialog-content">
                <span className="kicker">
                  {guideDetail.city} · {guideDetail.author}
                </span>
                <h2>{guideDetail.title}</h2>
                <img
                  className="guide-detail-image"
                  src={guideDetail.image}
                  alt="攻略氛围配图"
                />
                <div className="guide-text pre-line">{guideDetail.text}</div>
                <button className="outline full guide-to-plan" onClick={() => {
                  const inspiration = guideDetail;
                  close();
                  setStudioInspiration({
                    city: ["上海", "杭州", "北京"].includes(inspiration.city) ? inspiration.city as City : undefined,
                    interests: inspiration.id === "g1" ? ["户外"] : inspiration.id === "g2" ? ["展览"] : undefined,
                    weather: inspiration.id === "g2" ? "下雨" : undefined,
                  });
                  setModal("studio");
                }}>参考这份灵感，定制我的周末 <ArrowRight size={16}/></button>
                <button
                  className="primary full"
                  onClick={() => shareGuide(guideDetail)}
                >
                  <Send size={16} />
                  分享这份灵感
                </button>
                {guideDetail.local && (
                  <div className="dialog-actions">
                    <button
                      className="outline"
                      onClick={() => {
                        const target = guideDetail;
                        close();
                        setEditingGuide(target);
                        setCity(target.city as City);
                        setModal("guide");
                      }}
                    >
                      编辑这篇攻略
                    </button>
                    <button
                      className="outline"
                      onClick={() => {
                        const target = guideDetail;
                        close();
                        setConfirmation({
                          title: "删除这篇攻略？",
                          text: "本机保存的内容会被删除；已发出的分享链接仍能展示当时的内容快照。",
                          action: () =>
                            setGuides(guides.filter((g) => g.id !== target.id)),
                        });
                      }}
                    >
                      删除攻略
                    </button>
                  </div>
                )}
              </div>
            )}
            {shareCard && (
              <div className="dialog-content">
                <span className="icon-tile big">
                  <Send size={26} />
                </span>
                <h2>{shareCard.title}</h2>
                <p className="pre-line dialog-description">{shareCard.text}</p>
                <ShareQr url={shareCard.url} />
                <label className="field">
                  分享链接
                  <input
                    readOnly
                    value={shareCard.url}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <button
                  className="primary full"
                  onClick={() => copy(shareCard.text + "\n" + shareCard.url)}
                >
                  <Copy size={17} />
                  复制分享内容
                </button>
                <p className="data-note">
                  任何收到链接的人都可以查看，请勿在内容中填写私人联系方式。
                </p>
              </div>
            )}
            {modal === "team" && (
              <form className="dialog-content" onSubmit={submitTeam}>
                <span className="kicker">LET'S GO TOGETHER</span>
                <h2>发起一个周末小队</h2>
                <p className="dialog-description">
                  说清楚去哪、几点见，快乐就有了开头。
                </p>
                <label className="field">
                  一起去做什么
                  <select
                    value={formActivity}
                    onChange={(e) => setFormActivity(e.target.value)}
                  >
                    {activities.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.city} · {a.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  小队名称
                  <input
                    name="title"
                    required
                    maxLength={40}
                    placeholder="比如：周六一起看展，慢慢逛"
                  />
                </label>
                <div className="form-row">
                  <label className="field">
                    出发时间
                    <input
                      type="datetime-local"
                      name="date"
                      defaultValue={`${planOptions.date}T${planOptions.startTime}`}
                      required
                    />
                  </label>
                  <label className="field">
                    队伍人数
                    <select name="capacity" defaultValue="4">
                      {[2, 3, 4, 6, 8].map((n) => (
                        <option key={n} value={n}>
                          {n} 人（含自己）
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="field">
                  集合地点
                  <input
                    name="meeting"
                    required
                    maxLength={100}
                    placeholder="例如：场馆正门，地铁站 1 号口"
                  />
                </label>
                <label className="field">
                  想对搭子说
                  <textarea
                    name="note"
                    maxLength={500}
                    placeholder="是否需要预约、费用怎么分、有什么小期待…"
                    rows={3}
                  />
                </label>
                {formError && (
                  <p className="form-error" role="alert">
                    {formError}
                  </p>
                )}
                <p className="data-note">
                  创建后可分享邀请，朋友生成回执发回；导入后更新名单，不会自动发送消息。
                </p>
                <button className="primary full" type="submit">
                  创建小队 <ArrowRight size={16} />
                </button>
              </form>
            )}
            {modal === "checkin" && (
              <form className="dialog-content" onSubmit={submitEntry}>
                <span className="kicker">A MOMENT TO REMEMBER</span>
                <h2>留住今天的小快乐</h2>
                <p className="dialog-description">
                  不用写很长，一个瞬间就值得被记住。
                </p>
                <label className="field">
                  今天去了哪里
                  <select
                    value={formActivity}
                    onChange={(e) => setFormActivity(e.target.value)}
                  >
                    {activities.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.city} · {a.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  此刻心情
                  <select name="mood">
                    <option>充电成功</option>
                    <option>发现惊喜</option>
                    <option>轻松自在</option>
                    <option>交到新朋友</option>
                  </select>
                </label>
                <label className="field">
                  周末碎片
                  <textarea
                    name="text"
                    rows={4}
                    maxLength={1200}
                    required
                    placeholder="今天最喜欢的瞬间是…"
                  />
                </label>
                <label className="photo-upload">
                  <Camera size={22} />
                  <span>
                    {photo
                      ? "照片已添加，点击更换"
                      : "加一张照片（可选，5 MB 以内）"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => uploadPhoto(e.target.files?.[0])}
                  />
                </label>
                {photo && (
                  <img
                    className="photo-preview"
                    src={photo}
                    alt="待保存的打卡照片"
                  />
                )}
                {formError && (
                  <p className="form-error" role="alert">
                    {formError}
                  </p>
                )}
                <button className="primary full" type="submit">
                  保存这段周末 <Check size={17} />
                </button>
              </form>
            )}
            {modal === "guide" && (
              <form className="dialog-content" onSubmit={submitGuide}>
                <span className="kicker">SHARE YOUR LITTLE DISCOVERY</span>
                <h2>
                  {editingGuide ? "继续打磨这份周末灵感" : "把好玩的，分享出来"}
                </h2>
                <p className="dialog-description">
                  路线、花费和小提醒，都是下一位探索者的灵感。
                </p>
                <label className="field">
                  攻略标题
                  <input
                    name="title"
                    defaultValue={
                      editingGuide?.title || guideDraft?.title || ""
                    }
                    maxLength={60}
                    required
                    placeholder="比如：上海 ¥50 慢游半日路线"
                  />
                </label>
                <label className="field">
                  你的城市
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value as City)}
                  >
                    <option>上海</option>
                    <option>杭州</option>
                    <option>北京</option>
                  </select>
                </label>
                <label className="field">
                  攻略内容
                  <textarea
                    name="text"
                    defaultValue={editingGuide?.text || guideDraft?.text || ""}
                    maxLength={1200}
                    minLength={10}
                    required
                    rows={9}
                    placeholder={
                      "可以这样写：\n📍 路线安排\n💰 人均花费\n🚇 交通方式\n💡 亲测小提醒"
                    }
                  />
                </label>
                {formError && (
                  <p className="form-error" role="alert">
                    {formError}
                  </p>
                )}
                <button className="primary full" type="submit">
                  {editingGuide ? "保存修改" : "保存攻略，准备分享"}{" "}
                  <ArrowRight size={16} />
                </button>
              </form>
            )}
            {sharedPlan && (
              <div className="dialog-content">
                <span className="kicker">A WEEKEND SHARED WITH YOU</span>
                <h2>朋友分享了一份周末计划</h2>
                <p className="dialog-description">
                  {sharedPlan.options.date} · {sharedPlan.ids.length} 个活动 ·
                  参考 ¥
                  {
                    buildItinerary(
                      sharedPlan.ids.map(
                        (id) => activities.find((a) => a.id === id)!,
                      ),
                      sharedPlan.options,
                    ).totalPerPerson
                  }
                  /人
                </p>
                <div className="shared-plan-list">
                  {sharedPlan.ids.map((id, i) => {
                    const a = activities.find((a) => a.id === id)!;
                    return (
                      <div key={id}>
                        <img src={a.image} alt="活动氛围配图" />
                        <span>
                          <small>
                            第 {i + 1} 站 · {a.city}
                          </small>
                          <b>{a.title}</b>
                          <small>{a.location}</small>
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="data-note">
                  {plan.length
                    ? "载入后会替换当前周末计划，收藏与打卡会保留。"
                    : "载入后可以调整日期、顺序和预算。"}
                  这是行程快照，朋友后续的修改不会自动同步。
                </p>
                <button
                  className="primary full"
                  onClick={() => {
                    const incoming = sharedPlan;
                    setPlan(incoming.ids);
                    setPlanOptions(incoming.options);
                    setPeople(incoming.options.people);
                    setWeather(incoming.options.weather as Weather);
                    setWeatherMode("scenario");
                    setScenarioRequest((n) => n + 1);
                    setCity(
                      activities.find((a) => a.id === incoming.ids[0])!.city,
                    );
                    close();
                    setView("itinerary");
                    setOnlySaved(false);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    notice("行程已载入，可以按自己的节奏调整");
                  }}
                >
                  载入这份行程 <ArrowRight size={16} />
                </button>
              </div>
            )}
            {confirmation && (
              <div className="dialog-content">
                <span className="kicker">ONE MORE THING</span>
                <h2>{confirmation.title}</h2>
                <p className="dialog-description">{confirmation.text}</p>
                <div className="dialog-actions">
                  <button className="outline" onClick={close}>
                    先保留原样
                  </button>
                  <button
                    className="primary"
                    onClick={() => {
                      const action = confirmation.action;
                      close();
                      action();
                    }}
                  >
                    确认更新
                  </button>
                </div>
              </div>
            )}
            {modal === "studio" && (
              <WeekendStudio
                city={studioInspiration?.city || city}
                people={people}
                weather={studioInspiration?.weather || weather}
                initialOptions={planOptions}
                initialInterests={studioInspiration?.interests}
                onAdopt={adoptProposal}
                onClose={close}
              />
            )}
            {proposalPreview && (
              <ProposalPreview
                proposal={proposalPreview}
                onAdopt={() => adoptProposal(proposalPreview)}
                onCustomize={openStudio}
              />
            )}
            {modal === "about" && (
              <div className="dialog-content">
                <ProductGuide onExport={exportRecords} onStart={startDemo} />
              </div>
            )}
          </div>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </>
  );
}
function PageHeading({
  eyebrow,
  title,
  subtitle,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <section className="page-heading">
      <div>
        <span className="kicker">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <button className="primary" onClick={onAction}>
        <Plus size={17} />
        {action}
      </button>
    </section>
  );
}
