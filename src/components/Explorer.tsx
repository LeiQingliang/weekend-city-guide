import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  CloudSun,
  Compass,
  Heart,
  Leaf,
  List,
  Map,
  MapPin,
  Music,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  activities,
  categories,
  type Activity,
  type Category,
  type City,
  type Weather,
} from "../data";
import {
  defaultWeekendBrief,
  recommendWeekendProposals,
  type WeekendProposal,
} from "../curation";
import type { PlanOptions } from "../planner";
import { asset } from "../paths";
import { planningModeLabel } from "../runtime";
import ExploreMap from "./ExploreMap";

type Result = Activity & { reasons: string[] };
type Props = {
  city: City;
  category: Category;
  budget: number;
  weather: Weather;
  people: number;
  query: string;
  onlySaved: boolean;
  favorites: string[];
  plan: string[];
  options: PlanOptions;
  results: Result[];
  weatherSummary: string;
  tools: ReactNode;
  onCategory: (v: Category) => void;
  onBudget: (v: number) => void;
  onWeather: (v: Weather) => void;
  onQuery: (v: string) => void;
  onSaved: () => void;
  onFavorite: (id: string) => void;
  onAdd: (a: Activity) => void;
  onRemove: (id: string) => void;
  onDetail: (a: Activity) => void;
  onCustomize: () => void;
  onTour: () => void;
  onPreview: (p: WeekendProposal) => void;
  onIntent: (text: string) => void;
  onPlan: () => void;
  onReset: () => void;
};

const duration = (minutes: number) =>
  `${Math.floor(minutes / 60)} 小时${minutes % 60 ? ` ${minutes % 60} 分` : ""}`;
const dayLabel = (date: string) => {
  const d = new Date(`${date}T12:00:00+08:00`);
  return Number.isNaN(d.getTime())
    ? "选个出发日"
    : new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        month: "long",
        day: "numeric",
        weekday: "short",
      }).format(d);
};
export const planningPriceLabel = (a: Activity) =>
  a.evidence?.pricing.kind === "official-free"
    ? "常设免费"
    : a.price === 0
      ? "门票预留 ¥0"
      : `预留 ¥${a.price}`;

