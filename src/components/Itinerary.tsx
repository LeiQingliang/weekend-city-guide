import { useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, CalendarDays, Camera, Check, ChevronDown, Clock3, CloudRain, Coffee, Compass, Download, Leaf, MapPin, Plus, Route, Send, Ticket, TrainFront, Trash2, Users, Wallet, X } from "lucide-react";
import type { Activity } from "../data";
import { buildItinerary, createCalendar, type PlanOptions } from "../planner";
import "./itinerary.css";

export interface ItineraryProps {
  items: Activity[];
  options: PlanOptions;
  onOptionsChange: (next: PlanOptions) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onExplore: () => void;
  onShare: () => void;
  onTeam: (activity: Activity) => void;
  onCheckin: (activity: Activity) => void;
  onDetail: (activity: Activity) => void;
  onClear: () => void;
  onRainSwap: () => void;
}

const yuan = (value: number) => `¥${Number(value.toFixed(2))}`;
const hours = (minutes: number) => `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)} 小时` : ""}${minutes % 60 ? ` ${minutes % 60} 分钟` : ""}`.trim() || "0 分钟";
const dayLabel = (stamp: string, date: string) => stamp.slice(0, 10) === date ? "" : `${Number(stamp.slice(5, 7))}/${Number(stamp.slice(8, 10))} `;
const displayTime = (stamp: string, date: string) => `${dayLabel(stamp, date)}${stamp.slice(11, 16)}`;

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export default function Itinerary({ items, options, onOptionsChange, onRemove, onMove, onExplore, onShare, onTeam, onCheckin, onDetail, onClear, onRainSwap }: ItineraryProps) {
  const itinerary = useMemo(() => buildItinerary(items, options), [items, options]);
  const [exportStatus, setExportStatus] = useState("");
  const [showCosts, setShowCosts] = useState(false);
  const { stops, activityCost, totalPerPerson, groupTotal, totalMinutes, overBudget, warnings } = itinerary;
  const rainyOutdoors = options.weather === "下雨" && items.some(item => !item.indoor);
  const remaining = Math.max(0, options.budget - totalPerPerson);
  const chartMax = Math.max(options.budget, totalPerPerson, 1);
  const percent = (value: number) => `${Math.max(0, Math.min(100, value / chartMax * 100))}%`;
  const update = <K extends keyof PlanOptions>(key: K, value: PlanOptions[K]) => onOptionsChange({ ...options, [key]: value });
  const exportCalendar = () => { download(createCalendar(items, options), `出门啦-${options.date}.ics`, "text/calendar;charset=utf-8"); setExportStatus("日历文件已生成，请在日历应用中导入；这是个人计划，不代表活动预约成功。"); };
  const exportText = () => {
    const content = [
      `出门啦 · ${items[0]?.city || "城市"}周末计划`, `日期：${options.date}　同行：${options.people} 人　天气条件：${options.weather}（示例）`, "",
      ...stops.flatMap((stop, index) => [`${index + 1}. ${displayTime(stop.start, options.date)}–${displayTime(stop.end, options.date)} ${stop.activity.title}`, `地点：${stop.activity.location}`, `活动参考：${yuan(stop.activity.price)}/人；停留约 ${hours(stop.minutes)}${stop.transferMinutes ? `；此前转场估算 ${stop.transferMinutes} 分钟` : ""}`, `交通建议：${stop.activity.transport}`, ""]),
      `全天人均参考：${yuan(totalPerPerson)}（活动 ${yuan(activityCost)} + 餐饮 ${yuan(options.mealBudget)} + 交通 ${yuan(options.transportBudget)}）`, `${options.people} 人参考合计：${yuan(groupTotal)}　人均全天预算：${yuan(options.budget)}`, "",
      "活动与费用为示例；时间、转场均为估算，未接入实时地图，不代表预约或已确认场次。餐饮有费用预留，尚未自动安排用餐时间。出发前请核实开放、票务、交通和天气。", ...warnings,
    ].join("\n");
    download(content, `出门啦-${options.date}-行程.txt`, "text/plain;charset=utf-8"); setExportStatus("文字行程已生成，可以离线查看或发送给同行朋友。");
  };

  return <section className="itinerary-page" aria-labelledby="itinerary-title">
    <div className="itinerary-heading">
      <div><button className="itinerary-back" onClick={onExplore}><ArrowLeft size={15} />继续发现城市</button><span className="kicker">A LITTLE PLAN, A LOVELY WEEKEND</span><h1 id="itinerary-title">让心动，有个出发的计划。</h1><p>把想去的地方排进一天，时间和花费，一眼就有数。</p></div>
      <div className="itinerary-heading-actions"><button className="outline" onClick={onExplore}><Plus size={16} />添加活动</button><button className="primary" onClick={onShare} disabled={!items.length}><Send size={15} />分享行程</button></div>
    </div>

    <div className="itinerary-settings" aria-label="行程设置">
      <label><span><CalendarDays size={14} />出发日期</span><input type="date" value={options.date} onChange={event => update("date", event.target.value)} aria-label="行程出发日期" required /></label>
      <label><span><Clock3 size={14} />开始时间</span><input type="time" value={options.startTime} onChange={event => update("startTime", event.target.value)} aria-label="行程开始时间" required /></label>
      <label><span><Users size={14} />同行人数</span><select value={options.people} onChange={event => update("people", Number(event.target.value))} aria-label="行程同行人数">{[1, 2, 3, 4, 5, 6, 8, 10, 12].map(value => <option value={value} key={value}>{value} 人{value === 1 ? " · 自在出发" : ""}</option>)}</select></label>
      <label><span><Wallet size={14} />全天预算 / 人</span><div className="itinerary-money-input"><span>¥</span><input type="number" min="0" max="100000" step="5" value={options.budget} onChange={event => update("budget", Math.max(0, Number(event.target.value) || 0))} aria-label="全天人均预算" /></div></label>
      <label><span><CloudRain size={14} />天气条件</span><select value={options.weather} onChange={event => update("weather", event.target.value)} aria-label="行程天气条件"><option>多云</option><option>晴天</option><option>下雨</option></select></label>
    </div>

    {rainyOutdoors && <div className="itinerary-rain"><CloudRain size={22} /><div><strong>雨天，也给计划留个 B 面。</strong><p>清单里有室外活动，换成室内备选，再重新看看时间和预算。</p></div><button onClick={onRainSwap}>换成室内方案 <ArrowRight size={15} /></button></div>}

    <div className="itinerary-layout"><div className="itinerary-main">
      <div className="itinerary-route-heading"><div><span className="itinerary-route-tag"><Route size={14} />{items[0]?.city || "城市"}漫游计划</span><h2>{items.length ? `${items.length} 个心动，串成一天。` : "周末的空白，等你填满。"}</h2></div>{items.length > 0 && <button className="itinerary-clear" onClick={onClear}><Trash2 size={13} />清空</button>}</div>
      {items.length ? <>
        <div className="itinerary-route-summary"><span><CalendarDays size={14} />{options.date}</span><span><Clock3 size={14} />跨度约 {hours(totalMinutes)}</span><span><Users size={14} />{options.people} 人同行</span></div>
        <div className="itinerary-estimate"><Leaf size={15} /><span>按你的顺序排程 · 转场暂按 25 分钟估算 · 拖慢一点也没关系</span></div>
        <ol className="itinerary-stops">{stops.map((stop, index) => {
          const previousEnd = index ? Date.parse(`${stops[index - 1].end}:00Z`) : Date.parse(`${options.date}T${options.startTime}:00Z`);
          const wait = Math.max(0, Math.round((Date.parse(`${stop.start}:00Z`) - previousEnd) / 60000) - stop.transferMinutes);
          return <li className="itinerary-stop" key={`${stop.activity.id}-${index}`}>
            {(stop.transferMinutes > 0 || wait > 0) && <div className="itinerary-transfer"><span className="itinerary-transfer-line" /><div>{stop.transferMinutes > 0 && <span><TrainFront size={12} />转场约 {stop.transferMinutes} 分钟</span>}{wait > 0 && <span><Coffee size={12} />演出前留白约 {hours(wait)}</span>}</div></div>}
            <div className="itinerary-stop-row"><div className="itinerary-time"><strong>{displayTime(stop.start, options.date)}</strong><span>{displayTime(stop.end, options.date)}</span><i>{String(index + 1).padStart(2, "0")}</i></div>
              <article className="itinerary-stop-card">
                <button className="itinerary-stop-photo" onClick={() => onDetail(stop.activity)} aria-label={`查看${stop.activity.title}详情`}><img src={stop.activity.image} alt={`${stop.activity.category}氛围配图`} loading="lazy" /><span>{stop.activity.indoor ? "室内" : "户外"}</span></button>
                <div className="itinerary-stop-content"><div className="itinerary-stop-meta"><span>{stop.activity.category}</span><span><Clock3 size={12} />约 {hours(stop.minutes)}</span></div><button className="itinerary-stop-title" onClick={() => onDetail(stop.activity)}><h3>{stop.activity.title}</h3><ArrowUpRight size={15} /></button><p><MapPin size={13} />{stop.activity.location}</p><div className="itinerary-stop-bottom"><strong>{stop.activity.price ? yuan(stop.activity.price) : "免费"}<small> / 人·参考</small></strong><div><button onClick={() => onTeam(stop.activity)} aria-label={`为${stop.activity.title}约搭子`}><Users size={13} />约搭子</button><button onClick={() => onCheckin(stop.activity)} aria-label={`为${stop.activity.title}记录打卡`}><Camera size={13} />打卡</button></div></div></div>
                <div className="itinerary-stop-controls"><button onClick={() => onMove(stop.activity.id, -1)} disabled={index === 0} aria-label={`上移${stop.activity.title}`} title="上移"><ArrowUp size={15} /></button><button onClick={() => onMove(stop.activity.id, 1)} disabled={index === items.length - 1} aria-label={`下移${stop.activity.title}`} title="下移"><ArrowDown size={15} /></button><button onClick={() => onRemove(stop.activity.id)} aria-label={`移除${stop.activity.title}`} title="移除"><X size={15} /></button></div>
              </article></div>
          </li>;
        })}</ol>
        <div className="itinerary-finish"><span><Check size={15} /></span><div><strong>{displayTime(stops[stops.length - 1].end, options.date)} · 把好心情带回家</strong><p>这是预计结束时间；别忘了留出返程和休息的余地。</p></div></div>
        <button className="itinerary-add-stop" onClick={onExplore}><Plus size={17} />还有一个想去的地方 <ArrowRight size={15} /></button>
      </> : <div className="itinerary-empty"><div><Compass size={39} /><span>YOUR NEXT ADVENTURE</span></div><h3>先选一件，让你想出门的小事。</h3><p>去发现页，把心动的展览、散步或现场加入周末，<br />这里会帮你安排顺序、估算时间与全天花费。</p><button className="primary" onClick={onExplore}>寻找我的第一站 <ArrowRight size={16} /></button></div>}
      <div className="itinerary-disclaimer"><Route size={16} /><p>时间轴是个人规划建议，活动时段、停留时长及转场均为估算，未接入实时地图，也未确认营业或演出时间。请在出发前核实预约、天气和交通；餐饮有费用预留，时间需自行安排。</p></div>
    </div>

    <aside className="itinerary-sidebar" aria-label="行程预算与导出"><section className={`itinerary-budget-card${overBudget ? " is-over" : ""}`}><div className="itinerary-budget-title"><span><Wallet size={17} /></span><div><h2>开心，也要心里有数。</h2><p>全天参考预算 · 每人</p></div></div><div className="itinerary-budget-amount"><strong>{yuan(totalPerPerson)}</strong><span>/ 预算 {yuan(options.budget)}</span></div><div className="itinerary-budget-meter" aria-label={`人均预计花费 ${totalPerPerson} 元，预算 ${options.budget} 元`}><span className="activity" style={{ width: percent(activityCost) }} /><span className="meal" style={{ width: percent(items.length ? options.mealBudget : 0) }} /><span className="transport" style={{ width: percent(items.length ? options.transportBudget : 0) }} /></div><p className="itinerary-budget-state">{overBudget ? `超出预算 ${yuan(totalPerPerson - options.budget)}，调整一下也轻松。` : items.length ? `还留有 ${yuan(remaining)} 的余量，给偶遇一点空间。` : "加入活动后，开始估算全天花费。"}</p><dl className="itinerary-costs"><div><dt><i className="activity" /><Ticket size={13} />活动参考</dt><dd>{yuan(activityCost)}</dd></div><div><dt><i className="meal" /><Coffee size={13} />餐饮预留</dt><dd>{yuan(items.length ? options.mealBudget : 0)}</dd></div><div><dt><i className="transport" /><TrainFront size={13} />交通预留</dt><dd>{yuan(items.length ? options.transportBudget : 0)}</dd></div></dl><button className="itinerary-adjust-costs" aria-expanded={showCosts} aria-controls="itinerary-cost-fields" onClick={() => setShowCosts(!showCosts)}>调整餐饮与交通预留 <ChevronDown size={14} className={showCosts ? "expanded" : ""} /></button>{showCosts && <div id="itinerary-cost-fields" className="itinerary-cost-fields"><label>餐饮 / 人<div><span>¥</span><input type="number" min="0" max="10000" step="5" aria-label="人均餐饮预留" value={options.mealBudget} onChange={event => update("mealBudget", Math.max(0, Number(event.target.value) || 0))} /></div></label><label>交通 / 人<div><span>¥</span><input type="number" min="0" max="10000" step="5" aria-label="人均交通预留" value={options.transportBudget} onChange={event => update("transportBudget", Math.max(0, Number(event.target.value) || 0))} /></div></label></div>}<div className="itinerary-group-total"><span>{options.people} 人参考合计</span><strong>{yuan(groupTotal)}</strong></div><p className="itinerary-budget-note">活动价格为示例，餐饮与交通由你预留。此处为全天总预算，区别于发现页的单项活动预算。</p></section>
      {warnings.length > 0 && <section className="itinerary-warnings" aria-label="行程提醒"><h3><Leaf size={15} />出发前，再看一眼</h3><ul>{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></section>}
      <section className="itinerary-export"><span className="kicker">TAKE YOUR WEEKEND WITH YOU</span><h3>把计划，装进口袋。</h3><p>离线也能看，到了周末就出发。</p><button onClick={exportCalendar} disabled={!items.length}><CalendarDays size={16} /><span>导出到日历<small>.ics 文件 · 上海时区</small></span><Download size={15} /></button><button onClick={exportText} disabled={!items.length}><Download size={16} /><span>下载文字行程<small>路线、时间与花费，一份带走</small></span><ArrowDown size={15} /></button>{exportStatus && <p className="itinerary-export-status" role="status"><Check size={13} />{exportStatus}</p>}</section>
      {items.length > 0 && <button className="itinerary-team-cta" onClick={() => onTeam(items[0])}><Users size={20} /><span><strong>好计划，一起走。</strong><small>从第一站发起周末小队</small></span><ArrowRight size={17} /></button>}
    </aside></div>
  </section>;
}
