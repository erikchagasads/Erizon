import webpush from "web-push";
import { createServerSupabase } from "@/lib/supabase/server";
import { CockpitService } from "@/services/cockpit-service";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

type StoredSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:suporte@erizon.ai";

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export class BrowserPushService {
  private db = createServerSupabase();

  async sendToUser(userId: string, payload: PushPayload) {
    if (!configureWebPush()) return { ok: false, sent: 0, reason: "missing_vapid" };

    const { data: subscriptions } = await this.db
      .from("browser_push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId)
      .eq("ativo", true);

    let sent = 0;

    for (const subscription of (subscriptions ?? []) as StoredSubscription[]) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload)
        );
        sent++;
      } catch (error: unknown) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await this.db
            .from("browser_push_subscriptions")
            .update({ ativo: false, updated_at: new Date().toISOString() })
            .eq("endpoint", subscription.endpoint);
        }
      }
    }

    return { ok: true, sent };
  }

  async sendMorningBriefing(userId: string) {
    const { data: wm } = await this.db
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    const workspaceId = wm?.workspace_id ?? userId;
    const cockpit = new CockpitService(this.db);
    const state = await cockpit.getState(workspaceId);

    const pending = state.pending ?? [];
    const body =
      pending.length === 0
        ? "Seu Daily Digest esta limpo hoje. Nenhuma decisao urgente no cockpit."
        : `${pending.length} decisao${pending.length > 1 ? "es" : ""} pedem sua aprovacao agora no Pulse.`;

    return this.sendToUser(userId, {
      title: "Erizon",
      body,
      url: "/pulse",
    });
  }

  async sendTest(userId: string) {
    return this.sendToUser(userId, {
      title: "Erizon",
      body: "Push browser ativo. Seu Daily Digest vai poder chegar fora do app.",
      url: "/pulse",
    });
  }
}
