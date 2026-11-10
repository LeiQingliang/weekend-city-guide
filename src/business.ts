/** All inputs are hypotheses for one monthly cohort, not observed analytics. */
export interface BusinessInputs {
  monthlyPlanningUsers: number;
  planAdoptionPct: number;
  officialVisitPct: number;
  orderConversionPct: number;
  redemptionPct: number;
  orderValue: number;
  commissionPct: number;
  variableCostPerUser: number;
  monthlyOpsCost: number;
}

export const BUSINESS_INPUT_LIMITS = {
  monthlyPlanningUsers: { min: 0, max: 10_000_000 },
  planAdoptionPct: { min: 0, max: 100 },
  officialVisitPct: { min: 0, max: 100 },
  orderConversionPct: { min: 0, max: 100 },
  redemptionPct: { min: 0, max: 100 },
  orderValue: { min: 0, max: 10_000 },
  commissionPct: { min: 0, max: 100 },
  variableCostPerUser: { min: 0, max: 100 },
  monthlyOpsCost: { min: 0, max: 100_000_000 },
} as const;

export const BUSINESS_ASSUMPTION_NOTE =
  "仅为商业化假设测算，不是真实经营数据。本原型未接入合作结算，当前无佣金收入。各阶段属于同一批规划用户的连续漏斗，独立动作次数不能当作转化率。";

export type BusinessErrors = Partial<Record<keyof BusinessInputs, string>>;
export interface BusinessMetrics {
  planningUsers: number;
  adoptedUsers: number;
  officialVisitors: number;
  paidOrders: number;
  redeemedOrders: number;
  gmv: number;
  redeemedGmv: number;
  commissionRevenue: number;
  variableCost: number;
  opsCost: number;
  totalCost: number;
  contributionProfit: number;
  perUserCommissionRevenue: number;
  perUserContribution: number;
  /** Continuous threshold; round up only when presenting a whole-person count. */
  breakEvenUsers: number | null;
}
export type BusinessResult =
  | { valid: false; errors: BusinessErrors; metrics: null }
  | { valid: true; errors: BusinessErrors; metrics: BusinessMetrics };

/** Reject invalid assumptions rather than silently changing the user's scenario. */
export function calculateBusiness(input: unknown): BusinessResult {
  const record =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const values = {} as BusinessInputs;
  const errors: BusinessErrors = {};
  for (const field of Object.keys(
    BUSINESS_INPUT_LIMITS,
  ) as (keyof BusinessInputs)[]) {
    const value = record[field];
    const { min, max } = BUSINESS_INPUT_LIMITS[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors[field] = "请输入有限数值，不能留空或使用非数字内容。";
    } else if (value < min || value > max) {
      errors[field] = `请输入 ${min} 至 ${max} 之间的数值。`;
    } else {
      values[field] = value;
    }
  }
  if (Object.keys(errors).length)
    return { valid: false, errors, metrics: null };

  const adoptionRate = values.planAdoptionPct / 100;
  const visitRate = values.officialVisitPct / 100;
  const orderRate = values.orderConversionPct / 100;
  const redemptionRate = values.redemptionPct / 100;
  const commissionRate = values.commissionPct / 100;
  const planningUsers = values.monthlyPlanningUsers;
  const adoptedUsers = planningUsers * adoptionRate;
  const officialVisitors = adoptedUsers * visitRate;
  const paidOrders = officialVisitors * orderRate;
  const redeemedOrders = paidOrders * redemptionRate;
  const gmv = paidOrders * values.orderValue;
  const redeemedGmv = redeemedOrders * values.orderValue;
  const commissionRevenue = redeemedGmv * commissionRate;
  const variableCost = planningUsers * values.variableCostPerUser;
  const opsCost = values.monthlyOpsCost;
  const totalCost = variableCost + opsCost;
  const perUserCommissionRevenue =
    adoptionRate *
    visitRate *
    orderRate *
    redemptionRate *
    values.orderValue *
    commissionRate;
  const perUserContribution =
    perUserCommissionRevenue - values.variableCostPerUser;
  const breakEvenUsers =
    perUserContribution > 0 ? opsCost / perUserContribution : null;
  if (breakEvenUsers !== null && !Number.isFinite(breakEvenUsers)) {
    return {
      valid: false,
      errors: {
        monthlyOpsCost:
          "当前单位收益过小，盈亏平衡人数超出可计算范围；请调整假设。",
      },
      metrics: null,
    };
  }
  return {
    valid: true,
    errors: {},
    metrics: {
      planningUsers,
      adoptedUsers,
      officialVisitors,
      paidOrders,
      redeemedOrders,
      gmv,
      redeemedGmv,
      commissionRevenue,
      variableCost,
      opsCost,
      totalCost,
      contributionProfit: commissionRevenue - totalCost,
      perUserCommissionRevenue,
      perUserContribution,
      breakEvenUsers,
    },
  };
}