export default function Explorer(p: Props) {
  const [showMap, setShowMap] = useState(
    () => window.matchMedia("(min-width: 961px)").matches,
  );
  const [selectedId, setSelectedId] = useState<string>();
  const [intent, setIntent] = useState("");
  const chosen = p.results.find((a) => a.id === selectedId) || p.results[0];
  const planned = p.plan
    .map((id) => activities.find((a) => a.id === id))
    .filter(Boolean) as Activity[];
  const feature = recommendWeekendProposals({
    ...defaultWeekendBrief(p.city, p.options, p.people, p.weather),
    interests: ["展览", "户外"],
    maxDurationMinutes: 360,
  })[0];
  const openWeather = () => {
    setShowMap(false);
    const panel = document.getElementById(
      "explorer-tools",
    ) as HTMLDetailsElement | null;
    if (panel) {
      panel.open = true;
      requestAnimationFrame(() =>
        panel.scrollIntoView({ block: "start", behavior: "smooth" }),
      );
    }
  };
  const selectPlace = (a: Activity) => {
    setSelectedId(a.id);
  };
  const focusCard = () => {
    document
      .getElementById(`place-${chosen?.id}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  return (
    <div className="explorer">
      <section
        className="explorer-intro edition-hero"
        aria-label="周末城市提案"
      >
        <div className="explorer-heading">
          <span className="explorer-eyebrow">
            <span /> WEEKEND FIELD NOTES <i>周末城市探索指南</i>
          </span>
          <h1>
            说说想法，
            <br />
            <em>把周末一起安排好。</em>
          </h1>
          <p>从一句需求，到一份可核对、可调整的出行计划。</p>
          <form
            className="intent-launch"
            onSubmit={(e) => {
              e.preventDefault();
              p.onIntent(intent);
            }}
          >
            <textarea
              rows={2}
              maxLength={300}
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              aria-label="说说你的周末需求"
              placeholder={`${p.city}，周六两个人，人均100元，下午想看展`}
            />
            <div className="intent-launch-actions">
              <small>规划助手 · {planningModeLabel}</small>
              <button type="submit">
                一起规划 <ArrowRight size={16} />
              </button>
            </div>
          </form>
          <div className="explorer-heading-actions">
            <button className="edition-primary" onClick={p.onCustomize}>
              定制我的周末 <ArrowUpRight size={18} />
            </button>
            <button className="edition-play" onClick={p.onTour}>
              90 秒体验 <ArrowRight size={15} />
            </button>
          </div>
        </div>
        <div className="explorer-cover edition-photo">
          <img
            src={asset("city-weekend-v3.jpg")}
            alt="AI 生成的城市滨水漫步氛围图"
            fetchPriority="high"
          />
          <span className="explorer-cover-caption">
            <small>AI 生成氛围图</small>
          </span>
          {feature ? (
            <button
              className="explorer-pick edition-pick"
              onClick={() => p.onPreview(feature)}
            >
              <span className="explorer-pick-label">
                <span>
                  <Compass size={14} /> {p.city} · 为你搭配的一天
                </span>
                <span>01 / WEEKEND PICK</span>
              </span>
              <strong>{feature.title}</strong>
              <span className="explorer-pick-route">
                {feature.activityIds
                  .map(
                    (id) =>
                      activities.find((a) => a.id === id)?.evidence
                        ?.venueName ||
                      activities.find((a) => a.id === id)?.location,
                  )
                  .join(" → ")}
              </span>
              <span className="explorer-pick-bottom edition-pick-bottom">
                <span>
                  <b>¥{feature.totalPerPerson}</b>
                  <small> /人规划 · 含餐饮交通</small>
                </span>
                <span>
                  <Clock3 size={13} /> {duration(feature.durationMinutes)}
                  <ArrowUpRight size={20} />
                </span>
              </span>
            </button>
          ) : (
            <button
              className="explorer-pick explorer-pick-empty"
              onClick={p.onCustomize}
            >
              <strong>把条件，调成你的节奏。</strong>
              <span>
                当前日期与时段暂无合适组合，重新定制看看{" "}
                <ArrowUpRight size={18} />
              </span>
            </button>
          )}
        </div>
      </section>

      <section className="explorer-intent" aria-label="这次周末的出发条件">
        <button onClick={p.onCustomize}>
          <CalendarDays size={19} />
          <span>
            <small>出发时间</small>
            <b>{dayLabel(p.options.date)}</b>
          </span>
          <ChevronDown size={14} />
        </button>
        <button onClick={p.onCustomize}>
          <Wallet size={19} />
          <span>
            <small>人均全天预算</small>
            <b>
              ¥{p.options.budget} <i>含餐饮交通</i>
            </b>
          </span>
          <ChevronDown size={14} />
        </button>
        <button onClick={p.onCustomize}>
          <Users size={19} />
          <span>
            <small>同行方式</small>
            <b>{p.people === 1 ? "一个人也自在" : `${p.people} 人一起出发`}</b>
          </span>
          <ChevronDown size={14} />
        </button>
        <button className="explorer-weather" onClick={openWeather}>
          <CloudSun size={20} />
          <span>
            <small>出行天气 · 查看详情</small>
            <b>{p.weatherSummary || "正在获取预报"}</b>
          </span>
          <ArrowUpRight size={14} />
        </button>
      </section>

      <section
        className="explorer-browse"
        id="explore"
        aria-label="发现城市活动"
      >
        <div className="explorer-section-head">
          <div>
            <span className="explorer-eyebrow">
              {p.city.toUpperCase()} / LOCAL DISCOVERIES
            </span>
            <h2>
              {p.onlySaved ? "留给下次的心动。" : "好去处，就在这座城。"}
              <small>{p.results.length} 个探索灵感</small>
            </h2>
          </div>
          <div className="explorer-view" aria-label="发现页显示方式">
            <button onClick={() => setShowMap(false)} aria-pressed={!showMap}>
              <List size={16} />
              列表
            </button>
            <button onClick={() => setShowMap(true)} aria-pressed={showMap}>
              <Map size={16} />
              地图
            </button>
          </div>
        </div>
        <div className="explorer-filterbar">
          <div className="category-list">
            {categories.map((c, i) => {
              const Icon = [Compass, Map, ShoppingBag, Music, Leaf][i];
              return (
                <button
                  key={c}
                  className={`chip ${p.category === c && !p.onlySaved ? "selected" : ""}`}
                  aria-pressed={p.category === c && !p.onlySaved}
                  onClick={() => p.onCategory(c)}
                >
                  <Icon size={16} />
                  {c === "全部" ? "全部探索" : c}
                </button>
              );
            })}
          </div>
          <button
            className={`saved-toggle ${p.onlySaved ? "selected" : ""}`}
            onClick={p.onSaved}
            aria-pressed={p.onlySaved}
          >
            <Bookmark size={15} />
            收藏{p.favorites.length ? ` ${p.favorites.length}` : ""}
          </button>
        </div>
        <div className="explorer-searchbar">
          <label className="explorer-search">
            <Search size={17} />
            <input
              aria-label="搜索活动"
              value={p.query}
              onChange={(e) => p.onQuery(e.target.value)}
              placeholder="搜地点、活动或一点灵感"
            />
            {p.query && (
              <button onClick={() => p.onQuery("")} aria-label="清空搜索">
                <X size={15} />
              </button>
            )}
          </label>
          <label className="explorer-select">
            <Wallet size={14} />
            <select
              aria-label="人均活动预算"
              value={p.budget}
              onChange={(e) => p.onBudget(Number(e.target.value))}
            >
              {![0, 50, 100, 200, 999].includes(p.budget) && (
                <option value={p.budget}>活动 ¥{p.budget}以内</option>
              )}
              <option value={0}>活动预留 ¥0</option>
              <option value={50}>活动 ¥50以内</option>
              <option value={100}>活动 ¥100以内</option>
              <option value={200}>活动 ¥200以内</option>
              <option value={999}>活动预算不限</option>
            </select>
          </label>
          <label className="explorer-select">
            <CloudSun size={14} />
            <select
              aria-label="天气场景"
              value={p.weather}
              onChange={(e) => p.onWeather(e.target.value as Weather)}
            >
              <option>晴天</option>
              <option>多云</option>
              <option>下雨</option>
            </select>
            <small>情景</small>
          </label>
        </div>
        <p className="explorer-context-note">
          <ShieldCheck size={14} />
          真实地点附信息来源；费用为规划预留，具体票价与场次请向官方确认。
          {p.weather === "下雨" && <b>已优先筛选室内去处。</b>}
        </p>
        <div
          className={`explorer-workspace ${showMap ? "with-map" : "list-only"}`}
        >
          <div className="explorer-results">
            {p.results.length ? (
              <div className="explorer-card-grid activity-grid">
                {p.results.map((a, index) => (
                  <article
                    id={`place-${a.id}`}
                    key={a.id}
                    className={`explorer-card activity-card ${chosen?.id === a.id && showMap ? "is-focused" : ""}`}
                    onMouseEnter={() => setSelectedId(a.id)}
                  >
                    <div className="explorer-card-photo">
                      <button
                        className="card-image-button"
                        onClick={() => p.onDetail(a)}
                        aria-label={`查看${a.title}`}
                      >
                        <img
                          src={a.image}
                          alt={`${a.category}氛围参考，非场馆实拍`}
                          loading="lazy"
                        />
                        <span className="explorer-image-note">氛围参考</span>
                      </button>
                      <span className="explorer-card-category">
                        {a.category} · {a.indoor ? "室内" : "户外"}
                      </span>
                      <button
                        className={`favorite ${p.favorites.includes(a.id) ? "liked" : ""}`}
                        aria-label={`${p.favorites.includes(a.id) ? "取消收藏" : "收藏"}${a.title}`}
                        aria-pressed={p.favorites.includes(a.id)}
                        onClick={() => p.onFavorite(a.id)}
                      >
                        <Heart
                          size={18}
                          fill={
                            p.favorites.includes(a.id) ? "currentColor" : "none"
                          }
                        />
                      </button>
                    </div>
                    <div className="explorer-card-content">
                      <div className="explorer-place-line">
                        <button
                          onClick={() => {
                            selectPlace(a);
                            setShowMap(true);
                          }}
                          aria-label={`在地图查看${a.evidence?.venueName || a.location}`}
                        >
                          <MapPin size={13} />
                          {a.evidence?.venueName || a.location}
                        </button>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                      </div>
                      <button
                        className="card-title"
                        onClick={() => p.onDetail(a)}
                      >
                        <h3>{a.title}</h3>
                        <ArrowUpRight size={17} />
                      </button>
                      <p className="explorer-card-description">{a.subtitle}</p>
                      <div className="explorer-card-metadata">
                        <span>
                          <Clock3 size={13} />
                          {a.duration}
                        </span>
                        <span>
                          {a.evidence?.eventStatus === "schedule-unconfirmed"
                            ? "场次需确认"
                            : a.evidence?.booking.status === "ticket-required"
                              ? "提前查票/预约"
                              : "出发前核实开放"}
                        </span>
                      </div>
                      <div className="explorer-card-bottom">
                        <span>
                          <b>{planningPriceLabel(a)}</b>
                          <small>
                            {a.evidence?.pricing.kind === "optional-spend"
                              ? "自选消费 / 人"
                              : a.evidence?.pricing.kind === "official-free"
                                ? "特展及预约见官方"
                                : "活动费用 / 人"}
                          </small>
                        </span>
                        <button
                          className={`add-button ${p.plan.includes(a.id) ? "added" : ""}`}
                          onClick={() => p.onAdd(a)}
                        >
                          {p.plan.includes(a.id) ? (
                            <Check size={16} />
                          ) : (
                            <Plus size={16} />
                          )}
                          {p.plan.includes(a.id) ? "已加入" : "加入计划"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty explorer-empty">
                <Search size={32} />
                <h3>暂时没有刚刚好的结果</h3>
                <p>
                  试试调整活动预算、兴趣或搜索词。
                  {p.weather === "下雨" ? "雨天会优先避开户外。" : ""}
                </p>
                <button className="primary" onClick={p.onReset}>
                  重置筛选
                </button>
              </div>
            )}
            <details className="explorer-advanced" id="explorer-tools">
              <summary>
                <span>
                  <SlidersHorizontal size={16} />
                  天气与更多偏好
                </span>
                <span>
                  一句话规划 · 天气来源 <Plus size={15} />
                </span>
              </summary>
              <div>{p.tools}</div>
            </details>
          </div>
          {showMap && (
            <aside className="explorer-side">
              <ExploreMap
                items={p.results}
                selectedId={chosen?.id}
                onSelect={selectPlace}
                plan={p.plan}
              />
              {chosen && (
                <button
                  className="explorer-map-detail"
                  onClick={() => p.onDetail(chosen)}
                >
                  了解「{chosen.evidence?.venueName || chosen.location}」
                  <ArrowRight size={16} />
                </button>
              )}
              <button
                className="explorer-back-list"
                onClick={() => {
                  setShowMap(false);
                  focusCard();
                }}
              >
                <List size={15} />
                回到活动列表
              </button>
              <div className="explorer-mini-plan">
                <div>
                  <span>
                    <RouteIcon />
                    <b>慢慢挑，就成了一个周末</b>
                  </span>
                  <small>{planned.length} 站已选</small>
                </div>
                {planned.length ? (
                  <>
                    <ol>
                      {planned.map((a) => (
                        <li key={a.id}>
                          <button onClick={() => p.onDetail(a)}>
                            {a.evidence?.venueName || a.title}
                          </button>
                          <button
                            aria-label={`移除${a.title}`}
                            onClick={() => p.onRemove(a.id)}
                          >
                            <X size={13} />
                          </button>
                        </li>
                      ))}
                    </ol>
                    <button className="primary" onClick={p.onPlan}>
                      去安排时间与预算 <ArrowRight size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <p>把心动地点加入计划，时间和花费一起安排。</p>
                    <button onClick={p.onCustomize}>
                      还没想法？帮我搭配 <ArrowUpRight size={15} />
                    </button>
                  </>
                )}
              </div>
            </aside>
          )}
        </div>
      </section>
      {!showMap && planned.length > 0 && (
        <button className="explorer-plan-dock" onClick={p.onPlan}>
          <span>
            <Check size={16} />
            已选 {planned.length} 站
          </span>
          <b>
            查看我的周末 <ArrowRight size={16} />
          </b>
        </button>
      )}
    </div>
  );
}
function RouteIcon() {
  return <Compass size={18} />;
}
