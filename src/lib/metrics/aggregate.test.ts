import { describe, expect, it } from "vitest";
import {
  buildChannelBreakdown,
  buildFunnelStages,
  buildLocationBreakdown,
  buildTargetVsActual,
  buildTrend,
  sumProductionCost,
  toChannelLeadsList,
  type CampaignMetricDbRow,
  type ChannelDbRow,
  type FunnelMetricDbRow,
  type LocationDbRow,
  type ProductionCostDbRow,
  type TargetDbRow,
} from "./aggregate";
import { monthRange } from "./dateRange";

const AD_CHANNEL: ChannelDbRow = { id: "ch-ad", name: "Meta広告", type: "ad", method: "manual", sort_order: 1 };
const ORGANIC_CHANNEL: ChannelDbRow = { id: "ch-organic", name: "Instagram運用", type: "organic", method: "manual", sort_order: 2 };

function campaignRow(overrides: Partial<CampaignMetricDbRow>): CampaignMetricDbRow {
  return {
    channel_id: AD_CHANNEL.id,
    location_id: null,
    period_type: "monthly",
    period_start: "2026-04-01",
    cost: null,
    impressions: null,
    clicks: null,
    followers: null,
    posts: null,
    views: null,
    inflow_rate: null,
    leads: 0,
    ...overrides,
  };
}

describe("buildChannelBreakdown", () => {
  it("月次行はweight=1でそのまま合算される", () => {
    const rows = [campaignRow({ cost: 100000, impressions: 10000, clicks: 200, leads: 10 })];
    const [row] = buildChannelBreakdown(rows, [AD_CHANNEL], monthRange("2026-04"));
    expect(row.cost).toBe(100000);
    expect(row.impressions).toBe(10000);
    expect(row.clicks).toBe(200);
    expect(row.leads).toBe(10);
    expect(row.ctr).toBeCloseTo(200 / 10000);
    expect(row.cpc).toBeCloseTo(100000 / 200);
    expect(row.cpl).toBeCloseTo(100000 / 10);
  });

  it("月をまたぐ週次行は日数按分されて月次集計に合算される（spec §6）", () => {
    // 4/28開始の週：4月に3日・5月に4日。費用70円なら4月へ30円・5月へ40円が按分される想定。
    const rows = [campaignRow({ period_type: "weekly", period_start: "2026-04-28", cost: 70, leads: 7 })];
    const april = buildChannelBreakdown(rows, [AD_CHANNEL], monthRange("2026-04"))[0];
    const may = buildChannelBreakdown(rows, [AD_CHANNEL], monthRange("2026-05"))[0];
    expect(april.cost).toBeCloseTo(70 * (3 / 7));
    expect(may.cost).toBeCloseTo(70 * (4 / 7));
    expect(april.leads).toBeCloseTo(7 * (3 / 7));
    expect(may.leads).toBeCloseTo(7 * (4 / 7));
  });

  it("範囲と重ならないチャネルは内訳に含まれない", () => {
    const rows = [campaignRow({ period_start: "2026-01-01" })];
    const result = buildChannelBreakdown(rows, [AD_CHANNEL], monthRange("2026-04"));
    expect(result).toEqual([]);
  });

  it("入力の無いフィールド（null）は合算せずnullのまま（未入力扱い）", () => {
    const rows = [campaignRow({ leads: 5 })]; // cost/impressions/clicks は null のまま
    const [row] = buildChannelBreakdown(rows, [AD_CHANNEL], monthRange("2026-04"));
    expect(row.cost).toBeNull();
    expect(row.ctr).toBeNull();
    expect(row.cpc).toBeNull();
    expect(row.cpl).toBeNull(); // costがnullなので算出不可
  });

  it("ストック指標（followers）は合算せず、範囲内で最新の入力値を採用する", () => {
    const rows = [
      campaignRow({ channel_id: ORGANIC_CHANNEL.id, period_type: "weekly", period_start: "2026-04-01", followers: 1000 }),
      campaignRow({ channel_id: ORGANIC_CHANNEL.id, period_type: "weekly", period_start: "2026-04-15", followers: 1200 }),
    ];
    const [row] = buildChannelBreakdown(rows, [ORGANIC_CHANNEL], monthRange("2026-04"));
    expect(row.followers).toBe(1200); // より新しい(4/15)入力値を採用、合算しない
  });

  it("比率指標（inflow_rate）は合算せず、範囲内の値をそのまま列挙する", () => {
    const rows = [
      campaignRow({ channel_id: ORGANIC_CHANNEL.id, period_type: "weekly", period_start: "2026-04-01", inflow_rate: 0.1 }),
      campaignRow({ channel_id: ORGANIC_CHANNEL.id, period_type: "weekly", period_start: "2026-04-15", inflow_rate: 0.2 }),
    ];
    const [row] = buildChannelBreakdown(rows, [ORGANIC_CHANNEL], monthRange("2026-04"));
    expect(row.inflowRates.sort()).toEqual([0.1, 0.2]);
  });
});

