import { asset } from "./paths";

export const categories = ["全部", "展览", "市集", "演出", "户外"] as const;
export type Category = (typeof categories)[number];
export type City = "上海" | "杭州" | "北京";
export type Weather = "晴天" | "多云" | "下雨";

export interface Activity {
  id: string;
  city: City;
  title: string;
  subtitle: string;
  category: Exclude<Category, "全部">;
  indoor: boolean;
  /** Per-person illustrative budget in RMB, not a live ticket quote. */
  price: number;
  duration: string;
  location: string;
  transport: string;
  time: string;
  image: string;
  tags: string[];
  description: string;
  tips: string[];
  route: { time: string; title: string; detail: string }[];
  capacity: number;
  joined: number;
}

/** All activities, schedules, budgets, and team counts below are prototype examples. */
export const activities: Activity[] = [
  {
    id: "sh-gallery", city: "上海", title: "在美术馆，慢下来", subtitle: "留两个小时，和艺术偶遇",
    category: "展览", indoor: true, price: 30, duration: "2–3 小时", location: "西岸 · 龙腾大道", transport: "地铁 11 号线云锦路站，步行可达", time: "周六 14:00", image: asset("gallery.jpg"),
    tags: ["艺术漫游", "室内不怕雨", "学生友好"],
    description: "从一张喜欢的画开始，把看展变成自己的周末仪式。逛完在江边聊聊感受，不用做功课，也不必看懂每件作品。此路线为体验示例，展览、票价和开放时间请以场馆公告为准。",
    tips: ["出发前查看场馆预约要求，学生票需携带有效证件", "预留往返交通费用，示例预算不含餐饮", "雨天可直接在馆内完成全程"],
    route: [{ time: "14:00", title: "在入口碰面", detail: "确认预约与票务，轻装入馆" }, { time: "14:15", title: "自由看展", detail: "选三件让你停下来的作品" }, { time: "16:00", title: "交换一张照片", detail: "在允许拍照的区域记录灵感" }], capacity: 4, joined: 2,
  },
  {
    id: "sh-market", city: "上海", title: "收集街角的小美好", subtitle: "旧物、咖啡，还有计划外的惊喜",
    category: "市集", indoor: false, price: 50, duration: "2–3 小时", location: "静安 · 安义路周边", transport: "地铁 2 / 7 号线静安寺站", time: "周六 15:00", image: asset("market.jpg"),
    tags: ["街区漫步", "手作好物", "朋友出游"],
    description: "一起逛街区，挑一件有故事的小物，给周末留一杯咖啡的时间。此为市集探索示例，具体市集是否举办需提前核实；没有市集时也可以沿街散步。",
    tips: ["50 元是自选消费预算，无需为了打卡购物", "雨天优先切换室内活动", "与朋友约定集合点，保管好随身物品"],
    route: [{ time: "15:00", title: "地铁站集合", detail: "一起走向街区" }, { time: "15:20", title: "寻宝一小时", detail: "给自己设定一个小预算" }, { time: "16:30", title: "咖啡与分享", detail: "聊聊今天发现的好物" }], capacity: 6, joined: 3,
  },
  {
    id: "sh-music", city: "上海", title: "把周末调成现场模式", subtitle: "站在人群里，听一首陌生的歌",
    category: "演出", indoor: true, price: 98, duration: "2 小时", location: "长宁 · 愚园路周边", transport: "地铁 2 / 11 号线江苏路站", time: "周六 19:00", image: asset("music.jpg"),
    tags: ["独立音乐", "室内不怕雨", "夜间灵感"],
    description: "找一家小型现场，和朋友交换歌单，把忙碌的一周留在门外。此为演出体验示例，不对应已确认场次；请通过场地方或正规票务渠道核实演出信息。",
    tips: ["确认演出场次、入场年龄与票务规则", "提前规划散场返程，不在陌生链接付款", "对声音敏感可准备耳塞"],
    route: [{ time: "19:00", title: "提前到场", detail: "核验票务，找到合适位置" }, { time: "19:30", title: "现场时刻", detail: "让音乐接管这个晚上" }, { time: "21:00", title: "一起返程", detail: "确认末班车时间" }], capacity: 4, joined: 1,
  },
  {
    id: "sh-nature", city: "上海", title: "沿着江风，散个长步", subtitle: "不用远行，也能找到一片旷野",
    category: "户外", indoor: false, price: 0, duration: "2 小时 · 约 4 km", location: "徐汇滨江 · 龙腾大道", transport: "地铁 11 号线云锦路站", time: "周日 15:30", image: asset("nature.jpg"),
    tags: ["免费出走", "轻徒步", "江边日落"],
    description: "选一段平缓的滨江步道，带上水和一双舒服的鞋，慢慢走到天色变柔。推荐距离是示例，可随体力缩短；不安排偏僻或未开放路段。",
    tips: ["免费指步道探索，往返交通与饮食另计", "遇降雨、大风或步道关闭时改为室内", "结伴也要量力而行，不追赶日落"],
    route: [{ time: "15:30", title: "轻装集合", detail: "检查饮水与天气" }, { time: "15:45", title: "沿江慢行", detail: "按体力选择开放步道" }, { time: "17:00", title: "风景停留", detail: "拍照休息，天黑前返程" }], capacity: 6, joined: 4,
  },
  {
    id: "hz-gallery", city: "杭州", title: "把一下午留给艺术", subtitle: "湖边的安静，也藏在展厅里",
    category: "展览", indoor: true, price: 0, duration: "2 小时", location: "南山路 · 美术馆周边", transport: "公交至南山路周边，按场馆位置选择站点", time: "周六 14:00", image: asset("gallery.jpg"),
    tags: ["艺术漫游", "免费灵感", "室内不怕雨"],
    description: "选择可预约的免费公共展览，从南山路开始一段安静的艺术漫游。此为示例路线，免费展览、开放时间与预约名额需以场馆当天公告为准。",
    tips: ["优先查看官方预约入口", "免费预算不包含交通、餐饮或特展门票", "尊重展厅摄影与安静参观要求"],
    route: [{ time: "14:00", title: "展馆前集合", detail: "核验开放信息与预约" }, { time: "14:15", title: "慢慢看展", detail: "用自己的节奏观看" }, { time: "16:00", title: "写一句感受", detail: "把灵感存进打卡记录" }], capacity: 4, joined: 2,
  },
  {
    id: "hz-market", city: "杭州", title: "运河边的寻宝下午", subtitle: "在小店里，捡到周末的松弛感",
    category: "市集", indoor: false, price: 40, duration: "3 小时", location: "拱宸桥 · 小河直街周边", transport: "地铁至大运河周边后步行或公交接驳", time: "周六 14:30", image: asset("market.jpg"),
    tags: ["运河散步", "手作小店", "低预算"],
    description: "沿运河逛逛小店，把探索和休息安排在同一个下午。市集与摊位为场景示例，出发前请确认当周活动；预算由你决定。",
    tips: ["街区较长，建议穿舒适的鞋", "40 元为自选消费示例，交通另计", "下雨时改去室内展览"],
    route: [{ time: "14:30", title: "桥边碰面", detail: "确定一处清晰的集合点" }, { time: "15:00", title: "沿街寻宝", detail: "慢慢看手作和旧物" }, { time: "17:00", title: "河边休息", detail: "记录今天的小发现" }], capacity: 6, joined: 3,
  },
  {
    id: "hz-music", city: "杭州", title: "听见城市的另一面", subtitle: "一场小型现场，一次情绪充电",
    category: "演出", indoor: true, price: 88, duration: "2 小时", location: "拱墅 · 运河文化街区周边", transport: "根据实际场地选择地铁与公交", time: "周六 19:30", image: asset("music.jpg"),
    tags: ["音乐现场", "室内不怕雨", "夜间灵感"],
    description: "和同频的人听一场小型演出，不用很懂音乐，也可以享受现场。此为探索示例，尚未关联真实艺人、场次或售票信息。",
    tips: ["票价 88 元仅为预算示例", "通过官方渠道确认场地和场次", "约好散场碰面位置与返程方式"],
    route: [{ time: "19:00", title: "提前到场", detail: "确认票务及入场规则" }, { time: "19:30", title: "沉浸现场", detail: "给自己两小时的音乐时间" }, { time: "21:30", title: "安心返程", detail: "分享歌单，确认交通" }], capacity: 4, joined: 2,
  },
  {
    id: "hz-nature", city: "杭州", title: "去西湖，走一段秋天", subtitle: "把消息静音，让风景上线",
    category: "户外", indoor: false, price: 0, duration: "2–3 小时 · 约 4 km", location: "西湖 · 苏堤周边", transport: "公交至苏堤周边，依实际出发地规划", time: "周日 09:30", image: asset("nature.jpg"),
    tags: ["免费出走", "轻徒步", "湖边漫游"],
    description: "在开放的湖边步道走一小段，不追求步数，只想把周末还给自己。路线与时长为示例，遇恶劣天气或拥挤时及时调整。",
    tips: ["带好水、防晒与防滑鞋", "不进入未开放区域，雨天切换室内", "免费指步道，交通与餐饮自理"],
    route: [{ time: "09:30", title: "苏堤周边集合", detail: "确认天气与同行人数" }, { time: "09:45", title: "湖边慢走", detail: "按体力调整距离" }, { time: "11:30", title: "停下来看看", detail: "拍照休息后自由返程" }], capacity: 6, joined: 4,
  },
  {
    id: "bj-gallery", city: "北京", title: "在 798，遇见新视角", subtitle: "艺术、建筑与一点点好奇心",
    category: "展览", indoor: true, price: 40, duration: "3 小时", location: "朝阳 · 798 艺术区", transport: "地铁与公交接驳，按具体展馆规划", time: "周六 13:30", image: asset("gallery.jpg"),
    tags: ["艺术漫游", "室内不怕雨", "建筑观察"],
    description: "从一个小展厅开始，给周末换一种观看城市的方式。此为展览探索示例，40 元为预算占位，不代表园区或任一展馆的实际收费。",
    tips: ["先确定展馆和预约要求，再规划路线", "园区内步行较多，穿舒适的鞋", "雨天选择同一建筑内的展厅"],
    route: [{ time: "13:30", title: "展馆前集合", detail: "核验预约和门票" }, { time: "14:00", title: "寻找新视角", detail: "记录最喜欢的一件作品" }, { time: "16:00", title: "交换灵感", detail: "把观展感受写进打卡" }], capacity: 4, joined: 2,
  },
  {
    id: "bj-market", city: "北京", title: "雨天也能逛的小市集", subtitle: "在室内，找到手作的温度",
    category: "市集", indoor: true, price: 50, duration: "2 小时", location: "朝阳 · 望京文化空间周边", transport: "地铁至望京片区后按具体场地步行", time: "周日 14:00", image: asset("market.jpg"),
    tags: ["室内市集", "手作好物", "朋友出游"],
    description: "挑一个室内文化空间，慢慢逛手作与设计小物。此活动仅是室内市集场景示例，并未确认实际举办场次，出发前需核实官方信息。",
    tips: ["确认具体活动地址及是否收取入场费", "50 元是购物预算示例，可不消费", "小队分开逛时约好再次集合时间"],
    route: [{ time: "14:00", title: "室内入口集合", detail: "确认活动信息与入场规则" }, { time: "14:15", title: "手作探索", detail: "发现喜欢的小物与设计" }, { time: "16:00", title: "交换今日发现", detail: "合影或文字打卡" }], capacity: 6, joined: 3,
  },
  {
    id: "bj-music", city: "北京", title: "给周末加一点节奏", subtitle: "从耳机里的歌，走到舞台前",
    category: "演出", indoor: true, price: 108, duration: "2 小时", location: "东城 · 鼓楼周边", transport: "地铁 2 / 8 号线鼓楼大街站", time: "周六 19:00", image: asset("music.jpg"),
    tags: ["独立音乐", "室内不怕雨", "朋友出游"],
    description: "在熟悉的城市听一点新声音，和朋友一起收集难忘的副歌。此为现场演出示例，不代表真实场次、票价或可售库存。",
    tips: ["108 元为预算示例，购票前核实官方票价", "不向陌生组队用户转账订票", "提前确认散场后的公共交通"],
    route: [{ time: "18:30", title: "场地附近集合", detail: "验票前确认同行伙伴" }, { time: "19:00", title: "进入现场", detail: "尊重现场拍摄规定" }, { time: "21:00", title: "分享歌单", detail: "一起走向公共交通站点" }], capacity: 4, joined: 1,
  },
  {
    id: "bj-nature", city: "北京", title: "城市公园的放空计划", subtitle: "不必翻山越岭，也能亲近自然",
    category: "户外", indoor: false, price: 0, duration: "2 小时 · 约 4 km", location: "朝阳 · 奥林匹克森林公园周边", transport: "地铁 8 号线森林公园南门站", time: "周日 10:00", image: asset("nature.jpg"),
    tags: ["免费出走", "公园漫步", "轻徒步"],
    description: "走一段平缓的公园步道，和朋友聊天，或者一个人放空。路线是规划示例，请按当天开放信息与空气、天气状况调整。",
    tips: ["出发前查看天气、空气质量和公园开放公告", "携带饮水，选择适合体力的路线", "免费指步道探索，交通和餐饮另计"],
    route: [{ time: "10:00", title: "南门附近集合", detail: "确认公园开放与天气" }, { time: "10:15", title: "树影下慢走", detail: "选择开放的平缓步道" }, { time: "12:00", title: "留下今日足迹", detail: "休息后按约定返程" }], capacity: 6, joined: 4,
  },
];

