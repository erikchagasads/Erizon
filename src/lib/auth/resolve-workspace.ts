import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve o workspaceId de um usuário.
 *
 * Estratégia:
 * 1. Busca em workspace_members (multitenancy futuro)
 * 2. Fallback para user.id (schema legado — usuário = workspace)
 *
 * NUNCA retorna 404 "Workspace não encontrado".
 */
export async function resolveWorkspaceId(
  db: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: wm } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return wm?.workspace_id ?? userId;
}
