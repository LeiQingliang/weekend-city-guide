import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CloudRain,
  Compass,
  MapPin,
  Play,
  Route,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { activities, type City, type Weather } from "../data";
import { asset } from "../paths";
import { type PlanOptions } from "../planner";
import {
  defaultWeekendBrief,
  recommendWeekendProposals,
  type WeekendProposal,
} from "../curation";

type Props = {
  city: City;
  people: number;
  weather: Weather;
  options: PlanOptions;
  onCustomize: () => void;
  onGuide: () => void;
  onPreview: (proposal: WeekendProposal) => void;
};
export function DiscoveryEdition({
  city,
  people,
  options,
  onCustomize,
  onGuide,
  onPreview,
}: Props) {
  const base = defaultWeekendBrief(
    city,
    { ...options, budget: 150 },
    people,
    "晴天",
  );
  const featured = recommendWeekendProposals({
    ...base,
    interests: ["展览", "户外"],
    maxDurationMinutes: 360,
  })[0];
  const themes = [
    {
      label: "把预算留给快乐",
      subtitle: "小预算，也有一整个好下午。",
      interests: ["户外", "展览"] as const,
      budget: 100,
      weather: "多云" as Weather,
      image: "nature.jpg",
      tone: "slow",
    },
    {
      label: "下雨，也照样出门",
      subtitle: "把天气的不确定，换成室内的松弛。",
      interests: ["展览"] as const,
      budget: 150,
      weather: "下雨" as Weather,
      image: "gallery.jpg",
      tone: "rain",
    },
    {
      label: "和朋友，把日子过热闹",
      subtitle: "街区、好物和随时可以聊的话题。",
      interests: ["市集", "展览"] as const,
      budget: 200,
      weather: "晴天" as Weather,
      image: "market.jpg",
      tone: "together",
    },
  ];
  return (
    <>
      <section className="edition-hero" aria-label="周末城市提案">
        <div className="edition-copy">
          <div className="edition-label">
            <span /> WEEKEND, REIMAGINED <i>城市探索提案</i>
          </div>
          <h1>
            把周末，
            <br />
            过成<span>喜欢的样子。</span>
          </h1>
          <p>
            不用远行，不必做一晚攻略。
            <br />
            从预算、天气和同伴出发，找到值得出门的一天。
          </p>
          <div className="edition-actions">
            <button className="edition-primary" onClick={onCustomize}>
              定制我的周末 <ArrowUpRight size={20} />
            </button>
            <button className="edition-play" onClick={onGuide}>
              <Play size={15} fill="currentColor" /> 90 秒体验
            </button>
          </div>
          <div className="edition-promises">
            <span>
              <Wallet size={15} />
              花费心里有数
            </span>
            <span>
              <CloudRain size={15} />
              雨天也有备选
            </span>
            <span>
              <Users size={15} />
              约上同频搭子
            </span>
          </div>
        </div>
        <div className="edition-photo">
          <img
            src={asset("city-weekend-v3.jpg")}
            alt="金色阳光下，三位年轻人在城市滨水步道散步，AI 生成氛围图"
            fetchPriority="high"
          />
          <span className="edition-photo-caption">
            THE CITY IS YOUR PLAYGROUND <span>AI 生成氛围图</span>
          </span>
          {featured && (
            <button
              className="edition-pick"
              onClick={() => onPreview(featured)}
            >
              <span className="edition-pick-top">
                <span>
                  <MapPin size={13} />
                  {city} · 一份晴天提案
                </span>
                <span>WEEKEND PICK</span>
              </span>
              <strong>{featured.title}</strong>
              <span className="edition-pick-stops">
                {featured.activityIds
                  .map((id) => activities.find((a) => a.id === id)?.category)
                  .join(" → ")}
                <i>
                  {Math.round((featured.durationMinutes / 60) * 10) / 10} 小时 ·{" "}
                  {people} 人同行
                </i>
              </span>
              <span className="edition-pick-bottom">
                <span>
                  <b>¥{featured.totalPerPerson}</b> /人 · 含餐饮交通预留
                </span>
                <span className="edition-pick-arrow">
                  <ArrowUpRight size={22} />
                </span>
              </span>
            </button>
          )}
        </div>
      </section>
      <section className="edition-shelf" aria-labelledby="edition-shelf-title">
        <div className="edition-section-heading">
          <div>
            <span className="edition-eyebrow">A LITTLE INSPIRATION</span>
            <h2 id="edition-shelf-title">这个周末，换一种打开方式。</h2>
          </div>
          <span className="edition-shelf-note">
            {city} · 三份可直接调整的示例提案
          </span>
        </div>
        <div className="edition-theme-grid">
          {themes.map((theme, index) => {
            const proposal = recommendWeekendProposals({
              ...base,
              interests: [...theme.interests],
              budget: theme.budget,
              weather: theme.weather,
              maxDurationMinutes: 360,
            })[0];
            return (
              <button
                key={theme.label}
                className={`edition-theme ${theme.tone}`}
                onClick={() => (proposal ? onPreview(proposal) : onCustomize())}
              >
                <img src={asset(theme.image)} alt="" loading="lazy" />
                <span className="edition-theme-copy">
                  <span className="edition-theme-index">
                    0{index + 1} / {theme.weather}提案
                  </span>
                  <strong>{theme.label}</strong>
                  <span>{theme.subtitle}</span>
                  <span className="edition-theme-cost">
                    {proposal
                      ? `¥${proposal.totalPerPerson} /人 · ${Math.round((proposal.durationMinutes / 60) * 10) / 10} 小时`
                      : "按你的条件定制"}
                    <ArrowUpRight size={17} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

export function ProposalPreview({
  proposal,
  onAdopt,
  onCustomize,
}: {
  proposal: WeekendProposal;
  onAdopt: () => void;
  onCustomize: () => void;
}) {
  const items = proposal.activityIds
    .map((id) => activities.find((a) => a.id === id)!)
    .filter(Boolean);
  return (
    <div className="proposal-preview">
      <span className="edition-eyebrow">YOUR WEEKEND, ALMOST READY</span>
      <h2>{proposal.title}</h2>
      <p>{proposal.subtitle}</p>
      <div className="proposal-facts">
        <span>
          <MapPin size={15} />
          {items[0]?.city}
        </span>
        <span>
          <CalendarDays size={15} />
          {proposal.options.date}
        </span>
        <span>
          <Users size={15} />
          {proposal.options.people} 人
        </span>
        <span>
          <CloudRain size={15} />
          {proposal.options.weather}情景
        </span>
      </div>
      <div className="proposal-stops">
        {items.map((a, i) => (
          <div key={a.id}>
            <img src={a.image} alt="" />
            <span>
              <small>
                0{i + 1} / {a.category}
              </small>
              <strong>{a.title}</strong>
              <span>{a.location}</span>
            </span>
            <b>{a.price ? `¥${a.price}` : "免费"}</b>
          </div>
        ))}
      </div>
      <div className="proposal-budget">
        <span>
          把一整天的花费算进去
          <small>
            活动 + 餐饮 ¥{proposal.options.mealBudget} + 交通 ¥
            {proposal.options.transportBudget}
          </small>
        </span>
        <strong>
          ¥{proposal.totalPerPerson}
          <small>/人</small>
        </strong>
      </div>
      <div className="proposal-reasons">
        {proposal.reasons.map((reason) => (
          <p key={reason}>
            <Check size={15} />
            {reason}
          </p>
        ))}
      </div>
      {proposal.tradeoffs.length > 0 && (
        <p className="proposal-tradeoffs">{proposal.tradeoffs.join("；")}</p>
      )}
      <p className="proposal-note">
        这是可修改的出游草案。活动和价格为示例，餐饮、交通与用时为估算；出发前请核实场次与开放信息。
      </p>
      <div className="proposal-actions">
        <button className="outline" onClick={onCustomize}>
          <Compass size={16} />
          调整我的偏好
        </button>
        <button className="primary" onClick={onAdopt}>
          采用这份周末 <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
