// クライアントの集計対象データ（施策実績・来場〜契約実績・制作費用・目標・施策マスタ・拠点）を
// まとめて取得する。ダッシュボード（対象月1つ分の集計）・レポート生成（基準/比較の2期間分の
// 集計）の両方が同じ取得結果を使い回せるよう共通化している。RLSスコープのクライアント
// （@/lib/supabase/server の createClient()）で呼ぶ想定（他の実データ画面と同じ規約）。
import type { createClient } from "@/lib/supabase/server";
import type {
  CampaignMetricDbRow,
  CampaignTargetDbRow,
  ChannelDbRow,
  FunnelMetricDbRow,
  LocationDbRow,
  ProductionCostDbRow,
  TargetDbRow,
} from "./aggregate";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface ClientDataset {
  campaignRows: CampaignMetricDbRow[];
  funnelRows: FunnelMetricDbRow[];
  productionCosts: ProductionCostDbRow[];
  targets: TargetDbRow[];
  campaignTargets: CampaignTargetDbRow[];
  channels: ChannelDbRow[];
  locations: LocationDbRow[];
}

export async function loadClientDataset(supabase: SupabaseServerClient, clientId: string): Promise<ClientDataset> {
  const [campaignRes, funnelRes, costRes, targetRes, campaignTargetRes, channelRes, locationRes] = await Promise.all([
    supabase
      .from("campaign_metrics")
      .select(
        "channel_id, location_id, period_type, period_start, cost, impressions, clicks, followers, posts, views, inflow_rate, leads",
      )
      .eq("client_id", clientId),
    supabase
      .from("funnel_metrics")
      .select("location_id, period_type, period_start, visit_reservations, visits, estimates, floor_plans, contracts")
      .eq("client_id", clientId),
    supabase
      .from("production_costs")
      .select("location_id, period_type, period_start, amount")
      .eq("client_id", clientId),
    supabase.from("targets").select("kpi_key, period_start, target_value").eq("client_id", clientId),
    supabase
      .from("campaign_targets")
      .select("channel_id, location_id, period_start, target_leads, budget_amount")
      .eq("client_id", clientId),
    supabase
      .from("campaign_channels")
      .select("id, name, type, method, sort_order")
      .or(`client_id.is.null,client_id.eq.${clientId}`)
      .order("sort_order", { ascending: true }),
    supabase.from("locations").select("id, name").eq("client_id", clientId).order("created_at", { ascending: true }),
  ]);

  return {
    campaignRows: campaignRes.data ?? [],
    funnelRows: funnelRes.data ?? [],
    productionCosts: costRes.data ?? [],
    targets: targetRes.data ?? [],
    campaignTargets: campaignTargetRes.data ?? [],
    channels: channelRes.data ?? [],
    locations: locationRes.data ?? [],
  };
}
