import { useState } from "react";
import { recordFeedback, type FeedbackReason } from "../insights";

const choices: { value: FeedbackReason; label: string; response: string }[] = [
  {
    value: "fit",
    label: "这份安排合适",
    response: "下次可以从这份计划继续调整。出发前记得核对开放与实际费用。",
  },
  {
    value: "budget",
    label: "预算偏高",
    response:
      "定制时降低全天预算，或者在费用明细中校正活动、餐饮与交通金额；免费地点也可能有交通与餐饮花费。",
  },
  {
    value: "time",
    label: "时间不合适",
    response: "可以调整出发时间、减少一站；定制时选择更短的可用时长。",
  },
  {
    value: "interest",
    label: "兴趣不匹配",
    response: "重新选一选看展、市集、户外或演出，采用新方案前会保留原计划。",
  },
  {
    value: "info",
    label: "信息待确认",
    response:
      "展开上方出发清单，直接到官方核对时间、场次与预约。没有确认前，不建议按固定场次出发。",
  },
];
export default function PlanFeedback({
  onRevise,
  onReview,
  transient = false,
}: {
  onRevise: () => void;
  onReview: () => void;
  transient?: boolean;
}) {
  const [reason, setReason] = useState<FeedbackReason>();
  const [saveFailed, setSaveFailed] = useState(false);
  const chosen = choices.find((c) => c.value === reason);
  return (
    <section className="plan-feedback" aria-label="计划反馈">
      <div className="plan-feedback-header">
        <h3>这份安排，符合你的预期吗？</h3>
      </div>
      <p>
        选一个原因，看看怎么调整。
        {transient
          ? "导览反馈不会写入正式记录。"
          : "反馈仅保存在本机，不会公开。"}
      </p>
      <div className="plan-feedback-actions">
        {choices.map((c) => (
          <button
            key={c.value}
            aria-pressed={reason === c.value}
            onClick={() => {
              if (reason !== c.value) {
                const saved = recordFeedback(c.value, transient);
                setSaveFailed(!transient && !saved);
              }
              setReason(c.value);
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      {saveFailed && (
        <p role="status">浏览器暂时无法保存反馈，仍可继续调整计划。</p>
      )}
      {chosen && (
        <div className="plan-feedback-response" role="status">
          <p>{chosen.response}</p>
          {reason !== "fit" && reason !== "info" && (
            <button onClick={onRevise}>按我的条件重新定制</button>
          )}
          {reason === "info" && (
            <button onClick={onReview}>打开出发核对清单</button>
          )}
        </div>
      )}
    </section>
  );
}
