import { intentEndpoint } from "./intentGateway";

/** Public gateway configuration only. Provider credentials never belong in this module. */
export const modelEndpoint = intentEndpoint(
  import.meta.env.VITE_INTENT_API_URL,
);

export const planningModeLabel = modelEndpoint
  ? "DeepSeek理解需求 · 规则核验方案"
  : "当前为本地规则模式";

export const planningModeDescription = modelEndpoint
  ? "周末规划助手通过独立后端调用 DeepSeek 理解出行条件；活动、费用、时长与已知开放条件仍由本地规则核验。在线不可用时明确提示并回退本地解析。"
  : "出行条件解析与方案核验均使用本地规则，未调用大模型；可继续用自然语言调整，或手动核对条件。";
