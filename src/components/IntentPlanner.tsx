import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Compass,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wallet,
} from "lucide-react";
import { activities, type Activity, type City, type Weather } from "../data";
import { buildItinerary, type PlanOptions } from "../planner";
import {
  defaultWeekendBrief,
  explainWeekendConstraints,
  recommendWeekendProposals,
  type WeekendBrief,
  type WeekendInterest,
  type WeekendProposal,
} from "../curation";
import { reviseIntent, type IntentRevision } from "../intent";
import { requestModelRevision } from "../intentGateway";
import { modelEndpoint } from "../runtime";
import "./intent-planner.css";

type Props = {
  city: City;
  people: number;
  weather: Weather;
  options: PlanOptions;
  initialText?: string;
  initialActivities?: Activity[];
  onAdopt: (proposal: WeekendProposal) => void;
  onClose: () => void;
};
const minutesLabel = (n: number) =>
  `${Math.floor(n / 60) ? `${Math.floor(n / 60)}小时` : ""}${n % 60 ? `${n % 60}分钟` : ""}`;
const interests: WeekendInterest[] = ["展览", "市集", "户外", "演出"];
const clone = (brief: WeekendBrief): WeekendBrief => ({
  ...brief,
  interests: [...brief.interests],
  excludedInterests: [...(brief.excludedInterests || [])],
});