describe("toChannelLeadsList", () => {
  it("反響数が多い順に並び、0件のチャネルは除外される", () => {
    const rows = [campaignRow({ leads: 5 })];
    const breakdown = buildChannelBreakdown(rows, [AD_CHANNEL, ORGANIC_CHANNEL], monthRange("2026-04"));
    const list = toChannelLeadsList(breakdown);
    expect(list).toEqual([{ channelName: "Meta広告", leads: 5 }]);
  });
});

describe("buildFunnelStages", () => {
  it("campaign_metrics.leadsとfunnel_metricsの各段階を範囲内で合算する", () => {
    const campaignRows = [campaignRow({ leads: 20 })];
    const funnelRows: FunnelMetricDbRow[] = [
      {
        location_id: null,
        period_type: "monthly",
        period_start: "2026-04-01",
        visit_reservations: 8,
        visits: 6,
        estimates: 3,
        floor_plans: 2,
        contracts: 1,
      },
    ];
    const stages = buildFunnelStages(campaignRows, funnelRows, monthRange("2026-04"));
    expect(stages).toEqual({ leads: 20, visitReservations: 8, visits: 6, estimates: 3, floorPlans: 2, contracts: 1 });
  });

  it("データが無い場合は0（nullではない）", () => {
    const stages = buildFunnelStages([], [], monthRange("2026-04"));
    expect(stages).toEqual({ leads: 0, visitReservations: 0, visits: 0, estimates: 0, floorPlans: 0, contracts: 0 });
  });
});

describe("buildLocationBreakdown", () => {
  const locations: LocationDbRow[] = [
    { id: "loc-a", name: "A展示場" },
    { id: "loc-b", name: "B展示場" },
  ];

  it("拠点別内訳（全社共通含む）の合計は会社全体の合計と一致する（spec §3）", () => {
    const campaignRows: CampaignMetricDbRow[] = [
      campaignRow({ location_id: "loc-a", leads: 5 }),
      campaignRow({ location_id: "loc-b", leads: 7 }),
      campaignRow({ location_id: null, leads: 3 }), // 全社共通
    ];
    const range = monthRange("2026-04");
    const breakdown = buildLocationBreakdown(campaignRows, [], locations, range);
    const total = breakdown.reduce((a, r) => a + r.leads, 0);
    const companyWide = buildFunnelStages(campaignRows, [], range).leads;
    expect(total).toBe(companyWide);
    expect(total).toBe(15);
  });

  it("全社共通は locationId: null, locationName: '全社共通' として含まれる", () => {
    const breakdown = buildLocationBreakdown([], [], locations, monthRange("2026-04"));
    const shared = breakdown.find((r) => r.locationId === null);
    expect(shared?.locationName).toBe("全社共通");
    expect(breakdown).toHaveLength(3); // A・B・全社共通
  });
});

describe("sumProductionCost", () => {
  it("週次の制作費用も月次集計時は日数按分される", () => {
    const rows: ProductionCostDbRow[] = [{ location_id: null, period_type: "weekly", period_start: "2026-04-28", amount: 70 }];
    const april = sumProductionCost(rows, monthRange("2026-04"));
    const may = sumProductionCost(rows, monthRange("2026-05"));
    expect(april).toBeCloseTo(70 * (3 / 7));
    expect(may).toBeCloseTo(70 * (4 / 7));
  });
});

describe("buildTrend", () => {
  it("指定した月の並び順でTrendPointを返す", () => {
    const campaignRows = [campaignRow({ period_start: "2026-03-01", leads: 4 }), campaignRow({ period_start: "2026-04-01", leads: 6 })];
    const trend = buildTrend(campaignRows, [], ["2026-03", "2026-04"]);
    expect(trend.map((p) => p.periodStart)).toEqual(["2026-03-01", "2026-04-01"]);
    expect(trend.map((p) => p.leads)).toEqual([4, 6]);
  });
});

describe("buildTargetVsActual", () => {
  it("一致する月の目標値を引き当てる", () => {
    const targets: TargetDbRow[] = [{ kpi_key: "leads_total", period_start: "2026-04-01", target_value: 50 }];
    const stages = buildFunnelStages([campaignRow({ leads: 30 })], [], monthRange("2026-04"));
    const rows = buildTargetVsActual(stages, targets, monthRange("2026-04"));
    const leadsRow = rows.find((r) => r.kpiKey === "leads_total");
    expect(leadsRow?.actual).toBe(30);
    expect(leadsRow?.target).toBe(50);
  });

  it("目標が設定されていないKPIはtarget:nullになる", () => {
    const stages = buildFunnelStages([], [], monthRange("2026-04"));
    const rows = buildTargetVsActual(stages, [], monthRange("2026-04"));
    expect(rows.every((r) => r.target === null)).toBe(true);
  });
});
