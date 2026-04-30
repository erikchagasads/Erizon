import type { SupabaseClient } from "@supabase/supabase-js";
import { FROM_EMAIL, getResend } from "@/lib/email/resend";

type BlogPostForEmail = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  description?: string | null;
  category?: string | null;
  content_type?: string | null;
};

type Subscriber = {
  id: string;
  email: string;
  unsubscribe_token: string;
};

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://erizonai.com.br";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function blogPostEmailHtml(post: BlogPostForEmail, subscriber: Subscriber) {
  const postUrl = `${appUrl()}/blog/${post.slug}`;
  const unsubscribeUrl = `${appUrl()}/api/blog/newsletter/unsubscribe?token=${subscriber.unsubscribe_token}`;
  const excerpt = post.excerpt || post.description || "Novo conteúdo da Erizon AI sobre IA, tráfego pago, dados e performance.";

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(post.title)}</title>
  </head>
  <body style="margin:0;background:#03070a;color:#e8fbff;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:620px;margin:0 auto;padding:28px 18px;">
      <div style="border:1px solid rgba(150,245,255,.22);background:#071014;padding:28px;border-radius:8px;">
        <p style="margin:0 0 14px;color:#9eefff;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Blog Erizon AI</p>
        <h1 style="margin:0;color:#fff;font-size:28px;line-height:1.15;">${escapeHtml(post.title)}</h1>
        <p style="margin:16px 0 0;color:rgba(232,251,255,.72);font-size:15px;line-height:1.6;">${escapeHtml(excerpt)}</p>
        <p style="margin:18px 0 0;color:rgba(232,251,255,.48);font-size:13px;">Categoria: ${escapeHtml(post.category || "Blog Erizon")}</p>
        <a href="${postUrl}" style="display:inline-block;margin-top:24px;background:#9eefff;color:#041016;text-decoration:none;font-weight:800;font-size:14px;padding:13px 18px;border-radius:8px;">Ler artigo</a>
      </div>
      <p style="margin:18px 0 0;color:rgba(232,251,255,.42);font-size:12px;line-height:1.5;">
        Você recebeu este e-mail porque entrou na lista de análises da Erizon.
        <a href="${unsubscribeUrl}" style="color:#9eefff;">Cancelar inscrição</a>
      </p>
    </div>
  </body>
</html>`;
}

export async function notifyBlogSubscribers(supabase: SupabaseClient, post: BlogPostForEmail) {
  const { data: subscribers, error } = await supabase
    .from("blog_newsletter_subscribers")
    .select("id,email,unsubscribe_token")
    .eq("status", "active")
    .limit(500);

  if (error || !subscribers?.length) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const subscriber of subscribers as Subscriber[]) {
    const { data: existing } = await supabase
      .from("blog_newsletter_deliveries")
      .select("id")
      .eq("blog_post_id", post.id)
      .eq("subscriber_id", subscriber.id)
      .maybeSingle();

    if (existing) continue;

    const delivery = {
      blog_post_id: post.id,
      subscriber_id: subscriber.id,
      email: subscriber.email,
      status: "queued",
    };
    const { data: created } = await supabase
      .from("blog_newsletter_deliveries")
      .insert(delivery)
      .select("id")
      .single();

    try {
      const resend = getResend();
      await resend.emails.send({
        from: FROM_EMAIL,
        to: subscriber.email,
        subject: `Novo artigo da Erizon: ${post.title}`,
        html: blogPostEmailHtml(post, subscriber),
      });

      sent++;
      if (created?.id) {
        await supabase
          .from("blog_newsletter_deliveries")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", created.id);
      }
    } catch (err) {
      failed++;
      if (created?.id) {
        await supabase
          .from("blog_newsletter_deliveries")
          .update({ status: "failed", error: err instanceof Error ? err.message : "Erro desconhecido" })
          .eq("id", created.id);
      }
    }
  }

  return { sent, failed };
}