export default function IntentPlanner(p: Props) {
  const [brief, setBrief] = useState<WeekendBrief>(() => ({
    ...defaultWeekendBrief(p.city, p.options, p.people, p.weather),
    mealBudget: p.options.mealBudget,
    transportBudget: p.options.transportBudget,
    interests: [...new Set((p.initialActivities || []).map((a) => a.category))],
  }));
  const [input, setInput] = useState(p.initialText || "");
  const [revision, setRevision] = useState<IntentRevision | null>(null);
  const [history, setHistory] = useState<
    { brief: WeekendBrief; unresolved: string[] }[]
  >([]);
  const [pendingRequirements, setPendingRequirements] = useState<string[]>([]);
  const [requested, setRequested] = useState(false);
  const [acceptedUnknowns, setAcceptedUnknowns] = useState(false);
  const [manual, setManual] = useState<WeekendBrief | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [serviceNote, setServiceNote] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null),
    initialized = useRef(false);
  const proposals = useMemo(
    () => (requested ? recommendWeekendProposals(brief) : []),
    [brief, requested],
  );
  const unknowns = [
    ...new Set([
      ...pendingRequirements,
      ...(revision?.blocked ? revision.unresolved : []),
    ]),
  ];
  const canAdopt =
    !busy && !revision?.blocked && (!unknowns.length || acceptedUnknowns);

  const submit = async (text: string) => {
    if (requestRef.current) return;
    setManual(null);
    let next: IntentRevision;
    if (modelEndpoint) {
      const controller = new AbortController();
      requestRef.current = controller;
      setBusy(true);
      setServiceNote("正在理解这轮需求，尚未修改计划……");
      try {
        next = await requestModelRevision(
          modelEndpoint,
          brief,
          text,
          AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]),
        );
        if (controller.signal.aborted) return;
        setServiceNote(
          "已由 DeepSeek 理解需求；请核对条件，活动与费用仍由规则校验。",
        );
      } catch {
        if (controller.signal.aborted) return;
        next = reviseIntent(brief, text);
        setServiceNote(
          "在线理解暂时不可用，本轮已改用本地规则。请核对识别结果和未覆盖要求。",
        );
      } finally {
        if (requestRef.current === controller) {
          requestRef.current = null;
          setBusy(false);
        }
      }
    } else next = reviseIntent(brief, text);
    setRevision(next);
    setMessage(text);
    setAcceptedUnknowns(false);
    setManual(null);
    if (!next.blocked) {
      setHistory((prev) => [
        ...prev.slice(-7),
        { brief: clone(brief), unresolved: [...pendingRequirements] },
      ]);
      setPendingRequirements((prev) => [
        ...new Set([...prev, ...next.unresolved]),
      ]);
      setBrief(next.brief);
      setRequested(true);
      setInput("");
    }
  };
  useEffect(() => {
    if (!message) return;
    const frame = requestAnimationFrame(() =>
      outputRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [message, revision, requested]);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      if (p.initialText?.trim()) submit(p.initialText);
    }
    return () => {
      initialized.current = false;
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, []);
  const undo = () => {
    if (requestRef.current) return;
    const last = history.at(-1);
    if (!last) return;
    setBrief(clone(last.brief));
    setPendingRequirements([...last.unresolved]);
    setHistory((prev) => prev.slice(0, -1));
    setRevision(null);
    setMessage("已撤销上一轮修改，回到之前的条件。");
    setAcceptedUnknowns(false);
    setRequested(true);
    setManual(null);
  };
  const edit = <K extends keyof WeekendBrief>(key: K, value: WeekendBrief[K]) =>
    setManual((prev) =>
      requestRef.current ? prev : prev ? { ...prev, [key]: value } : null,
    );
  const applyManual = () => {
    if (!manual || requestRef.current) return;
    setHistory((prev) => [
      ...prev.slice(-7),
      { brief: clone(brief), unresolved: [...pendingRequirements] },
    ]);
    setBrief(clone(manual));
    setManual(null);
    setRequested(true);
    setAcceptedUnknowns(false);
    setRevision((prev) =>
      prev
        ? {
            ...prev,
            blocked: false,
            changes: [],
            recognized: ["已应用你核对后的条件"],
          }
        : null,
    );
    setMessage("已更新结构化条件；未覆盖的要求仍需你另行确认。");
  };

  const firstRevision = history.length === 1 && !p.initialActivities?.length;
  const changes = !!revision?.changes.length && (
    <ul>
      {revision.changes.map((change, i) => (
        <li key={i}>
          <b>{change.label}</b>
          <del>{change.before}</del>
          <ArrowRight size={12} />
          <strong>{change.after}</strong>
        </li>
      ))}
    </ul>
  );
  return (
    <section className="intent-planner" aria-labelledby="intent-title">
      <div className="intent-masthead">
        <span>
          <Compass size={17} /> 周末规划助手
        </span>
        <span>{modelEndpoint ? "DeepSeek · 条件理解" : "本地规划模式"}</span>
      </div>
      <h2 id="intent-title">
        先说目标，
        <br />
        再把周末一起改好。
      </h2>
      <p className="intent-intro">
        说清想做什么、花多少钱、有多久。条件和方案会留下来，可以接着改；你确认采用后，才会更新正式计划。
      </p>
      <form
        className="intent-composer"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) submit(input);
        }}
      >
        <label htmlFor="intent-message">
          {requested ? "继续调整这份周末" : "你的周末，想怎么过？"}
        </label>
        <textarea
          id="intent-message"
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder={
            requested
              ? "比如：预算改成80元，只去室内，缩短到3小时"
              : "比如：上海，周六两个人，人均100元，下午看展，留3小时"
          }
        />
        <div className="intent-composer-footer">
          <small>
            {modelEndpoint
              ? "发送后仅将本轮需求与出行条件交由 DeepSeek 理解"
              : "当前为可验证规则原型，未调用大模型"}
          </small>
          <button
            className="primary"
            disabled={busy || !input.trim()}
            type="submit"
          >
            {busy ? "正在理解…" : requested ? "更新方案" : "整理我的需求"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
      {serviceNote && (
        <p className="intent-context-note" role="status">
          {serviceNote}
        </p>
      )}
      <div className="intent-prompts" aria-label="试试这样说">
        {(requested
          ? ["预算改为80元", "只去室内", "缩短到3小时"]
          : [
              `${p.city}，周六，两个人，人均100元，下午看展，3小时`,
              `${p.city}，一个人，半天，想散步，人均80元`,
            ]
        ).map((text) => (
          <button key={text} disabled={busy} onClick={() => submit(text)}>
            {requested
              ? text
              : text.includes("看展")
                ? "两个人，百元看展"
                : "一个人，半天散步"}
            <ArrowUpRight size={13} />
          </button>
        ))}
      </div>

      <div className="intent-workspace" ref={outputRef}>
        <div className="intent-section-title">
          <h3>
            <SlidersHorizontal size={17} />
            当前出行条件
          </h3>
          <div>
            <button
              onClick={() => setManual(manual ? null : clone(brief))}
              disabled={busy}
              aria-expanded={!!manual}
            >
              手动核对 <ChevronDown size={14} />
            </button>
            <button
              disabled={busy || !history.length}
              onClick={undo}
              aria-label="撤销上一轮条件修改"
            >
              <RotateCcw size={14} />
              撤销
            </button>
          </div>
        </div>
        <div className="intent-constraints">
          <span>
            <b>{brief.city}</b> · {brief.date}
          </span>
          <span>
            <Clock3 size={14} />
            {brief.startTime} 首站 · 最多
            {minutesLabel(brief.maxDurationMinutes)}
          </span>
          <span>
            <Wallet size={14} />
            全天 ¥{brief.budget}/人
          </span>
          <span>
            <Users size={14} />
            {brief.people} 人 · {brief.weather}情景
          </span>
          <span>
            {brief.indoorOnly ? "只去室内 · " : ""}
            {brief.interests.length ? brief.interests.join(" / ") : "兴趣不限"}
          </span>
          {!!brief.excludedInterests?.length && (
            <span className="intent-excluded">
              避开：{brief.excludedInterests.join("、")}
            </span>
          )}
        </div>
        <p className="intent-context-note">
          没提到的条件沿用上方值。餐饮预留 ¥{brief.mealBudget}、交通预留 ¥
          {brief.transportBudget}{" "}
          已计入全天费用；首站前及末站后交通、用餐时段需要另留时间。
        </p>
        {!!p.initialActivities?.length && (
          <p className="intent-context-note">
            这里会按新条件重新组合活动；采用前可比较，旧计划暂时保留。新方案按目录预留费用，原有单站金额校正需在采用后重新核对。
          </p>
        )}

        {manual && (
          <form
            className="intent-manual"
            onSubmit={(e) => {
              e.preventDefault();
              applyManual();
            }}
          >
            <div className="intent-fields">
              <label>
                城市
                <select
                  value={manual.city}
                  onChange={(e) => edit("city", e.target.value as City)}
                >
                  {["上海", "杭州", "北京"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                日期
                <input
                  type="date"
                  required
                  value={manual.date}
                  onChange={(e) => edit("date", e.target.value)}
                />
              </label>
              <label>
                首站开始
                <input
                  type="time"
                  required
                  value={manual.startTime}
                  onChange={(e) => edit("startTime", e.target.value)}
                />
              </label>
              <label>
                可用分钟
                <input
                  type="number"
                  min={60}
                  max={720}
                  step={1}
                  required
                  value={manual.maxDurationMinutes}
                  onChange={(e) =>
                    edit("maxDurationMinutes", Number(e.target.value))
                  }
                />
              </label>
              <label>
                全天预算 / 人
                <input
                  type="number"
                  min={0}
                  max={100000}
                  step={0.01}
                  required
                  value={manual.budget}
                  onChange={(e) => edit("budget", Number(e.target.value))}
                />
              </label>
              <label>
                同行人数
                <input
                  type="number"
                  min={1}
                  max={12}
                  step={1}
                  required
                  value={manual.people}
                  onChange={(e) => edit("people", Number(e.target.value))}
                />
              </label>
              <label>
                天气情景
                <select
                  value={manual.weather}
                  onChange={(e) => edit("weather", e.target.value as Weather)}
                >
                  {["晴天", "多云", "下雨"].map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
              </label>
              <label>
                餐饮预留 / 人
                <input
                  type="number"
                  min={0}
                  max={10000}
                  step={0.01}
                  required
                  value={manual.mealBudget}
                  onChange={(e) => edit("mealBudget", Number(e.target.value))}
                />
              </label>
              <label>
                交通预留 / 人
                <input
                  type="number"
                  min={0}
                  max={10000}
                  step={0.01}
                  required
                  value={manual.transportBudget}
                  onChange={(e) =>
                    edit("transportBudget", Number(e.target.value))
                  }
                />
              </label>
            </div>
            <div className="intent-manual-interests">
              {interests.map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={manual.interests.includes(value)}
                  onClick={() => {
                    edit(
                      "interests",
                      manual.interests.includes(value)
                        ? manual.interests.filter((x) => x !== value)
                        : [...manual.interests, value],
                    );
                    if (!manual.interests.includes(value))
                      edit(
                        "excludedInterests",
                        (manual.excludedInterests || []).filter(
                          (x) => x !== value,
                        ),
                      );
                  }}
                >
                  {value}
                </button>
              ))}
              <label>
                <input
                  type="checkbox"
                  checked={!!manual.indoorOnly}
                  onChange={(e) => edit("indoorOnly", e.target.checked)}
                />
                只去室内
              </label>
              {!!manual.excludedInterests?.length && (
                <button
                  type="button"
                  onClick={() => edit("excludedInterests", [])}
                >
                  清除排除项
                </button>
              )}
            </div>
            <div className="intent-manual-actions">
              <button type="button" onClick={() => setManual(null)}>
                取消核对
              </button>
              <button className="primary" type="submit">
                按这些条件查看方案
              </button>
            </div>
          </form>
        )}

        {message && (
          <div
            className={`intent-update${revision?.blocked ? " is-blocked" : ""}`}
            role="status"
          >
            <span>
              {revision?.blocked
                ? "这轮需求还不能执行"
                : firstRevision
                  ? "已整理好这次出行需求"
                  : "这一轮的调整"}
            </span>
            <p>{message}</p>
            {changes &&
              (firstRevision ? (
                <details>
                  <summary>
                    已更新 {revision!.changes.length} 项条件 · 展开核对变化
                  </summary>
                  {changes}
                </details>
              ) : (
                changes
              ))}
            {!revision?.changes.length &&
              revision?.recognized.map((text, i) => (
                <small key={i}>{text}</small>
              ))}
          </div>
        )}
        {!!unknowns.length && (
          <div className="intent-unresolved">
            <h4>这些要求还没有纳入方案</h4>
            <ul>
              {unknowns.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            {!revision?.blocked && (
              <label>
                <input
                  type="checkbox"
                  checked={acceptedUnknowns}
                  onChange={(e) => setAcceptedUnknowns(e.target.checked)}
                />
                我会另行核对这些要求，先参考已识别条件的方案
              </label>
            )}
          </div>
        )}
        {!requested && !revision?.blocked && (
          <div className="intent-get-started">
            <MessageCircle size={22} />
            <p>可以先描述需求，也可以直接核对上方默认条件。</p>
            <button
              disabled={busy}
              onClick={() => {
                setRequested(true);
                setMessage("先按上方条件比较方案；可以继续补充需求。");
              }}
            >
              先按当前条件看看
              <ArrowRight size={14} />
            </button>
          </div>
        )}
        {requested && !revision?.blocked && (
          <div className="intent-results">
            <div className="intent-result-heading">
              <h3>
                {proposals.length
                  ? `${proposals.length} 份可供比较的周末方案`
                  : "当前条件没有合适组合"}
              </h3>
              <span>预算 · 时长 · 室内外 · 已知开放校验</span>
            </div>
            {proposals.length ? (
              proposals.map((proposal, index) => {
                const selected = proposal.activityIds.map(
                  (id) => activities.find((a) => a.id === id)!,
                );
                const trip = buildItinerary(selected, proposal.options);
                return (
                  <article className="intent-proposal" key={proposal.id}>
                    <div className="intent-proposal-top">
                      <span>方案 {String(index + 1).padStart(2, "0")}</span>
                      <strong>
                        ¥{proposal.totalPerPerson}
                        <small>/人 · 含餐饮交通</small>
                      </strong>
                    </div>
                    <h4>{proposal.title}</h4>
                    <p className="intent-proposal-time">
                      {proposal.options.startTime} 首站 →{" "}
                      {trip.stops.at(-1)?.end.slice(11, 16)} 结束 · 约
                      {minutesLabel(proposal.durationMinutes)}
                    </p>
                    <ol>
                      {trip.stops.map((stop) => (
                        <li key={stop.activity.id}>
                          <span>{stop.start.slice(11, 16)}</span>
                          <div>
                            <b>{stop.activity.evidence.venueName}</b>
                            <small>{stop.activity.evidence.address}</small>
                          </div>
                        </li>
                      ))}
                    </ol>
                    <div className="intent-reasons">
                      {proposal.reasons.slice(0, 3).map((reason) => (
                        <p key={reason}>
                          <Check size={13} />
                          {reason}
                        </p>
                      ))}
                    </div>
                    {!!proposal.tradeoffs.length && (
                      <p className="intent-tradeoff">
                        取舍：{proposal.tradeoffs.join("；")}
                      </p>
                    )}
                    <details>
                      <summary>核对来源与估算范围</summary>
                      <p>
                        费用为预留，转场暂按25分钟；用餐与往返时间另留。场次、预约与临时开放以官方为准。
                      </p>
                      {selected.map((a) => (
                        <a
                          key={a.id}
                          target="_blank"
                          rel="noopener noreferrer"
                          href={
                            a.evidence.booking.url || a.evidence.sources[0].url
                          }
                        >
                          {a.evidence.venueName} · 官方信息
                          <ArrowUpRight size={13} />
                        </a>
                      ))}
                    </details>
                    <button
                      className="primary intent-adopt"
                      disabled={!canAdopt}
                      onClick={() => p.onAdopt(proposal)}
                    >
                      采用方案 {index + 1}
                      <ArrowRight size={16} />
                    </button>
                    {!canAdopt && (
                      <small className="intent-adopt-note">
                        先核对上方未覆盖要求，再决定是否采用。
                      </small>
                    )}
                  </article>
                );
              })
            ) : (
              <div className="intent-empty">
                <ul>
                  {explainWeekendConstraints(brief).map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
                <p>
                  本版本只安排所选日期内、22:00前结束的一天。不自动放宽你的预算、时间或排除项。
                </p>
                <button disabled={busy} onClick={() => setManual(clone(brief))}>
                  调整一个条件再试
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="intent-boundary">
        <ShieldCheck size={15} />
        <p>
          计划先预览、修改可撤销、采用需确认。
          {modelEndpoint
            ? "模型只理解出行条件，不能确认票务事实。"
            : "本模式未接入大模型。"}
          不自动发送邀请、预约或付款。
        </p>
      </div>
      <button className="intent-close-draft" onClick={p.onClose}>
        关闭草稿，保留原计划
      </button>
    </section>
  );
}
