import { createServerSupabase } from "@/lib/supabase/server";
import type { AuthContext, Result } from "@/types/erizon-v7";

/**
 * Validates the Authorization: Bearer <token> header against Supabase Auth
 * and confirms the authenticated user has access to the requested workspaceId.
 *
 * Returns an AuthContext on success, or an error Result on failure.
 */
export async function requireAuth(
  req: Request,
  workspaceId: string
): Promise<Result<AuthContext>> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { ok: false, error: "Missing Authorization header", status: 401 };
  }

  const db = createServerSupabase();

  // Validate token and retrieve user
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser(token);

  if (authError || !user) {
    return { ok: false, error: "Invalid or expired token", status: 401 };
  }

  // Confirm user is a member of the requested workspace
  const { data: membership, error: memberError } = await db
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError || !membership) {
    return {
      ok: false,
      error: "Access denied to workspace",
      status: 403,
    };
  }

  return {
    ok: true,
    data: {
      userId: user.id,
      workspaceId,
      role: membership.role as AuthContext["role"],
    },
  };
}
