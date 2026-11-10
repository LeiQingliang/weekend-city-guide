export interface EvidenceSource {
  title: string;
  url: string;
  publisher: string;
}

export interface WeeklyOpening {
  /** JavaScript weekday: 0 = Sunday, 1 = Monday. Holiday exceptions need rechecking. */
  days: number[];
  open: string;
  close: string;
  lastEntry?: string;
}

export interface ActivityEvidence {
  kind: "venue" | "public-space" | "route-inspiration";
  venueName: string;
  address: string;
  /** Date the linked information was reviewed, not a live availability timestamp. */
  checkedAt: string;
  summary: string;
  sources: EvidenceSource[];
  opening: {
    status: "published" | "check-official" | "public-space";
    summary: string;
    weeklyHours?: WeeklyOpening[];
    closedWeekdays?: number[];
  };
  booking: {
    status: "ticket-required" | "check-official" | "not-required";
    summary: string;
    url?: string;
  };
  pricing: {
    kind: "official-free" | "planning-estimate" | "optional-spend";
    note: string;
  };
  eventStatus: "not-applicable" | "schedule-unconfirmed";
  /** WGS84 from a manually checked OpenStreetMap match; not a navigation entrance. */
  coordinates?: {
    lat: number;
    lon: number;
    source: "OpenStreetMap";
    sourceUrl: string;
    checkedAt: string;
    precision: "venue" | "area";
  };
}

const checkedAt = "2026-11-10";
const source = (title: string, url: string, publisher: string): EvidenceSource => ({ title, url, publisher });
const venueHours = (open: string, close: string, lastEntry: string): WeeklyOpening[] => [{ days: [0, 2, 3, 4, 5, 6], open, close, lastEntry }];
const coordinates = (lat: number, lon: number, object: string, precision: "venue" | "area" = "venue"): NonNullable<ActivityEvidence["coordinates"]> => ({ lat, lon, source: "OpenStreetMap", sourceUrl: `https://www.openstreetmap.org/${object}`, checkedAt, precision });
const estimatedTicket = { kind: "planning-estimate" as const, note: "此金额为自行规划预留，未核验所选日期的实际票价；需按官方票价调整，不能据此承诺不超预算。" };
const optionalSpend = { kind: "optional-spend" as const, note: "此金额为可选购物或饮品预留，不是门票报价；不消费也可以保留街区探索计划。" };
const showOpening = { status: "check-official" as const, summary: "已确认真实演出场馆，尚未选择场次；开演、入场和散场时间均以具体演出票为准。" };

