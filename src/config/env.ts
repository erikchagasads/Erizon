
type RequiredKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY";

export type IntegrationEnvStatus = {
  supabase: boolean;
  metaAds: boolean;
  ga4: boolean;
  commerce: boolean;
  autopilotLiveMode: boolean;
};

function has(key: string) {
  const value = process.env[key];
  return Boolean(value && value.trim().length > 0);
}

export function getRequiredServerEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

export function missingRequiredEnv(keys: RequiredKey[]) {
  return keys.filter((key) => !has(key));
}

export function getIntegrationEnvStatus(): IntegrationEnvStatus {
  return {
    supabase: has("NEXT_PUBLIC_SUPABASE_URL") && has("NEXT_PUBLIC_SUPABASE_ANON_KEY") && has("SUPABASE_SERVICE_ROLE_KEY"),
    metaAds: has("META_APP_ID") && has("META_APP_SECRET") && has("META_SYSTEM_USER_TOKEN"),
    ga4: has("GA4_PROPERTY_ID") && has("GOOGLE_CLIENT_EMAIL") && has("GOOGLE_PRIVATE_KEY"),
    commerce: has("SHOPIFY_STORE_DOMAIN") || has("HOTMART_CLIENT_ID") || has("CRM_BASE_URL"),
    autopilotLiveMode: process.env.ERIZON_AUTOPILOT_MODE === "live",
  };
}
