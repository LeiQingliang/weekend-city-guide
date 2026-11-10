import { useId, useMemo } from "react";
import { AlertTriangle, ArrowUpRight, Clock3, MapPin, Users } from "lucide-react";
import type { Activity } from "../data";
import { activityCostFor, buildItinerary, type PlanOptions } from "../planner";
import { mapSearchUrl } from "./ExploreMap";
import "./trip-quick-view.css";

export interface TripQuickViewProps {
  items: Activity[];
  options: PlanOptions;
  onDetail: (activity: Activity) => void;
  onTeam: (activity: Activity, start: string) => void;
  onCheckin: (activity: Activity) => void;
}

const yuan = (amount: number) => `¥${Number(amount.toFixed(2))}`;
const duration = (minutes: number) => [
  Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}小时` : "",
  minutes % 60 ? `${minutes % 60}分钟` : "",
].filter(Boolean).join(" ") || "0分钟";
const timeLabel = (stamp: string, date: string) => `${stamp.slice(0, 10) === date ? "" : `${Number(stamp.slice(5, 7))}月${Number(stamp.slice(8, 10))}日 `}${stamp.slice(11, 16)}`;

function officialUrl(activity: Activity): string | undefined {
  for (const value of [activity.evidence.booking.url, activity.evidence.sources[0]?.url]) {
    if (!value) continue;
    try {
      const parsed = new URL(value);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
    } catch {
      // A missing or malformed official link must not prevent opening the itinerary.
    }
  }
  return undefined;
}

export default function TripQuickView({ items, options, onDetail, onTeam, onCheckin }: TripQuickViewProps) {
  const headingId = useId();
  const itinerary = useMemo(() => buildItinerary(items, options), [items, options]);
  if (!itinerary.stops.length) return null;
  const date = itinerary.stops[0].start.slice(0, 10);
  const end = itinerary.stops[itinerary.stops.length - 1].end;
  const limit = typeof options.maxDurationMinutes === "number" && Number.isInteger(options.maxDurationMinutes)
    && options.maxDurationMinutes >= 60 && options.maxDurationMinutes <= 720 ? options.maxDurationMinutes : undefined;
  const warnings = [...new Set(itinerary.warnings)];

  return <section className="trip-quick-view" aria-labelledby={headingId}>
    <header className="trip-quick-header">
      <div><h2 id={headingId}>按站出发，把安排带在身边。</h2><span>{date} · {itinerary.stops.length} 站</span></div>
      <div className="trip-quick-summary">
        <span><strong>{yuan(itinerary.totalPerPerson)}</strong>/人 · 含餐饮交通</span>
        <span><Clock3 size={14} aria-hidden="true" />约 {duration(itinerary.totalMinutes)}{limit ? ` / 可用 ${duration(limit)}` : ""}</span>
        <span>预计 {timeLabel(end, date)} 结束</span>
      </div>
      <p>按计划时间查看；往返与用餐请另留时间。</p>
    </header>

    {!!warnings.length && <div className="trip-quick-warnings" role="note" aria-label="出发前仍需注意">
      <AlertTriangle size={16} aria-hidden="true" />
      <ul>{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
    </div>}

    <ol className="trip-quick-stops">
      {itinerary.stops.map((stop, index) => {
        const activity = stop.activity;
        const source = officialUrl(activity);
        const start = timeLabel(stop.start, date);
        return <li className="trip-quick-stop" key={`${activity.id}-${index}`}>
          <div className="trip-quick-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
          <article className="trip-quick-card">
            <div className="trip-quick-time">
              {index === 0 && <span className="trip-quick-first">首站开始</span>}
              <time dateTime={stop.start}>{start}</time><span aria-hidden="true">—</span><time dateTime={stop.end}>{timeLabel(stop.end, date)}</time>
            </div>
            <h3>{activity.evidence.venueName}</h3>
            <p className="trip-quick-address"><MapPin size={15} aria-hidden="true" /><span>{activity.evidence.address}</span></p>
            <div className="trip-quick-facts"><span>活动预留 <b>{yuan(activityCostFor(activity, options))}</b>/人</span><span>{activity.indoor ? "室内" : "户外"} · 停留约 {duration(stop.minutes)}</span></div>
            {(stop.transferMinutes > 0 || stop.waitingMinutes > 0) && <p className="trip-quick-timing-note">
              {stop.transferMinutes > 0 && `此前转场预留 ${stop.transferMinutes} 分钟`}
              {stop.transferMinutes > 0 && stop.waitingMinutes > 0 && "；"}
              {stop.waitingMinutes > 0 && `${stop.waitingReason === "performance" ? "等候规划演出时段" : "等候开放"}约 ${duration(stop.waitingMinutes)}`}
              （已计入总时长）
            </p>}
            <div className="trip-quick-links">
              <a className="trip-quick-map" href={mapSearchUrl(activity)} target="_blank" rel="noopener noreferrer" aria-label={`在高德查找${activity.evidence.venueName}，将在新页面打开`}><MapPin size={15} aria-hidden="true" />高德找地点<ArrowUpRight size={14} aria-hidden="true" /></a>
              {source && <a href={source} target="_blank" rel="noopener noreferrer" aria-label={`核对${activity.evidence.venueName}官方信息，将在新页面打开`}>官方信息<ArrowUpRight size={14} aria-hidden="true" /></a>}
            </div>
            <div className="trip-quick-actions">
              <button type="button" onClick={() => onDetail(activity)} aria-label={`查看${activity.evidence.venueName}详情`}>详情</button>
              <button type="button" onClick={() => onTeam(activity, stop.start)} aria-label={`按${stop.start.replace("T", " ")}在${activity.evidence.venueName}约搭子`}><Users size={14} aria-hidden="true" />{stop.start.slice(11, 16)} 约搭子</button>
              <button type="button" onClick={() => onCheckin(activity)} aria-label={`记录${activity.evidence.venueName}打卡`}>打卡</button>
            </div>
          </article>
        </li>;
      })}
    </ol>
    <p className="trip-quick-footer">官方信息与高德会在新页面打开；请核实当天开放、实际场次及费用。</p>
  </section>;
}
