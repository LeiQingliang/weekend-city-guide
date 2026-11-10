import { useEffect, useId, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import type { Activity, Weather } from "../data";
import {
  buildItinerary,
  defaultPlanOptions,
  type PlanOptions,
} from "../planner";
import "./departure-checklist.css";

export interface DepartureChecklistProps {
  activities: Activity[];
  options: PlanOptions;
  weather: Weather;
  onAction?: (
    action: "official_open" | "readiness_change",
    activityId: string,
  ) => void;
  /** Guided experiences never read or write the user's saved confirmations. */
  transient?: boolean;
}

const STORAGE_PREFIX = "weekend-city:departure:v1:";
const storageKey = (date: string, id: string) =>
  `${STORAGE_PREFIX}${date}:${encodeURIComponent(id)}`;
const yuan = (amount: number) => `¥${Number(amount.toFixed(2))}`;
const duration = (minutes: number) =>
  [
    Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}小时` : "",
    minutes % 60 ? `${minutes % 60}分钟` : "",
  ]
    .filter(Boolean)
    .join(" ") || "0分钟";

function safeOfficialUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

interface ReadinessState {
  scope: string;
  checked: Record<string, boolean>;
  storageUnavailable: boolean;
}

function readConfirmations(
  scope: string,
  keys: string[],
  transient: boolean,
): ReadinessState {
  const result: ReadinessState = {
    scope,
    checked: {},
    storageUnavailable: false,
  };
  if (transient || typeof window === "undefined") return result;
  try {
    for (const key of keys)
      result.checked[key] = window.localStorage.getItem(key) === "1";
  } catch {
    result.storageUnavailable = true;
  }
  return result;
}

export default function DepartureChecklist({
  activities,
  options,
  weather,
  onAction,
  transient = false,
}: DepartureChecklistProps) {
  const titleId = useId();
  const itinerary = useMemo(
    () => buildItinerary(activities, { ...options, weather }),
    [activities, options, weather],
  );
  const visits = useMemo(
    () => [
      ...new Map(
        itinerary.stops.map((stop) => {
          const date = stop.start.slice(0, 10);
          return [
            stop.activity.id,
            {
              activity: stop.activity,
              date,
              time: stop.start.slice(11, 16),
              key: storageKey(date, stop.activity.id),
            },
          ];
        }),
      ).values(),
    ],
    [itinerary],
  );
  const keysKey = JSON.stringify(visits.map((visit) => visit.key).sort());
  const date =
    /^\d{4}-\d{2}-\d{2}$/.test(options.date) &&
    Number.isFinite(Date.parse(`${options.date}T00:00:00Z`)) &&
    new Date(`${options.date}T00:00:00Z`).toISOString().slice(0, 10) ===
      options.date
      ? options.date
      : defaultPlanOptions.date;
  // The existing YYYY-MM-DD:activity key remains compatible for same-day visits.
  // Demo confirmations use only this component's memory, including date changes.
  const scope = transient ? "experience" : `saved:${keysKey}`;
  const [state, setState] = useState<ReadinessState>(() =>
    readConfirmations(scope, JSON.parse(keysKey) as string[], transient),
  );

  useEffect(() => {
    if (transient) {
      setState((previous) =>
        previous.scope === scope
          ? previous
          : { scope, checked: {}, storageUnavailable: false },
      );
      return;
    }
    const storageKeys = JSON.parse(keysKey) as string[];
    const refresh = () =>
      setState(readConfirmations(scope, storageKeys, false));
    refresh();
    const keys = new Set(storageKeys);
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || keys.has(event.key)) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [keysKey, scope, transient]);

  const checked = state.scope === scope ? state.checked : {};
  const remaining = visits.filter((visit) => !checked[visit.key]).length;
  const visitDates = [...new Set(visits.map((visit) => visit.date))];
  const visitDateLabel = visitDates
    .map((value) => `${value.slice(5).replace("-", "月")}日`)
    .join("、");
  const lastStop = itinerary.stops.at(-1);
  const endTime = lastStop
    ? `${lastStop.end.slice(0, 10) !== date ? `${Number(lastStop.end.slice(5, 7))}/${Number(lastStop.end.slice(8, 10))} ` : ""}${lastStop.end.slice(11, 16)}`
    : "";
  const rainyStops =
    weather === "下雨"
      ? visits
          .map((visit) => visit.activity)
          .filter((activity) => !activity.indoor)
      : [];
  const warnings = [
    ...itinerary.openingConflicts,
    ...(rainyStops.length
      ? [
          `雨天仍有户外站点：${rainyStops.map((activity) => activity.evidence.venueName).join("、")}。建议换室内备选，或先确认现场开放与通行。`,
        ]
      : []),
    ...(itinerary.overBudget
      ? [
          itinerary.warnings.find((warning) =>
            warning.startsWith("预计每人超出全天预算"),
          ) || "当前规划费用超过全天预算，请核对并调整金额或活动。",
        ]
      : []),
  ];

  const changeReadiness = (key: string, id: string, nextChecked: boolean) => {
    let failed = false;
    if (!transient) {
      try {
        if (nextChecked) window.localStorage.setItem(key, "1");
        else window.localStorage.removeItem(key);
      } catch {
        failed = true;
      }
    }
    setState((previous) => ({
      scope,
      checked: {
        ...(previous.scope === scope ? previous.checked : {}),
        [key]: nextChecked,
      },
      storageUnavailable:
        failed || (previous.scope === scope && previous.storageUnavailable),
    }));
    onAction?.("readiness_change", id);
  };

  if (!activities.length) return null;

  return (
    <section className="departure-checklist" aria-labelledby={titleId}>
      <div className="departure-heading">
        <ShieldCheck size={19} aria-hidden="true" />
        <h2 id={titleId}>出发前，确认这几件事</h2>
        <span
          className={`departure-count${remaining ? "" : " is-checked"}`}
          aria-live="polite"
        >
          {!remaining && <CheckCircle2 size={13} aria-hidden="true" />}
          {remaining ? `${remaining} 处待核对` : "已完成个人核对"}
        </span>
      </div>
      <div className="departure-brief" aria-label="当前行程估算">
        <span>
          <strong>{yuan(itinerary.totalPerPerson)}</strong>/人 · 含餐饮交通
        </span>
        <span>
          <Clock3 size={13} aria-hidden="true" />约{" "}
          {duration(itinerary.totalMinutes)}
        </span>
        <span>预计 {endTime} 结束</span>
      </div>
      {!!warnings.length && (
        <div
          className="departure-warnings"
          role="note"
          aria-label="仍需处理的出发提醒"
        >
          <AlertTriangle size={16} aria-hidden="true" />
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      <details className="departure-details">
        <summary>
          <span>
            {visitDateLabel} · {visits.length} 个地点的出发清单
          </span>
          <span className="departure-expand">
            <span>逐项核对</span>
            <ChevronDown size={15} aria-hidden="true" />
          </span>
        </summary>
        <div className="departure-detail-body">
          <p className="departure-boundary">
            勾选仅代表你已核对信息，不代表预约或购票成功。
            {transient
              ? "本次体验不会读取或保存你的正式核对记录。"
              : "核对状态按每站到访日期保存在当前浏览器，不随行程分享或备份迁移。"}
          </p>
          <ol className="departure-items">
            {visits.map(({ activity, date: visitDate, time, key }, index) => {
              const evidence = activity.evidence;
              const bookingUrl = safeOfficialUrl(evidence.booking.url);
              const officialUrl =
                bookingUrl || safeOfficialUrl(evidence.sources[0]?.url);
              const openingLine =
                evidence.opening.summary.split(/[；。]/)[0] ||
                evidence.opening.summary;
              return (
                <li className={checked[key] ? "is-checked" : ""} key={key}>
                  <div className="departure-item-heading">
                    <span className="departure-item-index" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3>{evidence.venueName}</h3>
                    {officialUrl ? (
                      <a
                        href={officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onAction?.("official_open", activity.id)}
                      >
                        {bookingUrl
                          ? evidence.booking.status === "ticket-required"
                            ? "官方预约与场次"
                            : "查看官方信息"
                          : "查看官方资料"}
                        <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="departure-no-source">请向场馆核实</span>
                    )}
                  </div>
                  <p className="departure-schedule">
                    预计到访：{visitDate} {time} · 按此日期核对
                  </p>
                  <p
                    className="departure-opening"
                    title={evidence.opening.summary}
                  >
                    {openingLine}。
                  </p>
                  {evidence.eventStatus === "schedule-unconfirmed" && (
                    <p className="departure-schedule">
                      尚未确认具体场次，请查看当期公告。
                    </p>
                  )}
                  <label className="departure-confirm">
                    <input
                      type="checkbox"
                      checked={!!checked[key]}
                      onChange={(event) =>
                        changeReadiness(key, activity.id, event.target.checked)
                      }
                    />
                    <span>
                      我已核对场次与开放
                      <span className="departure-sr-only">
                        ：{evidence.venueName}，{visitDate}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ol>
        </div>
      </details>
      {state.scope === scope && state.storageUnavailable && !transient && (
        <p className="departure-storage-note" role="status">
          浏览器暂时无法保存，当前勾选仅在本页有效。
        </p>
      )}
    </section>
  );
}
