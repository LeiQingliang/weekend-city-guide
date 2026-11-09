import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  CloudRain,
  CloudSun,
  Coffee,
  Compass,
  Leaf,
  MapPin,
  Music,
  Palette,
  Route,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Ticket,
  TrainFront,
  Users,
  Wallet,
} from "lucide-react";
import { activities, type City, type Weather } from "../data";
import type { PlanOptions } from "../planner";
import {
  defaultWeekendBrief,
  explainWeekendConstraints,
  recommendWeekendProposals,
  type WeekendBrief,
  type WeekendInterest,
  type WeekendProposal,
} from "../curation";
import "./studio.css";

export interface WeekendStudioProps {
  city: City;
  people: number;
  weather: Weather;
  initialOptions: PlanOptions;
  onAdopt: (proposal: WeekendProposal) => void;
  onClose: () => void;
}
const interests: {
  value: WeekendInterest;
  caption: string;
  icon: typeof Palette;
}[] = [
  { value: "展览", caption: "给好奇心一点空间", icon: Palette },
  { value: "市集", caption: "在街角遇见小惊喜", icon: ShoppingBag },
  { value: "户外", caption: "让自己透一口气", icon: Leaf },
  { value: "演出", caption: "听见现场的心跳", icon: Music },
];
const money = (value: number) => `¥${Number(value.toFixed(2))}`;
const duration = (minutes: number) =>
  `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}min` : ""}`;
const validDate = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  Number.isFinite(Date.parse(`${date}T00:00:00Z`)) &&
  new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

export default function WeekendStudio({
  city,
  people,
  weather,
  initialOptions,
  onAdopt,
  onClose,
}: WeekendStudioProps) {
  const [brief, setBrief] = useState<WeekendBrief>(() =>
    defaultWeekendBrief(city, initialOptions, people, weather),
  );
  const [step, setStep] = useState(1);
  const [resultMode, setResultMode] = useState(false);
  const [error, setError] = useState("");
  const proposals = useMemo(
    () => (resultMode ? recommendWeekendProposals(brief) : []),
    [brief, resultMode],
  );
  const update = <K extends keyof WeekendBrief>(
    key: K,
    value: WeekendBrief[K],
  ) => {
    setBrief((previous) => ({ ...previous, [key]: value }));
    setError("");
  };
  const toggleInterest = (interest: WeekendInterest) =>
    update(
      "interests",
      brief.interests.includes(interest)
        ? brief.interests.filter((item) => item !== interest)
        : [...brief.interests, interest],
    );
  const next = () => {
    if (!Number.isFinite(brief.budget) || brief.budget < 0) {
      setError("请输入不小于 0 的全天人均预算。");
      return;
    }
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    if (
      !validDate(brief.date) ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(brief.startTime)
    ) {
      setError("补充有效的日期和开始时间，就可以比较方案了。");
      return;
    }
    setResultMode(true);
  };
  const adjust = (values: Partial<WeekendBrief>) =>
    setBrief((previous) => ({ ...previous, ...values }));

  return (
    <section
      className="weekend-studio"
      aria-labelledby="studio-title"
      data-tour="decision-studio"
    >
      <div className="studio-masthead">
        <span>
          <Compass size={17} />
          WEEKEND, MADE FOR YOU
        </span>
        <span>周末灵感工作台</span>
      </div>
      <div className="studio-heading">
        <span className="studio-overline">
          {resultMode ? "YOUR WEEKEND, TWO WAYS" : "少一点纠结，多一点出发"}
        </span>
        <h2 id="studio-title">
          {resultMode
            ? proposals.length
              ? "这次周末，你更心动哪一种？"
              : "先松开一个条件，好周末还在。"
            : step === 1
              ? "这一次，想怎么换换心情？"
              : step === 2
                ? "快乐有预算，也有同行的人。"
                : "留出一段时间，把周末交给自己。"}
        </h2>
        <p>
          {resultMode
            ? "先比较整趟的花费与时间，选中后还能继续调整。"
            : "三个小选择，把分散的灵感，变成一份真正能出发的计划。"}
        </p>
      </div>

      {!resultMode ? (
        <>
          <nav className="studio-progress" aria-label="周末决策步骤">
            {["选心情", "定预算", "留时间"].map((label, index) => (
              <button
                key={label}
                type="button"
                className={
                  step === index + 1
                    ? "current"
                    : step > index + 1
                      ? "complete"
                      : ""
                }
                onClick={() => {
                  if (index + 1 < step) setStep(index + 1);
                }}
                disabled={index + 1 > step}
                aria-current={step === index + 1 ? "step" : undefined}
              >
                <span>
                  {step > index + 1 ? <Check size={13} /> : `0${index + 1}`}
                </span>
                <b>{label}</b>
                {index < 2 && <ChevronRight size={14} />}
              </button>
            ))}
          </nav>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              next();
            }}
          >
            {step === 1 && (
              <div className="studio-step">
                <fieldset>
                  <legend>从哪座城市出发？</legend>
                  <div className="studio-cities">
                    {(["上海", "杭州", "北京"] as City[]).map((value) => (
                      <button
                        type="button"
                        key={value}
                        className={brief.city === value ? "selected" : ""}
                        aria-pressed={brief.city === value}
                        onClick={() => update("city", value)}
                      >
                        <MapPin size={15} />
                        {value}
                        {brief.city === value && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>
                    这周，想多一点什么？<small>可多选，优先安排</small>
                  </legend>
                  <div className="studio-interests">
                    {interests.map(({ value, caption, icon: Icon }) => (
                      <button
                        type="button"
                        key={value}
                        className={
                          brief.interests.includes(value) ? "selected" : ""
                        }
                        aria-pressed={brief.interests.includes(value)}
                        onClick={() => toggleInterest(value)}
                      >
                        <span className="studio-interest-icon">
                          <Icon size={22} />
                        </span>
                        <span>
                          <strong>{value}</strong>
                          <small>{caption}</small>
                        </span>
                        <i>
                          {brief.interests.includes(value) && (
                            <Check size={12} />
                          )}
                        </i>
                      </button>
                    ))}
                  </div>
                  <p className="studio-hint">
                    还没想好也没关系，不选兴趣，让城市给你一点惊喜。
                  </p>
                </fieldset>
                <fieldset>
                  <legend>喜欢怎样的节奏？</legend>
                  <div className="studio-pace">
                    <button
                      type="button"
                      className={brief.pace === "relaxed" ? "selected" : ""}
                      aria-pressed={brief.pace === "relaxed"}
                      onClick={() => update("pace", "relaxed")}
                    >
                      <Coffee size={18} />
                      <span>
                        <strong>就一站，慢慢逛</strong>
                        <small>留白多一点，不赶下一场</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={brief.pace === "balanced" ? "selected" : ""}
                      aria-pressed={brief.pace === "balanced"}
                      onClick={() => update("pace", "balanced")}
                    >
                      <Route size={18} />
                      <span>
                        <strong>一两站，刚刚好</strong>
                        <small>顺路多体验一种小快乐</small>
                      </span>
                    </button>
                  </div>
                </fieldset>
              </div>
            )}
            {step === 2 && (
              <div className="studio-step">
                <fieldset>
                  <legend>
                    这趟准备花多少？<small>每人 · 包含活动、餐饮和交通</small>
                  </legend>
                  <div className="studio-budget-entry">
                    <span>¥</span>
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      step="5"
                      value={brief.budget}
                      onChange={(event) =>
                        update(
                          "budget",
                          Math.max(0, Number(event.target.value) || 0),
                        )
                      }
                      aria-label="周末全天人均预算"
                    />
                    <span>/ 人</span>
                  </div>
                  <div className="studio-budget-presets">
                    {[80, 100, 150, 200].map((value) => (
                      <button
                        type="button"
                        key={value}
                        className={brief.budget === value ? "selected" : ""}
                        onClick={() => update("budget", value)}
                        aria-pressed={brief.budget === value}
                      >
                        {money(value)}
                      </button>
                    ))}
                  </div>
                  <div className="studio-budget-breakdown">
                    <span>
                      <Coffee size={16} />
                      餐饮预留 <b>¥30</b>
                    </span>
                    <span>
                      <TrainFront size={16} />
                      交通预留 <b>¥15</b>
                    </span>
                    <span>
                      <Ticket size={16} />
                      活动可用 <b>{money(Math.max(0, brief.budget - 45))}</b>
                    </span>
                  </div>
                  {brief.budget < 45 && (
                    <p className="studio-budget-warning">
                      餐饮与交通预留合计 ¥45，当前预算还不够覆盖这两项。
                    </p>
                  )}
                </fieldset>
                <fieldset>
                  <legend>这次，和谁一起？</legend>
                  <div className="studio-people">
                    {[
                      { value: 1, title: "一个人", subtitle: "自在一点" },
                      { value: 2, title: "两个人", subtitle: "快乐有回应" },
                      { value: 4, title: "三五好友", subtitle: "热闹刚刚好" },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.value}
                        className={
                          brief.people === item.value ? "selected" : ""
                        }
                        aria-pressed={brief.people === item.value}
                        onClick={() => update("people", item.value)}
                      >
                        <Users size={19} />
                        <strong>{item.title}</strong>
                        <small>{item.subtitle}</small>
                      </button>
                    ))}
                  </div>
                  <label className="studio-exact-people">
                    同行人数也可以自己定
                    <select
                      aria-label="周末同行人数"
                      value={brief.people}
                      onChange={(event) =>
                        update("people", Number(event.target.value))
                      }
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map(
                        (value) => (
                          <option key={value} value={value}>
                            {value} 人
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <p className="studio-hint">
                    {brief.people} 人全天总预算{" "}
                    {money(brief.budget * brief.people)}
                    。比较方案时会同时算清人均与合计。
                  </p>
                </fieldset>
              </div>
            )}
            {step === 3 && (
              <div className="studio-step">
                <div className="studio-date-row">
                  <label>
                    哪天出发
                    <input
                      type="date"
                      required
                      value={brief.date}
                      aria-label="周末计划日期"
                      onChange={(event) => update("date", event.target.value)}
                    />
                  </label>
                  <label>
                    几点开始
                    <input
                      type="time"
                      required
                      value={brief.startTime}
                      aria-label="周末开始时间"
                      onChange={(event) =>
                        update("startTime", event.target.value)
                      }
                    />
                  </label>
                </div>
                <div className="studio-time-shortcuts">
                  {[
                    { time: "09:00", label: "从早晨开始" },
                    { time: "13:00", label: "留一个下午" },
                    { time: "18:00", label: "去感受夜晚" },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.time}
                      onClick={() => update("startTime", item.time)}
                      className={
                        brief.startTime === item.time ? "selected" : ""
                      }
                    >
                      {item.label}
                      <span>{item.time}</span>
                    </button>
                  ))}
                </div>
                <fieldset>
                  <legend>
                    愿意留多少时间？<small>包含停留与转场估算</small>
                  </legend>
                  <div className="studio-durations">
                    {[120, 180, 300, 480].map((value) => (
                      <button
                        type="button"
                        key={value}
                        aria-pressed={brief.maxDurationMinutes === value}
                        className={
                          brief.maxDurationMinutes === value ? "selected" : ""
                        }
                        onClick={() => update("maxDurationMinutes", value)}
                      >
                        <Clock3 size={15} />
                        {value / 60} 小时
                        {value === 300 && <small>半日刚好</small>}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>按什么天气来准备？</legend>
                  <div className="studio-weather">
                    {(
                      [
                        { value: "晴天", icon: Sun, label: "去晒晒太阳" },
                        {
                          value: "多云",
                          icon: CloudSun,
                          label: "慢慢走也舒服",
                        },
                        {
                          value: "下雨",
                          icon: CloudRain,
                          label: "只安排室内活动",
                        },
                      ] as const
                    ).map(({ value, icon: Icon, label }) => (
                      <button
                        type="button"
                        key={value}
                        className={brief.weather === value ? "selected" : ""}
                        aria-pressed={brief.weather === value}
                        onClick={() => update("weather", value)}
                      >
                        <Icon size={22} />
                        <strong>{value}</strong>
                        <small>{label}</small>
                      </button>
                    ))}
                  </div>
                  <p className="studio-hint">
                    这里使用所选天气条件规划，可手动模拟；实际出行前请查看最新预报。
                  </p>
                </fieldset>
              </div>
            )}
            {error && (
              <p className="studio-error" role="alert">
                {error}
              </p>
            )}
            <div className="studio-step-footer">
              <button
                type="button"
                className="studio-back"
                onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
              >
                <ArrowLeft size={15} />
                {step > 1 ? "上一步" : "先随便看看"}
              </button>
              <span>{step} / 3</span>
              <button type="submit" className="studio-next">
                {step === 3 ? "比较我的周末" : "下一步"}
                <ArrowRight size={17} />
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <div className="studio-result-brief">
            <span>
              <MapPin size={14} />
              {brief.city}
            </span>
            <span>
              <Users size={14} />
              {brief.people} 人
            </span>
            <span>
              <Wallet size={14} />
              全天 {money(brief.budget)}/人
            </span>
            <span>
              <Clock3 size={14} />
              {brief.maxDurationMinutes / 60} 小时内
            </span>
            <span>{brief.weather}情景</span>
            <button
              onClick={() => {
                setResultMode(false);
                setStep(1);
              }}
            >
              <SlidersHorizontal size={13} />
              重新选
            </button>
          </div>
          {proposals.length ? (
            <>
              <div
                className={`studio-proposals ${proposals.length === 1 ? "single" : ""}`}
              >
                {proposals.map((proposal, index) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    index={index}
                    people={brief.people}
                    onAdopt={() => onAdopt(proposal)}
                  />
                ))}
              </div>
              {proposals.length === 1 && (
                <div className="studio-one-option">
                  <Check size={17} />
                  <p>
                    当前只有这一份方案同时满足预算、天气与时间。保留它，或者稍微调整条件再比较。
                  </p>
                  <button
                    onClick={() => {
                      setResultMode(false);
                      setStep(2);
                    }}
                  >
                    调整条件 <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="studio-empty">
              <span>
                <Compass size={31} />
              </span>
              <h3>暂时没有刚好合适的组合。</h3>
              <div>
                {explainWeekendConstraints(brief).map((reason) => (
                  <p key={reason}>{reason}</p>
                ))}
              </div>
              <p className="studio-empty-label">试着只改一个条件</p>
              <div className="studio-adjustments">
                <button onClick={() => adjust({ budget: brief.budget + 50 })}>
                  <Wallet size={15} />
                  人均增加 ¥50
                </button>
                <button
                  onClick={() =>
                    adjust({
                      maxDurationMinutes: Math.min(
                        720,
                        brief.maxDurationMinutes + 120,
                      ),
                    })
                  }
                >
                  <Clock3 size={15} />
                  多留 2 小时
                </button>
                <button
                  onClick={() => {
                    setResultMode(false);
                    setStep(3);
                  }}
                >
                  <SlidersHorizontal size={15} />
                  换个出发时段
                </button>
              </div>
            </div>
          )}
          <p className="studio-result-note">
            <Sparkles size={15} />
            推荐按你选择的条件组合示例活动，费用与时间为估算。选定后进入可编辑行程，现有计划会在确认后更新。
          </p>
          <button
            className="studio-result-back"
            onClick={() => {
              setResultMode(false);
              setStep(3);
            }}
          >
            <ArrowLeft size={14} />
            回去微调时间与天气
          </button>
        </>
      )}
    </section>
  );
}

function ProposalCard({
  proposal,
  index,
  people,
  onAdopt,
}: {
  proposal: WeekendProposal;
  index: number;
  people: number;
  onAdopt: () => void;
}) {
  const items = proposal.activityIds.map(
    (id) => activities.find((item) => item.id === id)!,
  );
  return (
    <article
      className={`studio-proposal ${index === 0 ? "primary-proposal" : "alternate-proposal"}`}
    >
      <div className="studio-proposal-label">
        <span>{index === 0 ? "为你优先考虑" : "也可以这样过"}</span>
        <b>{String(index + 1).padStart(2, "0")}</b>
      </div>
      <h3>{proposal.title}</h3>
      <p className="studio-proposal-subtitle">
        {items.map((item) => item.category).join(" + ")} ·{" "}
        {proposal.activityIds.length} 站城市探索
      </p>
      <div className="studio-proposal-visual">
        <img src={items[0].image} alt={`${items[0].category}活动氛围配图`} />
        <span>
          {items[0].city}
          <small>WEEKEND PLAN</small>
        </span>
      </div>
      <div className="studio-proposal-price">
        <div>
          <strong>{money(proposal.totalPerPerson)}</strong>
          <span>/ 人 · 已含餐饮交通</span>
        </div>
        <div>
          <Clock3 size={15} />
          <b>{duration(proposal.durationMinutes)}</b>
        </div>
      </div>
      <p className="studio-proposal-group">
        {people} 人参考合计 {money(proposal.totalPerPerson * people)}
      </p>
      <ol className="studio-proposal-route">
        {items.map((item, itemIndex) => (
          <li key={item.id}>
            <span>{itemIndex + 1}</span>
            <div>
              <strong>{item.title}</strong>
              <small>{item.location}</small>
            </div>
          </li>
        ))}
      </ol>
      <div className="studio-proposal-why">
        <h4>为什么适合这次出发</h4>
        {proposal.reasons.map((reason) => (
          <p key={reason}>
            <Check size={13} />
            {reason}
          </p>
        ))}
      </div>
      <div className="studio-proposal-tradeoffs">
        <h4>你需要知道的小取舍</h4>
        {proposal.tradeoffs.map((tradeoff) => (
          <p key={tradeoff}>{tradeoff}</p>
        ))}
      </div>
      <button className="studio-adopt" onClick={onAdopt}>
        {index === 0 ? "就按这份计划出发" : "我更喜欢这一份"}
        <ArrowRight size={17} />
      </button>
    </article>
  );
}
