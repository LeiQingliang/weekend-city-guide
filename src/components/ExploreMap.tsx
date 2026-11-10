import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, MapPin, RefreshCw } from "lucide-react";
import type { Activity } from "../data";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

export function mapSearchUrl(activity: Activity) {
  return `https://uri.amap.com/search?keyword=${encodeURIComponent(activity.city + " " + (activity.evidence?.venueName || activity.location))}&city=${encodeURIComponent(activity.city)}&callnative=0`;
}

export default function ExploreMap({ items, selectedId, onSelect, plan = [] }: {
  items: Activity[];
  selectedId?: string;
  onSelect: (activity: Activity) => void;
  plan?: string[];
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const markers = useRef<Map<string, Leaflet.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const located = items.filter(a => a.evidence?.coordinates);
  const key = located.map(a => a.id).join(",") + "|" + plan.join(",");
  const selected = items.find(a => a.id === selectedId) || items[0];

  useEffect(() => {
    if (!container.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "100px" });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !container.current || !located.length) return;
    let disposed = false;
    let resize: ResizeObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setStatus("loading");
    import("leaflet").then(L => {
      if (disposed || !container.current) return;
      const instance = L.map(container.current, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
      map.current = instance;
      const layer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
        maxZoom: 19,
        keepBuffer: 1,
      });
      let loaded = 0;
      layer.on("tileload", () => { loaded++; if (!disposed) setStatus("ready"); });
      layer.addTo(instance);
      timer = setTimeout(() => { if (!disposed && loaded === 0) setStatus("error"); }, 7000);
      markers.current.clear();
      located.forEach(a => {
        const c = a.evidence!.coordinates!;
        const node = document.createElement("span");
        node.className = "explore-pin" + (plan.includes(a.id) ? " in-plan" : "");
        const number = items.findIndex(item => item.id === a.id) + 1;
        node.textContent = String(number);
        const icon = L.divIcon({ html: node, className: "explore-pin-wrap", iconSize: [36, 42], iconAnchor: [18, 42] });
        const marker = L.marker([c.lat, c.lon], { icon, keyboard: true, title: `${number}. ${a.evidence!.venueName}`, alt: a.evidence!.venueName })
          .on("click", () => onSelectRef.current(a)).addTo(instance);
        markers.current.set(a.id, marker);
      });
      instance.fitBounds(L.latLngBounds(located.map(a => [a.evidence!.coordinates!.lat, a.evidence!.coordinates!.lon] as [number, number])), { padding: [50, 60], maxZoom: 14, animate: false });
      resize = new ResizeObserver(() => instance.invalidateSize());
      resize.observe(container.current);
    }).catch(() => { if (!disposed) setStatus("error"); });
    return () => { disposed = true; clearTimeout(timer); resize?.disconnect(); map.current?.remove(); map.current = null; markers.current.clear(); };
  // The coordinate catalogue is immutable; only membership changes require rebuilding layers.
  }, [visible, key, attempt]);

  useEffect(() => {
    markers.current.forEach((marker, id) => {
      marker.getElement()?.classList.toggle("is-selected", id === selectedId);
      marker.setZIndexOffset(id === selectedId ? 500 : 0);
    });
    const marker = markers.current.get(selectedId || "");
    if (marker && map.current && !map.current.getBounds().contains(marker.getLatLng())) map.current.panTo(marker.getLatLng(), { animate: false });
  }, [selectedId, status]);

  return <section className="explore-map-panel" aria-label="活动地点地图">
    <div className="explore-map-top"><span><MapPin size={15} />把地点放在一起看</span><small>{located.length} 个位置参考</small></div>
    <div className="explore-map-stage">
      <div ref={container} className="explore-map-canvas" aria-label="可缩放地点地图，编号与下方地点对应" />
      {(status === "error" || !located.length) && <div className="explore-map-fallback" role="status">
        <MapPin size={26} /><strong>{located.length ? "地图暂时没有加载出来" : "先从这些地点开始"}</strong>
        <p>地点信息仍可查看，也可以直接在高德地图中打开。</p>
        {located.length > 0 && <button onClick={() => setAttempt(a => a + 1)}><RefreshCw size={14} />重新加载</button>}
      </div>}
      {status === "loading" && located.length > 0 && <span className="map-loading" role="status">正在加载地点地图…</span>}
    </div>
    <div className="explore-map-places">
      {items.map((a,index) => <button key={a.id} className={a.id === selected?.id ? "selected" : ""} onClick={() => onSelect(a)} aria-pressed={a.id === selected?.id}>
        <span>{a.evidence?.coordinates ? index + 1 : "·"}</span><span><b>{a.evidence?.venueName || a.location}</b><small>{a.category} · {a.indoor ? "室内" : "户外"}{plan.includes(a.id) ? " · 已在计划" : ""}</small></span>
      </button>)}
    </div>
    {selected && <a className="explore-map-link" href={mapSearchUrl(selected)} target="_blank" rel="noopener noreferrer">在高德查看「{selected.evidence?.venueName || selected.location}」<ArrowUpRight size={15} /></a>}
    <p className="explore-map-note">地图位置为参考点，不是入场口或导航路线。<a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">反馈地图问题</a></p>
  </section>;
}
