import { createServerSupabase } from "@/lib/supabase/server";

export async function requireWorkspaceAccess(userId: string, workspaceId: string) {
  const db = createServerSupabase();
  const { data, error } = await db
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const err = new Error("Forbidden");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }

  return data;
}
