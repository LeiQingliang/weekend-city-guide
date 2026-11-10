import { ArrowUpRight, CalendarDays, Check, Clock3, ExternalLink, MapPin, Plus, ShieldCheck, Ticket, TrainFront, Users } from "lucide-react";
import type { Activity } from "../data";
import { mapSearchUrl } from "./ExploreMap";
import { planningPriceLabel } from "./Explorer";
export default function ActivityDetails({ activity:a, people, selected, onAdd, onTeam }: {
  activity:Activity; people:number; selected:boolean; onAdd:()=>void; onTeam:()=>void;
}) {
  const e=a.evidence;
  return <div className="activity-detail">
    <div className="activity-detail-scroll">
      <div className="activity-detail-hero"><img src={a.image} alt={`${a.category}氛围参考，非场馆实拍`} /><span>{a.city} / {a.category}<small>氛围参考图</small></span></div>
      <div className="activity-detail-body">
        <span className="activity-detail-eyebrow"><ShieldCheck size={14}/>地点信息附来源 <i>{e.checkedAt} 查阅</i></span>
        <h2>{e.venueName}</h2><p className="activity-detail-subtitle">{a.title} · {a.subtitle}</p>
        <div className="activity-detail-facts"><span><Clock3 size={16}/>{a.duration}</span><span><Users size={16}/>{people} 人同行</span><span>{a.indoor ? "室内探索" : "户外探索"}</span></div>
        <div className="activity-detail-cost"><div><small>本次活动费用</small><strong>{planningPriceLabel(a)}</strong></div><p>{e.pricing.note}</p></div>
        <div className="activity-detail-address"><MapPin size={20}/><div><strong>{e.address}</strong><span>{a.transport}</span></div><a href={mapSearchUrl(a)} target="_blank" rel="noopener noreferrer">高德地图<ArrowUpRight size={15}/></a></div>
        <p className="activity-detail-description">{a.description}</p>
        <div className="activity-detail-section"><h3>出发前，先确认这两件事。</h3><div className="activity-detail-checks">
          <section><CalendarDays size={18}/><div><b>开放与时间</b><p>{e.opening.summary}</p></div></section>
          <section><Ticket size={18}/><div><b>预约与场次</b><p>{e.booking.summary}</p></div></section>
        </div>{e.booking.url && <a className="activity-official-link" href={e.booking.url} target="_blank" rel="noopener noreferrer">去官方确认{e.booking.status === "ticket-required" ? "票务与预约" : "出行信息"}<ExternalLink size={15}/></a>}</div>
        <div className="activity-detail-section"><h3>留一点时间，慢慢体验。<small>建议顺序，时间可调整</small></h3><ol className="activity-detail-route">{a.route.map((r,i)=><li key={r.title}><span>{String(i+1).padStart(2,"0")}</span><div><b>{r.title}</b><p>{r.detail}</p></div></li>)}</ol></div>
        <div className="activity-detail-tips"><TrainFront size={18}/><div><b>给这次出发的小提醒</b><ul>{a.tips.map(t=><li key={t}>{t}</li>)}</ul></div></div>
        <details className="activity-detail-sources"><summary><ShieldCheck size={15}/>信息来源与核验范围 <span>{e.sources.length} 个来源</span></summary><p>{e.summary} 本页记录的是公开信息查阅结果，非实时开放或余票保证。</p>{e.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer"><span>{s.publisher}<small>{s.title}</small></span><ArrowUpRight size={14}/></a>)}</details>
      </div>
    </div>
    <div className="activity-detail-actions"><button className="outline" onClick={onTeam}><Users size={16}/>约搭子</button><button className="primary" onClick={onAdd}>{selected?<Check size={16}/>:<Plus size={16}/>} {selected?"已加入我的周末":"加入我的周末"}</button></div>
  </div>;
}
