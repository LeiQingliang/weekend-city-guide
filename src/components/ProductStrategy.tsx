import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Compass,
  Download,
  FlaskConical,
  Target,
  Wallet,
} from "lucide-react";
import { calculateBusiness, type BusinessInputs } from "../business";
import { clearInsights, readInsights } from "../insights";
import "./product-strategy.css";

const assumptions: BusinessInputs = {
  monthlyPlanningUsers: 10000,
  planAdoptionPct: 35,
  officialVisitPct: 40,
  orderConversionPct: 20,
  redemptionPct: 85,
  orderValue: 120,
  commissionPct: 6,
  variableCostPerUser: 0.12,
  monthlyOpsCost: 3000,
};
const fields: {
  key: keyof BusinessInputs;
  label: string;
  max: number;
  step: number;
}[] = [
  {
    key: "monthlyPlanningUsers",
    label: "月规划用户数",
    max: 10000000,
    step: 100,
  },
  { key: "planAdoptionPct", label: "采用计划比例 %", max: 100, step: 1 },
  { key: "officialVisitPct", label: "采用后访问官方比例 %", max: 100, step: 1 },
  { key: "orderConversionPct", label: "访问后支付比例 %", max: 100, step: 1 },
  { key: "redemptionPct", label: "支付后有效核销比例 %", max: 100, step: 1 },
  { key: "orderValue", label: "支付客单价 / 元", max: 10000, step: 10 },
  { key: "commissionPct", label: "核销订单佣金率 %", max: 100, step: 0.5 },
  {
    key: "variableCostPerUser",
    label: "每用户变动成本 / 元",
    max: 100,
    step: 0.01,
  },
  {
    key: "monthlyOpsCost",
    label: "月固定运营成本 / 元",
    max: 100000000,
    step: 100,
  },
];
const money = (n: number) =>
  `¥${n.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const count = (n: number) =>
  n.toLocaleString("zh-CN", { maximumFractionDigits: 1 });

export default function ProductStrategy({
  onStart,
  onExport,
}: {
  onStart: () => void;
  onExport: () => void;
}) {
  const [tab, setTab] = useState("产品判断");
  const [inputs, setInputs] = useState<BusinessInputs>(assumptions);
  const [insights, setInsights] = useState(readInsights);
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => {
    const refresh = () => setInsights(readInsights());
    window.addEventListener("chumenla-insights-change", refresh);
    return () =>
      window.removeEventListener("chumenla-insights-change", refresh);
  }, []);
  const result = calculateBusiness(inputs);
  return (
    <section className="product-strategy" aria-labelledby="strategy-title">
      <span className="strategy-kicker">PRODUCT CASE / 产品与运营</span>
      <h2 id="strategy-title">
        让一次周末探索，
        <br />
        真的发生。
      </h2>
      <p className="strategy-intro">
        用明确的选择、可核对的信息和可执行的安排，把“想去”推进到“出发”。以下区分已实现能力、待验证假设和商业测算。
      </p>
      <button className="primary strategy-start" onClick={onStart}>
        先用 90 秒体验产品 <ArrowRight size={17} />
      </button>
      <nav className="strategy-tabs" aria-label="产品分析视角">
        {["产品判断", "运营验证", "商业测算"].map((label) => (
          <button
            key={label}
            aria-pressed={tab === label}
            onClick={() => setTab(label)}
          >
            {label === "产品判断" ? (
              <Compass size={16} />
            ) : label === "运营验证" ? (
              <BarChart3 size={16} />
            ) : (
              <Wallet size={16} />
            )}{" "}
            {label}
          </button>
        ))}
      </nav>

      {tab === "产品判断" && (
        <div className="strategy-content">
          <div className="strategy-thesis">
            <Target size={22} />
            <div>
              <h3>核心用户任务</h3>
              <p>
                “周五晚上，我想在有限预算和半天时间里，和朋友快速定下一个能成行的周末。”
              </p>
              <small>
                依据题目提出的假设；尚未用访谈和真实行为验证频次与强度。
              </small>
            </div>
          </div>
          <h3>先解决阻碍出发的问题</h3>
          <div className="strategy-pains">
            <article>
              <span>P0 · 决策成本</span>
              <h4>收藏了很多，还是定不下来</h4>
              <p>把偏好、全天费用和可用时间放在同一份方案里，最多比较两案。</p>
              <small>
                验证：任务完成率、从开始规划到采用的耗时；避免只看点击。
              </small>
            </article>
            <article>
              <span>P0 · 履约风险</span>
              <h4>到了才发现闭馆、下雨或超支</h4>
              <p>开放与天气参与约束；费用可校正，出发清单直接打开官方信息。</p>
              <small>
                验证：已知冲突拦截率、信息错误反馈、实际与预留费用偏差。
              </small>
            </article>
            <article>
              <span>P1 · 协作成本</span>
              <h4>“有空一起”迟迟变不成约定</h4>
              <p>邀请包含时间和地点；朋友回传意向，由发起人确认名单。</p>
              <small>验证：邀请到确认的完成率与耗时；当前为手动回执。</small>
            </article>
          </div>
          <h3>AI 的价值，要落到任务结果</h3>
          <div className="strategy-ai">
            <p>
              <b>先说目标，再共同修改：</b>
              输入“周六三个人，100元，想看展”，先核对结构化条件和两份方案。接着说“只去室内、缩短到3小时”，保留其他条件，展示修改前后差异，支持撤销。
            </p>
            <p>
              <b>不懂的条件，也要留在任务里：</b>
              “轮椅友好”“不能排队”等未覆盖要求会持续显示，需用户确认另行核对后才能采用。关闭草稿不改原计划；采用后用出发速览继续执行。
            </p>
            <p>
              <b>适合交给 AI：</b>
              理解含糊需求、解释方案取舍、把打卡整理成攻略草稿。
            </p>
            <p>
              <b>必须可靠校验：</b>
              预算、营业时间、天气约束、信息来源和用户确认；不让生成内容代替实时票务事实。
            </p>
            <p>
              <b>当前实现：</b>AI Coding
              辅助研发；公开站默认以本地规则运行，界面明确标注模式。模型接入通过独立后端理解条件，活动、费用和时间仍需校验；在线失败时显示降级原因，保留可用的规则基线。
            </p>
            <p>
              <a
                href="https://github.com/LeiQingliang/weekend-city-guide/blob/main/docs/AI-EXPERIENCE.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                查看 AI 优先设计、模式边界与评测思路 <ArrowUpRight size={13} />
              </a>
            </p>
          </div>
          <div className="strategy-experiment">
            <FlaskConical size={21} />
            <div>
              <h4>下一步先验证，再扩功能</h4>
              <p>
                从一个校园周边开展小样本任务测试，观察是否能完成“给定预算与天气，定下可出发方案”；记录卡住的位置和原因。通过后再设计对照实验，评估模型相对规则基线的任务成功、事实正确、延迟与成本，不先填增长数字。
              </p>
            </div>
          </div>
          <p className="strategy-note">
            暂缓：付费会员、泛化城市数量与复杂社交。当前优先保证信息、预算与出发安排可用。
          </p>
        </div>
      )}

      {tab === "运营验证" && (
        <div className="strategy-content">
          <div className="strategy-thesis">
            <BarChart3 size={22} />
            <div>
              <h3>先验证成行，再讨论规模</h3>
              <p>北极星候选：每周完成有效出行并确认体验的用户数。</p>
              <small>
                待接入同意授权的事件采集与核验；本机打卡只是自报代理信号，不能证明真实到访。
              </small>
            </div>
          </div>
          <h3>一条能定位问题的验证路径</h3>
          <ol className="strategy-funnel">
            <li>
              <b>有需求</b>
              <span>明确城市、预算与时间</span>
            </li>
            <li>
              <b>有方案</b>
              <span>采用计划，理解取舍</span>
            </li>
            <li>
              <b>能出发</b>
              <span>核对信息、确认同行</span>
            </li>
            <li>
              <b>有回访</b>
              <span>打卡、反馈、下周再来</span>
            </li>
          </ol>
          <div className="strategy-two">
            <article>
              <h4>需求侧：校园小范围冷启动</h4>
              <p>
                先招募一处校园的少量自愿体验者，围绕“百元以内”“雨天半日”“朋友同行”组织任务；周末后回访取消原因，验证后才扩渠道。
              </p>
            </article>
            <article>
              <h4>供给侧：少而可靠的可出发信息</h4>
              <p>
                每周核查开放、场次与价格来源；过期信息降级为地点灵感。商家合作先验证有效到访与履约，再讨论佣金。
              </p>
            </article>
          </div>
          <p className="strategy-guardrail">
            <b>增长护栏：</b>
            信息错误率、超预算反馈、放弃原因、投诉与退订；真实留存、退款及核销需后续服务端数据支持。
          </p>
          <div className="strategy-local">
            <div className="strategy-section-row">
              <h3>本机体验记录</h3>
              <span>真实操作次数 · 非经营数据</span>
            </div>
            <p>
              从本版本开始记录，不回填历史、不计临时导览、不上传。没有跨用户去重与先后归因，以下不能计算转化率，也不代表真实用户规模。
            </p>
            <div className="strategy-counts">
              {(
                [
                  ["plan_adopted", "采用计划"],
                  ["official_opened", "打开官方信息"],
                  ["team_created", "创建小队"],
                  ["checkin_saved", "保存打卡"],
                  ["guide_saved", "新建攻略"],
                  ["plan_shared", "生成行程分享"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <b>{insights.counts[key] || 0}</b>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <h4>反馈原因，决定下一轮优先级</h4>
            <div className="strategy-feedback-counts">
              {(
                [
                  ["fit", "合适"],
                  ["budget", "预算偏高"],
                  ["time", "时间不合适"],
                  ["interest", "兴趣不匹配"],
                  ["info", "信息待确认"],
                ] as const
              ).map(([key, label]) => (
                <span key={key}>
                  {label} <b>{insights.feedback[key] || 0}</b>
                </span>
              ))}
            </div>
            <p className="strategy-note">
              重复点击按次数记录；“打开官方”不表示页面加载成功或完成预约，生成分享不表示已发送。
            </p>
            {confirmClear ? (
              <div className="strategy-clear-confirm" role="status">
                <span>仅清空此处计数，保留行程、打卡与攻略。</span>
                <button
                  onClick={() => {
                    clearInsights();
                    setInsights(readInsights());
                    setConfirmClear(false);
                  }}
                >
                  确认清空体验计数
                </button>
                <button onClick={() => setConfirmClear(false)}>取消</button>
              </div>
            ) : (
              <button
                className="strategy-text-button"
                onClick={() => setConfirmClear(true)}
              >
                清空本机体验计数
              </button>
            )}
          </div>
          <p className="strategy-note">
            后续实验：同一渠道、按用户固定分组，对照“只有地点列表”和“含预算时间的可执行方案”；预先定义主指标与护栏，先估算样本量与周期，再判断效果。
          </p>
        </div>
      )}

      {tab === "商业测算" && (
        <div className="strategy-content">
          <div className="strategy-thesis">
            <Wallet size={22} />
            <div>
              <h3>用户免费规划，商家为可归因价值付费</h3>
              <p>
                优先探索按有效核销结算的合作导流。成立前提是用户真能出发、商家认可增量、订单能够归因。
              </p>
              <small>
                待验证商业假设；当前没有合作结算、订单回传或佣金收入。官方链接只是信息入口。
              </small>
            </div>
          </div>
          <div className="strategy-two">
            <article>
              <h4>为什么有机会</h4>
              <p>
                预算、时间与同行需求已经明确，可能形成更有购买意向的访问；商家关注有效到访与复购，平台需证明增量而非截取自然订单。
              </p>
            </article>
            <article>
              <h4>为什么不能只算收入</h4>
              <p>
                免费活动没有门票佣金，支付后可能退款，内容维护与模型调用有成本。佣金不能影响自然推荐次序；合作内容必须明确标注。
              </p>
            </article>
          </div>
          <div className="strategy-section-row">
            <h3>调一调假设，看看是否成立</h3>
            <button
              className="strategy-text-button"
              onClick={() => setInputs({ ...assumptions })}
            >
              恢复演算假设
            </button>
          </div>
          <p className="strategy-note">
            全部为可修改的演算输入，不是项目实绩或行业基准。各转化比例以前一阶段为分母；同一用户每月最多计一笔示意订单。
          </p>
          <div className="strategy-inputs">
            {fields.map((f) => (
              <label key={f.key}>
                {f.label}
                <input
                  type="number"
                  min={0}
                  max={f.max}
                  step={f.step}
                  value={Number.isNaN(inputs[f.key]) ? "" : inputs[f.key]}
                  onChange={(e) =>
                    setInputs((prev) => ({
                      ...prev,
                      [f.key]:
                        e.target.value === "" ? NaN : Number(e.target.value),
                    }))
                  }
                  aria-invalid={!result.valid && !!result.errors[f.key]}
                />
                {!result.valid && result.errors[f.key] && (
                  <small role="alert">{result.errors[f.key]}</small>
                )}
              </label>
            ))}
          </div>
          {result.valid ? (
            <div className="strategy-model" aria-live="polite">
              <div className="strategy-model-chain">
                <span>{count(result.metrics.planningUsers)} 规划</span>
                <ArrowRight size={14} />
                <span>{count(result.metrics.adoptedUsers)} 采用</span>
                <ArrowRight size={14} />
                <span>{count(result.metrics.officialVisitors)} 官方访问</span>
                <ArrowRight size={14} />
                <span>{count(result.metrics.paidOrders)} 支付</span>
                <ArrowRight size={14} />
                <span>{count(result.metrics.redeemedOrders)} 核销</span>
              </div>
              <div className="strategy-results">
                <div>
                  <span>假设支付 GMV</span>
                  <b>{money(result.metrics.gmv)}</b>
                  <small>交易额不是收入</small>
                </div>
                <div>
                  <span>假设核销佣金</span>
                  <b>{money(result.metrics.commissionRevenue)}</b>
                  <small>仅对有效核销计佣</small>
                </div>
                <div>
                  <span>假设总成本</span>
                  <b>{money(result.metrics.totalCost)}</b>
                  <small>变动成本 + 固定运营</small>
                </div>
                <div
                  className={
                    result.metrics.contributionProfit < 0
                      ? "is-negative"
                      : "is-positive"
                  }
                >
                  <span>假设月贡献利润</span>
                  <b>{money(result.metrics.contributionProfit)}</b>
                  <small>未计税费等完整公司成本</small>
                </div>
              </div>
              <p className="strategy-model-conclusion">
                {result.metrics.breakEvenUsers === null
                  ? "当前单位收入不覆盖单位变动成本，单纯增加用户无法实现盈亏平衡；先改善转化、核销、成本或合作条件。"
                  : `按当前不变的转化和成本假设，月规划用户约需达到 ${Math.ceil(result.metrics.breakEvenUsers).toLocaleString("zh-CN")} 人才能覆盖列出的成本；不是增长预测。`}
              </p>
              <details>
                <summary>查看公式与遗漏项</summary>
                <p>
                  佣金收入 = 规划用户 × 采用率 × 官方访问率 × 支付率 × 核销率 ×
                  客单价 × 佣金率。
                </p>
                <p>
                  贡献利润 = 佣金收入 − 用户数 × 单用户变动成本 −
                  固定运营成本。盈亏平衡用户数 = 固定成本 ÷（单位佣金收入 −
                  单位变动成本），分母必须大于 0。
                </p>
                <p>
                  变动成本应纳入渠道获客、模型与客服成本；固定成本应纳入内容维护。此单期模型尚未包括复购、分用户层级、税费、结算周期和归因偏差，不能据此投资或确定商业可行性。
                </p>
              </details>
            </div>
          ) : (
            <p className="strategy-invalid" role="status">
              请先修正输入，暂不显示测算结果。
            </p>
          )}
        </div>
      )}
      <details className="strategy-sources">
        <summary>岗位研究依据与实现边界</summary>
        <p>
          以下公开岗位用于理解能力方向；社招要求不等于校招门槛，更不是本题评分表。业务假设仍需要真实验证。
        </p>
        <a
          href="https://zhaopin.meituan.com/web/position/detail?highlightType=social&jobUnionId=4742762668"
          target="_blank"
          rel="noopener noreferrer"
        >
          美团 AI 搜索产品经理：决策需求与评测迭代 <ArrowUpRight size={14} />
        </a>
        <a
          href="https://zhaopin.meituan.com/web/position/detail?highlightType=social&jobUnionId=4758029271"
          target="_blank"
          rel="noopener noreferrer"
        >
          美团产品运营：渠道效率与体验治理 <ArrowUpRight size={14} />
        </a>
        <a
          href="https://tech.meituan.com/2026/09/10/Agent-Evaluation-White-Paper-01.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          美团 Agent 评测白皮书 <ArrowUpRight size={14} />
        </a>
        <p>
          本产品与美团无官方关联。模型、真实订单、身份认证和实时组队后台尚未接入；人工核对是个人确认，未代替商家预约。
        </p>
      </details>
      <button className="strategy-text-button" onClick={onExport}>
        <Download size={15} />
        备份我的行程与记录
      </button>
    </section>
  );
}
