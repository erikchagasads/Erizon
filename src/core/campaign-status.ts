export function isCampaignVisible(configuredStatus?: string | null, effectiveStatus?: string | null): boolean {
  const status = String(effectiveStatus || configuredStatus || "").toUpperCase();
  return ["ACTIVE", "PAUSED", "IN_PROCESS", "WITH_ISSUES", "CAMPAIGN_PAUSED"].includes(status);
}

export function isCampaignOperationallyActive(effectiveStatus?: string | null): boolean {
  const status = String(effectiveStatus || "").toUpperCase();
  return ["ACTIVE", "IN_PROCESS", "WITH_ISSUES"].includes(status);
}