export interface RecommendationFilters {
  city: string;
  category: string;
  budget: number;
  weather: string;
  people: number;
  query: string;
}

export type RecommendedActivity = Activity & { score: number; reasons: string[] };

/** Transparent local rules: scores order results; they are not probabilities or live AI claims. */
export function recommend(items: Activity[], filters: RecommendationFilters): RecommendedActivity[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return items
    .filter((item) => item.city === filters.city)
    .filter((item) => filters.category === "全部" || item.category === filters.category)
    .filter((item) => filters.budget >= 999 || item.price <= filters.budget)
    .filter((item) => filters.weather !== "下雨" || item.indoor)
    .filter((item) => !query || [item.title, item.subtitle, item.location, ...item.tags].join(" ").toLocaleLowerCase().includes(query))
    .map((item) => {
      let score = 60;
      const reasons: string[] = [];
      if (filters.category !== "全部") { score += 12; reasons.push(`符合你喜欢的${item.category}`); }
      if (filters.weather === "下雨") { score += 16; reasons.push("雨天优先，室内安心逛"); }
      else if (!item.indoor) { score += filters.weather === "晴天" ? 16 : 12; reasons.push(filters.weather === "晴天" ? "好天气，适合出去走走" : "多云天气，适合轻松漫步"); }
      else { score += 8; reasons.push("室内活动，天气变化也从容"); }
      if (item.price === 0) { score += 10; reasons.push("活动预算 ¥0，轻松出发"); }
      else if (filters.budget < 999) { score += 8; reasons.push(`人均约 ¥${item.price}，在预算内`); }
      else { score += 5; reasons.push(`人均参考 ¥${item.price}`); }
      if (filters.people === 1 && ["展览", "户外"].includes(item.category)) { score += 10; reasons.push("一个人也能自在探索"); }
      else if (filters.people > 1 && item.capacity >= filters.people) { score += 8; reasons.push(`适合 ${filters.people} 人结伴出发`); }
      return { ...item, score: Math.min(score, 99), reasons: reasons.slice(0, 3) };
    })
    .sort((a, b) => b.score - a.score || a.price - b.price || a.id.localeCompare(b.id));
}
