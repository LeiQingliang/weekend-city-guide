import ProductStrategy from "./ProductStrategy";
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
  return <ProductStrategy onStart={onStart} onExport={onExport} />;
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