/** Stable places with traceable sources. No entry below confirms a live event or inventory. */
export const activityEvidence: Record<string, ActivityEvidence> = {
  "sh-gallery": {
    kind: "venue", venueName: "西岸美术馆", address: "上海市徐汇区龙腾大道2600号", checkedAt,
    summary: "馆方参观指南可核验地址与常规开放时间；展览及实际票价需另查当期公告。",
    sources: [source("参观指南", "https://wbmshanghai.com/zh-hans/page/visit", "西岸美术馆")],
    opening: { status: "published", summary: "周二至周日11:00–18:00，17:00停止入场；周一闭馆，法定节假日开放安排以馆方公告为准。", weeklyHours: venueHours("11:00", "18:00", "17:00"), closedWeekdays: [1] },
    booking: { status: "ticket-required", summary: "展览门票按当期项目购买；免费公众导览须另行预约并持当日展览门票。", url: "https://wbmshanghai.com/zh-hans/page/visit" },
    pricing: estimatedTicket, eventStatus: "not-applicable",
    coordinates: coordinates(31.1695893, 121.4593301, "way/745277168"),
  },
  "sh-market": {
    kind: "route-inspiration", venueName: "安义路 · 静安嘉里中心周边", address: "上海市静安区南京西路1515号、安义路周边", checkedAt,
    summary: "商业体与街区位置真实；本条是街区寻宝灵感，不代表安义夜巷本周举办。",
    sources: [source("项目介绍与位置", "https://www.jingankerrycentre.com/about", "静安嘉里中心")],
    opening: { status: "check-official", summary: "嘉里中心官网列商场营业10:00–22:00；该时间不代表安义路市集时段，市集是否举办须另查公告。" },
    booking: { status: "check-official", summary: "普通街区探索与限时市集分开确认；若专程赶集，请先查主办方当期公告。", url: "https://www.jingankerrycentre.com/" },
    pricing: optionalSpend, eventStatus: "schedule-unconfirmed",
    coordinates: coordinates(31.2247847, 121.4452639, "way/255637433", "area"),
  },
  "sh-music": {
    kind: "venue", venueName: "上海交响乐团音乐厅", address: "上海市徐汇区复兴中路1380号", checkedAt,
    summary: "市文旅局场馆名录可核验音乐厅与地址；本条只提供观演方向，未确认某场演出。",
    sources: [source("剧院剧场名录", "https://whlyj.sh.gov.cn/jyjc/20250924/65721fbdbbf0423fa4fdec4a7c86e1c6.html", "上海市文化和旅游局")],
    opening: showOpening,
    booking: { status: "ticket-required", summary: "先在上海交响乐团官方渠道选择节目与日期，再核对票价、入场规则和余票。", url: "https://www.shsymphony.cn/" },
    pricing: estimatedTicket, eventStatus: "schedule-unconfirmed",
    coordinates: coordinates(31.2134307, 121.4470838, "way/404687050"),
  },
  "sh-nature": {
    kind: "public-space", venueName: "徐汇滨江公共空间", address: "上海市徐汇区黄浦江沿岸，龙腾大道周边开放步道", checkedAt,
    summary: "官方资料确认滨江公共活动空间；4公里与停留点为自行规划示例，不是已测绘的导航线路。",
    sources: [source("徐汇滨江绿地", "https://touch.shio.gov.cn/jsp/whjljd_detail.jsp?id=55", "上海市人民政府新闻办公室·感知上海")],
    opening: { status: "public-space", summary: "选择现场开放的滨江步道；暂未录入可靠的统一开放时段，临时管控与天气以现场公告为准。" },
    booking: { status: "check-official", summary: "本计划不包含需预约的展馆、游船或观光车；具体路段开放情况出发前确认。" },
    pricing: { kind: "planning-estimate", note: "步道漫步暂按0元活动预留；未将沿途场馆、交通与餐饮计入免费项目。" }, eventStatus: "not-applicable",
  },
  "hz-gallery": {
    kind: "venue", venueName: "浙江美术馆", address: "浙江省杭州市南山路138号", checkedAt,
    summary: "馆方明示常年免费参观及日常开放时间；收费特展、特殊时期和临时闭馆另依公告。",
    sources: [source("参观须知", "https://www.zjam.org.cn/Site/news/intro/notice.shtml", "浙江美术馆")],
    opening: { status: "published", summary: "周二至周日09:00–17:00，16:30停止入馆；周一休馆，法定节假日及临时调整以馆方公告为准。", weeklyHours: venueHours("09:00", "17:00", "16:30"), closedWeekdays: [1] },
    booking: { status: "check-official", summary: "出发前查看官网或官方公众号的预约与限流要求；当前资料未据此承诺无需预约。", url: "https://www.zjam.org.cn/Site/news/intro/notice.shtml" },
    pricing: { kind: "official-free", note: "馆方明示常年免费参观；特殊时期或收费特展除外，交通和餐饮另计。" }, eventStatus: "not-applicable",
    coordinates: coordinates(30.2334209, 120.1522667, "way/420546406"),
  },
  "hz-market": {
    kind: "route-inspiration", venueName: "小河直街历史文化街区", address: "杭州市拱墅区小河直街，和睦路与小河路、长征桥路之间", checkedAt,
    summary: "政府资料可确认历史街区及范围；本条是逛街与小店探索，不保证存在周末市集或特定摊位。",
    sources: [source("大运河文化遗存——小河直街历史文化街区", "https://www.gongshu.gov.cn/art/2024/4/30/art_1229789753_59080393.html", "杭州市拱墅区政府·大运河文化研究院")],
    opening: { status: "public-space", summary: "街区与店铺营业分别确认；未核验统一开闭时间，不承诺全天可进入所有区域。" },
    booking: { status: "check-official", summary: "街区探索不包含店内体验预约；手作活动、临时市集须向商户或主办方另行确认。" },
    pricing: optionalSpend, eventStatus: "schedule-unconfirmed",
    coordinates: coordinates(30.3101367, 120.1303856, "way/234289068", "area"),
  },
  "hz-music": {
    kind: "venue", venueName: "杭州大剧院", address: "杭州市上城区钱江新城新业路39号", checkedAt,
    summary: "政府2026年公开报道与历史登记资料可交叉核验真实场馆；本条未确认所选日期的实际演出。",
    sources: [source("杭州大剧院演出报道（仅用于核验场馆）", "https://ehangzhou.gov.cn/2026-06/18/c_298038.htm", "杭州市人民政府新闻办公室英文网"), source("2013年第4期政府公报·地址登记（PDF第55页）", "https://zjjcmspublic.oss-cn-hangzhou-zwynet-d01-a.internet.cloud.zj.gov.cn/jcms_files/jcms1/web149/site/attach/0/8c5518c3dd3847f2ab4181d4ac16fcc4.pdf#page=55", "杭州市人民政府公报")],
    opening: showOpening,
    booking: { status: "check-official", summary: "请通过杭州大剧院官方公众号核实节目、日期、票价与售票渠道；本站不提供预约或购票。" },
    pricing: estimatedTicket, eventStatus: "schedule-unconfirmed",
    coordinates: coordinates(30.2466154, 120.2109931, "way/626838819"),
  },
  "hz-nature": {
    kind: "public-space", venueName: "西湖 · 苏堤", address: "杭州市西湖风景名胜区苏堤，南山路至北山街之间", checkedAt,
    summary: "杭州官方资料可核验苏堤真实存在；所推荐时长和步行距离由你自行调整。",
    sources: [source("How a poet reshaped a lake nearly 1,000 years ago", "https://www.ehangzhou.gov.cn/2026-04/30/c_297483.htm", "杭州市人民政府新闻办公室英文网")],
    opening: { status: "public-space", summary: "开放步道按现场管理通行；本条未核验全天开放承诺，遇恶劣天气或临时管控应调整。" },
    booking: { status: "check-official", summary: "计划仅含苏堤步行，不包含游船、观光车或收费景点；出发前查看景区通行公告。" },
    pricing: { kind: "planning-estimate", note: "步道漫步暂按0元活动预留，不含游船、交通、餐饮或沿途收费景点。" }, eventStatus: "not-applicable",
    coordinates: coordinates(30.2349207, 120.1375385, "way/30072145", "area"),
  },
  "bj-gallery": {
    kind: "venue", venueName: "UCCA尤伦斯当代艺术中心", address: "北京市朝阳区酒仙桥路4号798艺术区", checkedAt,
    summary: "馆方可核验北京馆地址、开放时间与购票渠道；门票依当期展览定价。",
    sources: [source("参观指南与票务", "https://ucca.org.cn/visit/", "UCCA尤伦斯当代艺术中心")],
    opening: { status: "published", summary: "周二至周日10:00–19:00，18:30最后入场；特殊展览或活动可能调整开放安排。", weeklyHours: venueHours("10:00", "19:00", "18:30"), closedWeekdays: [1] },
    booking: { status: "ticket-required", summary: "可通过UCCA官方微信、前台或馆方列明的合作渠道购票；学生优惠须按馆方规则核实。", url: "https://ucca.org.cn/visit/" },
    pricing: estimatedTicket, eventStatus: "not-applicable",
    coordinates: coordinates(39.9827566, 116.4891860, "node/5930548986"),
  },
  "bj-market": {
    kind: "venue", venueName: "潘家园旧货市场", address: "北京市朝阳区华威里18号（潘家园桥西南）", checkedAt,
    summary: "政府资料确认真实旧货市场及地址；本条为日间逛市场计划，不承诺夜市或某个摊位当天营业。",
    sources: [source("书香北京·阅读空间主题游线路", "https://www.beijing.gov.cn/renwen/whrl/rdtj/202204/t20220422_2686161.html", "北京市人民政府")],
    opening: { status: "check-official", summary: "市场与夜市安排分别核实；未采用历史夜市新闻中的营业时间作为当前承诺。" },
    booking: { status: "check-official", summary: "出发前确认市场当日开放、入口及临时活动规则；不涉及拍卖、鉴定或购票服务。" },
    pricing: optionalSpend, eventStatus: "not-applicable",
    coordinates: coordinates(39.8739206, 116.4521884, "way/25053110", "area"),
  },
  "bj-music": {
    kind: "venue", venueName: "国家大剧院", address: "北京市西城区西长安街2号", checkedAt,
    summary: "官网可核验本部地址与官方入口；观演与白天参观是不同产品，请先选具体演出。",
    sources: [source("参观购票与交通信息", "https://www.chncpa.org/cgyl_278/cggp/?kfType=1", "国家大剧院")],
    opening: showOpening,
    booking: { status: "ticket-required", summary: "选择具体演出后核对票价、入场和退改规则；参观票不能替代演出票。", url: "https://www.chncpa.org/" },
    pricing: estimatedTicket, eventStatus: "schedule-unconfirmed",
    coordinates: coordinates(39.9033490, 116.3835476, "way/4974233"),
  },
  "bj-nature": {
    kind: "public-space", venueName: "奥林匹克森林公园", address: "北京市朝阳区科荟路33号，南园可从南门方向进入", checkedAt,
    summary: "园林绿化局资料标明门票免费、暂无需预约；公园为非全天开放，通行仍以最新公告为准。",
    sources: [source("奥林匹克森林公园", "https://yllhj.beijing.gov.cn/ggfw/bjsggml/zhgy/cyq/202206/t20220614_2740317.shtml", "北京市园林绿化局"), source("Beijing Olympic Forest Park", "https://english.beijing.gov.cn/specials/ticketing/attractions/202407/t20240717_3751604.html", "北京市人民政府英文网")],
    opening: { status: "check-official", summary: "官方目录标明非全天开放；不同官方页面的季节时段存在差异，此处不固化具体开闭园时间。" },
    booking: { status: "not-required", summary: "官方目录列暂无需预约、门票免费；临时活动与管控可能调整，出发前再确认。", url: "https://yllhj.beijing.gov.cn/ggfw/bjsggml/zhgy/cyq/202206/t20220614_2740317.shtml" },
    pricing: { kind: "official-free", note: "官方目录列公园门票免费；交通、餐饮与园内另行收费项目不在内。" }, eventStatus: "not-applicable",
    coordinates: coordinates(40.0207203, 116.3849388, "way/33616744", "area"),
  },
};

export function evidenceLabel(evidence: ActivityEvidence): string {
  if (evidence.kind === "route-inspiration") return "真实街区 · 路线灵感";
  return evidence.kind === "public-space" ? "真实地点 · 自由探索" : "真实场馆 · 信息可查";
}

export function planningPriceLabel(evidence: ActivityEvidence): string {
  return evidence.pricing.kind === "official-free" ? "官方列明免费" : evidence.pricing.kind === "optional-spend" ? "可选消费预留" : "活动规划预留";
}
