import {
  ArrowRight,
  Camera,
  Check,
  CloudRain,
  Compass,
  Download,
  Route,
  Send,
  Users,
  Wallet,
  X,
} from "lucide-react";
import "./reviewer.css";

export interface ProductGuideProps {
  onStart: () => void;
  onExport: () => void;
}

/** Product-oriented content rendered inside the application's existing accessible dialog. */
export function ProductGuide({ onStart, onExport }: ProductGuideProps) {
  return (
    <section className="reviewer-guide" aria-labelledby="reviewer-guide-title">
      <div className="reviewer-eyebrow">
        <span aria-hidden="true" />
        <span>周末城市探索 · 产品导览</span>
      </div>
      <h2 id="reviewer-guide-title" className="reviewer-title">
        从「去哪玩」，
        <br />
        到「一起出发」。
      </h2>
      <p className="reviewer-lead">
        给大学生的周末，少一点选择负担，多一点真正出发的可能。
      </p>

      <div className="reviewer-problem">
        <span className="reviewer-problem-icon" aria-hidden="true">
          <Compass size={22} />
        </span>
        <div>
          <h3>选一个活动，只是出发的第一步</h3>
          <p>
            信息散在不同地方，选完还要算花费、排时间、约朋友。天气一变，计划又得重来。
          </p>
        </div>
      </div>

      <section
        className="reviewer-section"
        aria-labelledby="reviewer-decisions-title"
      >
        <div className="reviewer-section-heading">
          <h3 id="reviewer-decisions-title">把这些纠结，变成三个产品选择</h3>
          <span>从选择到行动</span>
        </div>
        <div className="reviewer-decisions">
          <article>
            <Compass size={21} aria-hidden="true" />
            <h4>让推荐说得清</h4>
            <p>先收集城市、偏好和预算，再说明每个活动为什么适合。</p>
          </article>
          <article>
            <Wallet size={21} aria-hidden="true" />
            <h4>把一整天算进去</h4>
            <p>活动、餐饮与交通一起看，调整顺序和预算时同步重算。</p>
          </article>
          <article>
            <Users size={21} aria-hidden="true" />
            <h4>给变化留个余地</h4>
            <p>雨天有室内备选，计划可以分享，同行之后还能留下记录。</p>
          </article>
        </div>
      </section>

      <section
        className="reviewer-section reviewer-walkthrough"
        aria-labelledby="reviewer-walkthrough-title"
      >
        <div className="reviewer-section-heading">
          <h3 id="reviewer-walkthrough-title">用 90 秒，走一遍完整体验</h3>
          <span className="reviewer-time-pill">3 个小步骤</span>
        </div>
        <ol className="reviewer-steps">
          <li>
            <span className="reviewer-step-index" aria-hidden="true">
              01
            </span>
            <div>
              <h4>选一份想出门的方案</h4>
              <p>给出偏好，看看推荐理由，把心动的地方排进一天。</p>
            </div>
            <span className="reviewer-step-time">25 秒</span>
          </li>
          <li>
            <span className="reviewer-step-index" aria-hidden="true">
              02
            </span>
            <div>
              <h4>让计划经得起一点变化</h4>
              <p>改一改预算，再试试雨天，确认替代方案后的时间与费用。</p>
            </div>
            <span className="reviewer-step-time">30 秒</span>
          </li>
          <li>
            <span className="reviewer-step-index" aria-hidden="true">
              03
            </span>
            <div>
              <h4>约同行，也留下一点回忆</h4>
              <p>分享行程给朋友，再用一句话完成一次周末打卡。</p>
            </div>
            <span className="reviewer-step-time">35 秒</span>
          </li>
        </ol>
        <button type="button" className="reviewer-start" onClick={onStart}>
          开始体验这一个周末 <ArrowRight size={18} aria-hidden="true" />
        </button>
        <p className="reviewer-restore-note">
          导览使用示例记录，退出后还原你原有的记录。
        </p>
      </section>

      <section
        className="reviewer-section reviewer-scope"
        aria-labelledby="reviewer-scope-title"
      >
        <div className="reviewer-section-heading">
          <h3 id="reviewer-scope-title">这个雏形，做到哪一步</h3>
        </div>
        <dl>
          <div>
            <dt>活动与城市</dt>
            <dd>
              上海、杭州、北京。活动、票价和场次为设计示例，不代表实际可预约或购买。
            </dd>
          </div>
          <div>
            <dt>天气与变化</dt>
            <dd>
              联网读取城市预报；遇到限流、断网或暂无预报，会明确提示，并提供天气情景继续规划。
            </dd>
          </div>
          <div>
            <dt>推荐与排程</dt>
            <dd>
              使用透明的本地规则，未调用大模型。停留与转场是估算，出发前需核实开放时间和交通。
            </dd>
          </div>
          <div>
            <dt>记录与同行</dt>
            <dd>
              记录保存在当前浏览器，组队人数为本机演示。分享的是内容快照，不会自动同步后续修改。
            </dd>
          </div>
        </dl>
      </section>

      <div className="reviewer-footer">
        <p>从一个周末场景出发，先把选择、计划和分享连接起来。</p>
        <button type="button" className="reviewer-export" onClick={onExport}>
          <Download size={16} aria-hidden="true" />
          备份我的本机记录
        </button>
      </div>
    </section>
  );
}

export interface DemoJourneyBarProps {
  /** Zero-based active action: 0–3. A value of 4 marks every action as visited. */
  step: number;
  onDecision: () => void;
  onRain: () => void;
  onShare: () => void;
  onCheckin: () => void;
  onExit: () => void;
}

/** Parent owns all sample data, progression, restoration, and navigation. */
export function DemoJourneyBar({
  step,
  onDecision,
  onRain,
  onShare,
  onCheckin,
  onExit,
}: DemoJourneyBarProps) {
  const actions = [
    { label: "选一份方案", icon: Compass, onClick: onDecision },
    { label: "试试雨天", icon: CloudRain, onClick: onRain },
    { label: "分享行程", icon: Send, onClick: onShare },
    { label: "记录打卡", icon: Camera, onClick: onCheckin },
  ];
  return (
    <section className="demo-journey" aria-labelledby="demo-journey-title">
      <div className="demo-heading">
        <span className="demo-heading-icon" aria-hidden="true">
          <Route size={20} />
        </span>
        <div>
          <h2 id="demo-journey-title">体验导览</h2>
          <p>退出后还原你原有的记录</p>
        </div>
        <span className="demo-progress-label">
          {step >= 4 ? "体验完成" : `${Math.max(1, Math.min(step + 1, 4))} / 4`}
        </span>
        <button
          type="button"
          className="demo-exit"
          aria-label="退出体验导览"
          onClick={onExit}
        >
          <X size={16} aria-hidden="true" />
          <span>退出导览</span>
        </button>
      </div>
      <nav className="demo-actions" aria-label="体验导览步骤">
        {actions.map((action, index) => (
          <button
            type="button"
            key={action.label}
            className={`demo-action${step === index ? " is-current" : ""}${step > index ? " is-visited" : ""}`}
            aria-current={step === index ? "step" : undefined}
            onClick={action.onClick}
          >
            <span className="demo-step-number" aria-hidden="true">
              {step > index ? <Check size={13} /> : index + 1}
            </span>
            <action.icon size={17} aria-hidden="true" />
            <span>{action.label}</span>
            {step === index && (
              <ArrowRight
                className="demo-action-arrow"
                size={15}
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </nav>
    </section>
  );
}

export default ProductGuide;
