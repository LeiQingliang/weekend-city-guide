import {
  ArrowRight,
  Compass,
  Sparkles,
  Shuffle,
  Check,
  Route,
  ShieldCheck,
  CloudSun,
  Code2,
  Download,
  MapPin,
  Camera,
  Users,
  CalendarDays,
} from "lucide-react";
import { useState } from "react";

export function BriefComposer({
  onApply,
  recognized,
  onQuickPlan,
}: {
  onApply: (text: string) => void;
  recognized: string[];
  onQuickPlan: () => void;
}) {
  const [text, setText] = useState("");
  const examples = [
    "上海，两个人，50元以内",
    "杭州，下雨，一个人，免费展览",
    "北京，四个人，去户外走走",
  ];
  return (
    <section className="brief-composer" aria-label="一句话探索周末">
      <div className="brief-intro">
        <span className="brief-icon">
          <Sparkles size={22} />
        </span>
        <div>
          <span className="kicker">A WEEKEND THAT FEELS LIKE YOU</span>
          <h2>想怎么过周末？说来听听。</h2>
        </div>
        <span className="brief-badge">灵感助手</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onApply(text);
        }}
        className="brief-form"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={160}
          aria-label="描述你的周末想法"
          placeholder="比如：上海，两个人，100元以内，下雨也想出门"
        />
        <button className="primary" type="submit" disabled={!text.trim()}>
          找点灵感 <ArrowRight size={16} />
        </button>
      </form>
      <div className="brief-bottom">
        <div className="brief-examples">
          {examples.map((s) => (
            <button
              key={s}
              onClick={() => {
                setText(s);
                onApply(s);
              }}
            >
              {s}
              <ArrowRight size={12} />
            </button>
          ))}
        </div>
        <button className="quick-plan" onClick={onQuickPlan}>
          <Shuffle size={15} />
          帮我安排半天
        </button>
      </div>
      {recognized.length > 0 && (
        <div className="brief-recognized" role="status">
          <Check size={15} />
          <span>已理解：</span>
          {recognized.map((r, i) => (
            <span key={i}>{r}</span>
          ))}
        </div>
      )}
      <details className="brief-explain">
        <summary>它如何理解我的想法？</summary>
        <p>
          按城市、活动类型、人数、天气和金额识别常用表达，再筛选本地活动示例。未识别的条件请用下方筛选补充；此处使用透明规则，不是大模型对话。
        </p>
      </details>
    </section>
  );
}

export function ProgressRail({
  planCount,
  entryCount,
  onPlan,
  onRecord,
}: {
  planCount: number;
  entryCount: number;
  onPlan: () => void;
  onRecord: () => void;
}) {
  return (
    <div className="progress-rail">
      <span>
        <Compass size={17} />
        <b>发现心动</b>
        <small>按你的节奏选</small>
      </span>
      <i>→</i>
      <button onClick={onPlan}>
        <Route size={17} />
        <b>安排出发</b>
        <small>
          {planCount ? `${planCount} 个已选活动` : "把时间和预算排好"}
        </small>
      </button>
      <i>→</i>
      <button onClick={onRecord}>
        <Camera size={17} />
        <b>收集快乐</b>
        <small>
          {entryCount ? `${entryCount} 段周末记忆` : "打卡，再分享"}
        </small>
      </button>
    </div>
  );
}

export function Showcase({
  onTry,
  onExport,
}: {
  onTry: () => void;
  onExport: () => void;
}) {
  return (
    <div className="showcase">
      <span className="kicker">FROM A QUESTION TO A WORKING EXPERIENCE</span>
      <h2>
        一次周末选择，
        <br />
        一条完整的产品体验。
      </h2>
      <p className="showcase-lead">
        出门啦把分散的活动灵感，整理成可解释、可安排、可分享的周末计划。这个作品由
        AI Coding 辅助构建，重点是把需求转化为可操作的功能，并验证关键流程。
      </p>
      <button className="primary" onClick={onTry}>
        <Sparkles size={17} />
        体验一条完整行程
      </button>
      <div className="showcase-grid">
        <article>
          <Compass />
          <h3>让选择有依据</h3>
          <p>一句话解析需求，结合预算、同伴和天气，展示具体推荐理由。</p>
        </article>
        <article>
          <CalendarDays />
          <h3>让计划能执行</h3>
          <p>安排时间、调整顺序、计算总预算，遇雨提醒换成室内活动。</p>
        </article>
        <article>
          <Users />
          <h3>让分享有内容</h3>
          <p>朋友可打开同一份行程、邀请卡或攻略。小队报名仅为本机模拟。</p>
        </article>
        <article>
          <ShieldCheck />
          <h3>让边界说清楚</h3>
          <p>天气获取失败有明确提示；活动为示例，个人记录保存在本机。</p>
        </article>
      </div>
      <div className="showcase-scope">
        <h3>已经实现</h3>
        <p>
          三城活动筛选 · 天气预报接入与场景切换 · 可编辑行程 ·
          预算与天气冲突提醒 · 日历导出 · 行程链接还原 · 组队邀请 · 照片打卡 ·
          攻略分享 · 本机数据备份
        </p>
        <h3>当前范围</h3>
        <p>
          活动、票价和场次为设计示例。推荐与行程采用本地规则，未调用大模型；交通时间是预留估算。没有跨设备报名数据库、实时票务或支付。天气以数据源实际返回为准，不可用时可手动选择天气场景。
        </p>
      </div>
      <div className="showcase-actions">
        <a
          className="outline"
          href="https://github.com/LeiQingliang/weekend-city-guide"
          target="_blank"
          rel="noreferrer"
        >
          <Code2 size={17} />
          查看项目与设计说明
        </a>
        <button className="outline" onClick={onExport}>
          <Download size={17} />
          备份我的本机记录
        </button>
      </div>
    </div>
  );
}
