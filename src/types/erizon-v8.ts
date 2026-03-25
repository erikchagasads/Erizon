export type MetaCampaignInput = {
  id: string;
  name: string;
  objective?: string | null;
  configured_status?: string | null;
  effective_status?: string | null;
  delivery_state?: string | null;
  daily_budget?: number | null;
  lifetime_budget?: number | null;
  start_time?: string | null;
  stop_time?: string | null;
  account_id: string;
  insights?: {
    spend?: number;
    impressions?: number;
    reach?: number;
    clicks?: number;
    ctr?: number;
    cpc?: number;
    cpm?: number;
    leads?: number;
    purchases?: number;
    revenue?: number;
    frequency?: number;
  };
};

export type BenchmarkMap = {
  ctr: number;
  cpl: number;
};

export type RequestContext = {
  requestId: string;
  userId: string;
  workspaceId: string;
};
