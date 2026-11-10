import test from "node:test";
import assert from "node:assert/strict";
import {
  BUSINESS_INPUT_LIMITS,
  calculateBusiness,
  type BusinessInputs,
} from "./business";

const assumptions = (
  changes: Partial<BusinessInputs> = {},
): BusinessInputs => ({
  monthlyPlanningUsers: 1000,
  planAdoptionPct: 60,
  officialVisitPct: 50,
  orderConversionPct: 20,
  redemptionPct: 80,
  orderValue: 100,
  commissionPct: 10,
  variableCostPerUser: 0.1,
  monthlyOpsCost: 100,
  ...changes,
});
function metrics(changes: Partial<BusinessInputs> = {}) {
  const result = calculateBusiness(assumptions(changes));
  assert(result.valid, JSON.stringify(result.errors));
  return result.metrics;
}
function close(actual: number, expected: number) {
  assert(
    Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-12,
    `${actual} must equal ${expected} within floating-point precision`,
  );
}

test("one cohort flows through every conditional ratio; only redeemed orders earn commission", () => {
  const result = metrics();
  assert.deepEqual(
    [
      result.planningUsers,
      result.adoptedUsers,
      result.officialVisitors,
      result.paidOrders,
      result.redeemedOrders,
    ],
    [1000, 600, 300, 60, 48],
  );
  assert.equal(result.gmv, 6000);
  assert.equal(result.redeemedGmv, 4800);
  assert.equal(result.commissionRevenue, 480);
  assert.equal(result.variableCost, 100);
  assert.equal(result.totalCost, 200);
  assert.equal(result.contributionProfit, 280);
  close(result.perUserCommissionRevenue, 0.48);
  close(result.perUserContribution, 0.38);
  close(result.breakEvenUsers!, 100 / 0.38);
});

test("changing a downstream rate does not change upstream paid GMV", () => {
  const full = metrics({ redemptionPct: 100 });
  const none = metrics({ redemptionPct: 0 });
  assert.equal(full.paidOrders, none.paidOrders);
  assert.equal(full.gmv, none.gmv);
  assert.equal(full.commissionRevenue, 600);
  assert.equal(none.commissionRevenue, 0);
  assert.equal(none.contributionProfit, -200);
  assert.equal(none.breakEvenUsers, null);
});

test("variable costs apply to all planning users, even if nobody adopts a plan", () => {
  const result = metrics({
    planAdoptionPct: 0,
    variableCostPerUser: 2,
    monthlyOpsCost: 500,
  });
  assert.equal(result.adoptedUsers, 0);
  assert.equal(result.paidOrders, 0);
  assert.equal(result.commissionRevenue, 0);
  assert.equal(result.variableCost, 2000);
  assert.equal(result.contributionProfit, -2500);
  assert.equal(result.breakEvenUsers, null);
});

test("zero users retain fixed costs and a meaningful independent unit-economics threshold", () => {
  const result = metrics({ monthlyPlanningUsers: 0 });
  assert.equal(result.gmv, 0);
  assert.equal(result.variableCost, 0);
  assert.equal(result.contributionProfit, -100);
  close(result.breakEvenUsers!, 100 / 0.38);
  assert(Number.isFinite(result.perUserCommissionRevenue));
});

test("zero and negative unit margins have no scale-based break-even point", () => {
  for (const variableCostPerUser of [1, 2]) {
    const result = metrics({
      planAdoptionPct: 100,
      officialVisitPct: 100,
      orderConversionPct: 100,
      redemptionPct: 100,
      orderValue: 10,
      commissionPct: 10,
      variableCostPerUser,
    });
    assert.equal(result.breakEvenUsers, null);
  }
  assert.equal(metrics({ monthlyOpsCost: 0 }).breakEvenUsers, 0);
  assert.equal(
    metrics({ commissionPct: 0, monthlyOpsCost: 0, variableCostPerUser: 0 })
      .breakEvenUsers,
    null,
  );
});

test("fractional expected orders and currency are preserved without intermediate rounding", () => {
  const result = metrics({
    monthlyPlanningUsers: 7,
    planAdoptionPct: 33.3,
    officialVisitPct: 40,
    orderConversionPct: 25,
    redemptionPct: 75,
    orderValue: 19.99,
    commissionPct: 12.5,
    variableCostPerUser: 0.03,
    monthlyOpsCost: 0.25,
  });
  close(result.adoptedUsers, 2.331);
  close(result.paidOrders, 0.2331);
  close(result.redeemedOrders, 0.174825);
  close(result.gmv, 4.659669);
  close(result.commissionRevenue, 0.43684396875);
  close(result.contributionProfit, -0.02315603125);
});

test("all-zero and all-maximum inputs are accepted at inclusive boundaries", () => {
  const zero = calculateBusiness(
    Object.fromEntries(
      Object.keys(BUSINESS_INPUT_LIMITS).map((field) => [field, 0]),
    ),
  );
  assert(zero.valid);
  assert.equal(zero.metrics.contributionProfit, 0);
  assert.equal(zero.metrics.breakEvenUsers, null);
  const maximum = calculateBusiness(
    Object.fromEntries(
      Object.entries(BUSINESS_INPUT_LIMITS).map(([field, limits]) => [
        field,
        limits.max,
      ]),
    ),
  );
  assert(maximum.valid);
  assert.equal(maximum.metrics.paidOrders, 10_000_000);
  assert.equal(maximum.metrics.gmv, 100_000_000_000);
  assert.equal(maximum.metrics.contributionProfit, 98_900_000_000);
  assert(
    Object.values(maximum.metrics).every(
      (value) => value === null || Number.isFinite(value),
    ),
  );
});

test("missing, nonnumeric, nonfinite and out-of-range values yield field-specific errors without clamping", () => {
  for (const [field, limits] of Object.entries(BUSINESS_INPUT_LIMITS)) {
    for (const value of [
      undefined,
      null,
      "50",
      NaN,
      Infinity,
      -Infinity,
      -1,
      limits.max + 1,
    ]) {
      const result = calculateBusiness({ ...assumptions(), [field]: value });
      assert.equal(result.valid, false, `${field}: ${String(value)}`);
      assert.equal(result.metrics, null);
      assert(result.errors[field as keyof BusinessInputs]);
    }
  }
  for (const value of [null, [], undefined, "bad"]) {
    const result = calculateBusiness(value);
    assert.equal(result.valid, false);
    assert.equal(Object.keys(result.errors).length, 9);
  }
});

test("inputs are not mutated, unknown fields do not enter the model, and unrepresentable thresholds report an error", () => {
  const input = Object.freeze({ ...assumptions(), independentClicks: 999_999 });
  assert.deepEqual(calculateBusiness(input), calculateBusiness(assumptions()));
  const overflow = calculateBusiness(
    assumptions({
      planAdoptionPct: 100,
      officialVisitPct: 100,
      orderConversionPct: 100,
      redemptionPct: 100,
      orderValue: Number.MIN_VALUE,
      commissionPct: 100,
      variableCostPerUser: 0,
    }),
  );
  assert.equal(overflow.valid, false);
  assert(overflow.errors.monthlyOpsCost);
});
